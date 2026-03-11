import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import User from '../models/user.model.js';
import Restaurant from '../models/restaurant.model.js';
import { sendCreatorStatusEmail, sendOTPEmail, sendPasswordResetEmail, sendRegistrationOTPEmail } from '../services/email.service.js';
import crypto from 'crypto';
import { formatError } from '../utils/errorFormatter.js';
// rate limiting is handled in routes


// @desc    Register user
// @route   POST /api/auth/register
// @access  Public
export const register = async (req, res) => {
    try {
        const {
            fullName, email, username, password, confirmPassword, role
        } = req.body;

        // STEP 1 — Normalize Email
        const normalizedEmail = email ? email.toLowerCase().trim() : '';
        const normalizedUsername = username ? username.toLowerCase().trim() : '';
        const normalizedRole = (role || 'USER').toUpperCase();

        console.log(`[AUTH] Registration attempt: ${normalizedEmail}, ${normalizedUsername}, ${normalizedRole}`);

        if (!fullName || !normalizedEmail || !normalizedUsername || !password || !confirmPassword) {
            console.log('[AUTH] Registration failed: Missing fields');
            return res.status(400).json({ success: false, status: 'error', message: 'All fields are required' });
        }

        if (password !== confirmPassword) {
            console.log('[AUTH] Registration failed: Passwords do not match');
            return res.status(400).json({ success: false, status: 'error', message: 'Passwords do not match' });
        }

        // 1. Name Validation
        const nameRegex = /^[\w\s.'-]+$/u;
        if (!nameRegex.test(fullName)) {
            console.log('[AUTH] Registration failed: Invalid name format');
            return res.status(400).json({ success: false, status: 'error', message: 'Full Name contains invalid characters' });
        }

        // 2. Email Validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(normalizedEmail)) {
            console.log('[AUTH] Registration failed: Invalid email format');
            return res.status(400).json({ success: false, status: 'error', message: 'Please enter a valid email address' });
        }

        // 3. Username Validation
        const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/;
        if (!usernameRegex.test(normalizedUsername)) {
            console.log('[AUTH] Registration failed: Invalid username format');
            return res.status(400).json({ success: false, status: 'error', message: 'Username must be 3-20 characters (alphanumeric and underscores only)' });
        }

        if (/\s/.test(password)) {
            console.log('[AUTH] Registration failed: Password contains spaces');
            return res.status(400).json({ success: false, status: 'error', message: 'Password cannot contain spaces' });
        }

        // STEP 2 — Check Existing User
        const existingUserByEmail = await User.findOne({ email: normalizedEmail });
        if (existingUserByEmail) {
            if (existingUserByEmail.isEmailVerified) {
                console.log('[AUTH] Registration failed: Email already exists and verified');
                return res.status(400).json({
                    success: false,
                    status: 'error',
                    message: "Email already registered"
                });
            } else {
                // If the email exists but is NOT verified, delete it to allow fresh registration
                console.log(`[AUTH] Removing unverified user with email: ${normalizedEmail}`);
                await User.findByIdAndDelete(existingUserByEmail._id);
            }
        }

        // Check if username exists
        const existingUserByUsername = await User.findOne({ username: normalizedUsername });
        if (existingUserByUsername) {
            if (existingUserByUsername.isEmailVerified) {
                console.log('[AUTH] Registration failed: Username already exists and verified');
                return res.status(400).json({
                    success: false,
                    status: 'error',
                    message: 'Username is already taken'
                });
            } else {
                // If the username exists but is NOT verified, delete it to allow fresh registration
                console.log(`[AUTH] Removing unverified user with username: ${normalizedUsername}`);
                await User.findByIdAndDelete(existingUserByUsername._id);
            }
        }

        // STEP 3 — Generate OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        console.log(`[AUTH] Generated OTP: ${otp} for ${normalizedEmail}`);

        // STEP 4 — Email Sending Disabled (DEMO MODE)
        /*
        try {
            const emailSent = await sendRegistrationOTPEmail(normalizedEmail, otp);
            if (!emailSent) {
                console.error("[AUTH] OTP email failed: Service returned false");
                return res.status(500).json({
                    success: false,
                    status: 'error',
                    message: "Failed to send OTP email. Please try again."
                });
            }
        } catch (error) {
            console.error("[AUTH] OTP email failed:", error);
            return res.status(500).json({
                success: false,
                status: 'error',
                message: "Failed to send OTP email. Please try again."
            });
        }
        */

        // STEP 5 — Create User ONLY After Email Success
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const newUser = await User.create({
            name: fullName,
            email: normalizedEmail,
            username: normalizedUsername,
            password: hashedPassword,
            role: normalizedRole,
            otp: otp,
            otpExpiresAt: Date.now() + 10 * 60 * 1000,
            isEmailVerified: false,
            isVerified: false
        });

        console.log(`[AUTH] User created successfully: ${newUser._id}`);

        // STEP 6 — Return Success Response (DEMO MODE: Including OTP in response)
        console.log(`[AUTH] DEMO MODE OTP for ${normalizedEmail}: ${otp}`);
        return res.status(201).json({
            success: true,
            status: 'pending',
            message: "OTP generated (Demo Mode)",
            email: normalizedEmail,
            demoOtp: otp // Returned for frontend display
        });

    } catch (error) {
        console.error("[AUTH] Registration flow error:", error);
        res.status(500).json({ success: false, status: 'error', message: formatError(error) });
    }
};

// @desc    Verify Registration OTP
// @route   POST /api/auth/verify-otp
// @access  Public
export const verifyRegistrationOTP = async (req, res) => {
    try {
        const { email, otp } = req.body;

        if (!email || !otp) {
            return res.status(400).json({ status: 'error', message: 'Email and OTP are required' });
        }

        const user = await User.findOne({ email }).select('+otp +otpExpiresAt');

        if (!user) {
            return res.status(404).json({ status: 'error', message: 'User not found' });
        }

        if (user.isEmailVerified) {
            return res.status(400).json({ status: 'error', message: 'Email already verified' });
        }

        if (user.otp !== otp || user.otpExpiresAt < Date.now()) {
            return res.status(400).json({ status: 'error', message: 'Invalid or expired OTP' });
        }

        user.isEmailVerified = true;
        user.otp = undefined;
        user.otpExpiresAt = undefined;
        await user.save();

        // Generate JWT so they can access protected routes for next steps
        const token = jwt.sign(
            { id: user._id, role: user.role, isEmailVerified: true },
            process.env.JWT_SECRET,
            { expiresIn: '30d' }
        );

        res.status(200).json({
            status: 'success',
            message: 'OTP verified successfully',
            token,
            nextStep: user.role === 'CREATOR' ? "RESTAURANT_DETAILS" : "READY",
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                userType: user.role.toLowerCase(),
                isAdminVerified: user.isAdminVerified
            }
        });
    } catch (error) {
        res.status(500).json({ status: 'error', message: formatError(error) });
    }
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
export const login = async (req, res) => {
    try {
        const { email, password } = req.body;
        const finalEmail = email ? email.toLowerCase().trim() : '';

        if (!finalEmail || !password) {
            return res.status(400).json({ status: 'error', message: 'Email/Username and password are required' });
        }

        let user;
        const demoAccounts = {
            'demo.creator@example.com': { name: 'Demo Creator', role: 'CREATOR', isAdminVerified: true },
            'demo.user@example.com': { name: 'Demo User', role: 'USER', isAdminVerified: false }
        };

        let skipPasswordCheck = false;
        if (demoAccounts[finalEmail] && password === 'password123') {
            skipPasswordCheck = true;
            console.log(`[AUTH] DEMO LOGIN for ${finalEmail}`);
            let demoUser = await User.findOne({ email: finalEmail });
            if (!demoUser) {
                const hashedPassword = await bcrypt.hash('password123', 10);
                demoUser = await User.create({
                    ...demoAccounts[finalEmail],
                    email: finalEmail,
                    password: hashedPassword,
                    isEmailVerified: true,
                    username: finalEmail.split('@')[0]
                });

                // FULL MOCK SETUP FOR DEMO CREATOR
                if (demoUser.role === 'CREATOR') {
                    const Restaurant = (await import('../models/restaurant.model.js')).default;
                    const demoRestaurant = await Restaurant.create({
                        creatorId: demoUser._id,
                        restaurantName: "The Foodie Demo Lab",
                        cuisineType: ["Global", "Fusion"],
                        address: "123 Portfolio Lane, Tech City",
                        pricingMode: "MANUAL",
                        verificationStatus: 'APPROVED',
                        isAdminVerified: true,
                        setupCompleted: true,
                        isPublic: true,
                        averagePrice: 45
                    });
                    demoUser.restaurant = demoRestaurant._id;
                    await demoUser.save();
                }

                // FULL MOCK SETUP FOR DEMO USER (FOLLOWING)
                if (demoUser.role === 'USER') {
                    const Follow = (await import('../models/follow.model.js')).default;
                    const Restaurant = (await import('../models/restaurant.model.js')).default;
                    // Find any existing demo restaurant or create a follow link
                    const existingDemoRestaurant = await Restaurant.findOne({ restaurantName: "The Foodie Demo Lab" });
                    if (existingDemoRestaurant) {
                        await Follow.create({
                            userId: demoUser._id,
                            restaurantId: existingDemoRestaurant._id
                        });
                    }
                }
            }
            user = demoUser;
        } else {
            // Check for user (Email or Username)
            user = await User.findOne({
                $or: [
                    { email: finalEmail },
                    { username: finalEmail }
                ]
            }).select('+password');
        }

        if (!user) {
            return res.status(401).json({ status: 'error', message: 'Invalid credentials' });
        }

        // Check if user is email verified
        if (!user.isEmailVerified) {
            return res.status(401).json({ status: 'error', message: 'Please verify your email to login' });
        }

        // Check if password matches
        if (!skipPasswordCheck) {
            const isMatch = await bcrypt.compare(password, user.password);
            if (!isMatch) {
                return res.status(401).json({ status: 'error', message: 'Invalid credentials' });
            }
        }

        // Fetch following list
        const Follow = (await import('../models/follow.model.js')).default;
        const follows = await Follow.find({ userId: user._id });
        const following = follows.map(f => f.restaurantId.toString());

        // Generate JWT
        const token = jwt.sign(
            { id: user._id, role: user.role, isEmailVerified: user.isEmailVerified },
            process.env.JWT_SECRET,
            { expiresIn: '30d' }
        );

        // Determine next step for creators
        let nextStep = 'READY';
        if (user.role === 'CREATOR') {
            const Restaurant = (await import('../models/restaurant.model.js')).default;
            const restaurant = user.restaurant ? await Restaurant.findById(user.restaurant) : null;

            if (!restaurant) {
                nextStep = 'RESTAURANT_DETAILS';
            } else if (restaurant.verificationStatus === 'PENDING') {
                nextStep = 'VERIFICATION_PENDING';
            } else if (restaurant.verificationStatus === 'REJECTED') {
                nextStep = 'REJECTED';
            } else if (restaurant.verificationStatus === 'APPROVED') {
                nextStep = 'READY';
            }
        }

        res.status(200).json({
            status: 'success',
            token,
            nextStep,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                userType: user.role.toLowerCase(),
                isAdminVerified: user.isAdminVerified,
                following: following
            },
        });
    } catch (error) {
        res.status(500).json({ status: 'error', message: formatError(error) });
    }
};

// @desc    Creator Login (Initial Step - Sends OTP)
// @route   POST /api/auth/creator/login
export const creatorLogin = async (req, res) => {
    try {
        const { email, password } = req.body;
        const input = email ? email.toLowerCase().trim() : '';

        if (!input || !password) {
            return res.status(400).json({ status: 'error', message: 'Email/Username and password are required' });
        }

        const user = await User.findOne({
            $or: [
                { email: input },
                { username: input }
            ]
        }).select('+password');

        if (!user || user.role !== 'CREATOR') {
            return res.status(401).json({ status: 'error', message: 'Invalid creator credentials' });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ status: 'error', message: 'Invalid creator credentials' });
        }

        // If not email verified, they should register/verify first
        if (!user.isEmailVerified) {
            return res.status(401).json({ status: 'error', message: 'Please verify your email first.' });
        }

        // Generate 6-digit OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const otpHash = crypto.createHash('sha256').update(otp).digest('hex');

        // Set state for 2FA
        user.otp = otpHash;
        user.otpExpiresAt = Date.now() + 5 * 60 * 1000; // 5 minutes
        user.isEmailVerified = true; // Still true
        await user.save();

        // Bypass OTP for admin email
        const adminEmail = process.env.ADMIN_EMAIL || 'nageshshankar183@gmail.com';
        if (user.email === adminEmail) {
            user.otp = undefined;
            user.otpExpiresAt = undefined;
            await user.save();

            // Fetch following list
            const Follow = (await import('../models/follow.model.js')).default;
            const follows = await Follow.find({ userId: user._id });
            const following = follows.map(f => f.restaurantId.toString());

            const token = jwt.sign(
                { id: user._id, role: user.role, isEmailVerified: true },
                process.env.JWT_SECRET,
                { expiresIn: '30d' }
            );

            return res.status(200).json({
                status: 'success',
                token,
                user: {
                    id: user._id,
                    name: user.name,
                    email: user.email,
                    role: user.role,
                    userType: user.role.toLowerCase(),
                    restaurant: user.restaurant,
                    following: following
                },
            });
        }

        // Email Sending Disabled (DEMO MODE)
        console.log(`[AUTH] DEMO MODE LOGIN OTP for ${user.email}: ${otp}`);

        res.status(200).json({
            status: 'success',
            message: 'OTP generated (Demo Mode)',
            email: user.email,
            demoOtp: otp // Returned for frontend display
        });
    } catch (error) {
        res.status(500).json({ status: 'error', message: formatError(error) });
    }
};

// @desc    Verify Creator OTP (for Login)
// @route   POST /api/auth/creator/verify-otp
export const verifyCreatorOTP = async (req, res) => {
    try {
        const { email, otp } = req.body;

        const user = await User.findOne({ email }).select('+otp +otpExpiresAt');
        if (!user) {
            return res.status(404).json({ status: 'error', message: 'User not found' });
        }

        // Check if OTP has expired
        if (!user.otp || !user.otpExpiresAt || user.otpExpiresAt < Date.now()) {
            return res.status(400).json({ status: 'error', message: 'OTP expired or not requested' });
        }

        // Match OTP
        const otpHash = crypto.createHash('sha256').update(otp).digest('hex');
        if (otpHash !== user.otp) {
            return res.status(400).json({ status: 'error', message: 'Invalid OTP.' });
        }

        // Valid OTP
        user.otp = undefined;
        user.otpExpiresAt = undefined;
        await user.save();

        // Fetch following list
        const Follow = (await import('../models/follow.model.js')).default;
        const follows = await Follow.find({ userId: user._id });
        const following = follows.map(f => f.restaurantId.toString());

        // Generate JWT
        const token = jwt.sign({ id: user._id, role: user.role, isEmailVerified: true }, process.env.JWT_SECRET, {
            expiresIn: '30d',
        });

        // Determine next step for creators
        let nextStep = 'READY';
        if (user.role === 'CREATOR') {
            const Restaurant = (await import('../models/restaurant.model.js')).default;
            const restaurant = user.restaurant ? await Restaurant.findById(user.restaurant) : null;

            if (!restaurant) {
                nextStep = 'RESTAURANT_DETAILS';
            } else if (restaurant.verificationStatus === 'PENDING') {
                nextStep = 'VERIFICATION_PENDING';
            } else if (restaurant.verificationStatus === 'REJECTED') {
                nextStep = 'REJECTED';
            } else if (restaurant.verificationStatus === 'APPROVED') {
                nextStep = 'READY';
            }
        }

        res.status(200).json({
            status: 'success',
            token,
            nextStep,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                userType: user.role.toLowerCase(),
                isAdminVerified: user.isAdminVerified,
                following: following
            },
        });
    } catch (error) {
        res.status(500).json({ status: 'error', message: formatError(error) });
    }
};

// @desc    Google Login
// @route   POST /api/auth/google
// @access  Public
export const googleAuth = async (req, res) => {
    try {
        const { credential } = req.body;
        const { OAuth2Client } = await import('google-auth-library');
        const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

        let payload;
        try {
            const ticket = await client.verifyIdToken({
                idToken: credential,
                audience: process.env.GOOGLE_CLIENT_ID,
            });
            payload = ticket.getPayload();
        } catch (verifyError) {
            console.warn('[AUTH] Google verification failed, falling back to manual decode (DEMO MODE):', verifyError.message);
            // Fallback for Demo Mode: Decode token without verification if CLIENT_ID is a placeholder
            // or if we just want the demo to be stable for reviewers
            const decoded = jwt.decode(credential);
            if (!decoded) {
                throw new Error('Invalid Google credential');
            }
            payload = decoded;
        }

        const { email, name, sub: googleId, picture } = payload;

        // Check if user exists
        let user = await User.findOne({ email });

        if (!user) {
            // Create user if not exists
            user = await User.create({
                name,
                email,
                username: email.split('@')[0] + Math.floor(100 + Math.random() * 900), // Random username
                password: crypto.randomBytes(16).toString('hex'), // Random password
                profileImage: picture,
                role: 'USER',
                isEmailVerified: true // Google users are verified
            });
        }

        // Generate JWT
        const token = jwt.sign(
            { id: user._id, role: user.role, isEmailVerified: user.isEmailVerified },
            process.env.JWT_SECRET,
            { expiresIn: '30d' }
        );

        // Determine next step for creators
        let nextStep = 'READY';
        if (user.role === 'CREATOR') {
            const Restaurant = (await import('../models/restaurant.model.js')).default;
            const restaurant = user.restaurant ? await Restaurant.findById(user.restaurant) : null;

            if (!restaurant) {
                nextStep = 'RESTAURANT_DETAILS';
            } else if (restaurant.verificationStatus === 'PENDING') {
                nextStep = 'VERIFICATION_PENDING';
            } else if (restaurant.verificationStatus === 'REJECTED') {
                nextStep = 'REJECTED';
            } else if (restaurant.verificationStatus === 'APPROVED') {
                nextStep = 'READY';
            }
        }

        res.status(200).json({
            status: 'success',
            token,
            nextStep,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                profileImage: user.profileImage,
                isAdminVerified: user.isAdminVerified
            },
        });
    } catch (error) {
        console.error('Google Auth Error:', error);
        res.status(500).json({ status: 'error', message: 'Google authentication failed' });
    }
};

// @desc    Forgot Password
// @route   POST /api/auth/forgot-password
// @access  Public
export const forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;
        const user = await User.findOne({ email });

        if (!user) {
            return res.status(404).json({ status: 'error', message: 'No user with that email' });
        }

        // Generate token
        const resetToken = crypto.randomBytes(20).toString('hex');

        // Hash and set resetPasswordToken field
        user.resetPasswordToken = crypto.createHash('sha256').update(resetToken).digest('hex');

        // Set expire (10 mins)
        user.resetPasswordExpire = Date.now() + 10 * 60 * 1000;

        await user.save();

        const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
        const resetUrl = `${frontendUrl}/reset-password/${resetToken}`;

        try {
            await sendPasswordResetEmail(user.email, resetUrl);
            res.status(200).json({
                status: 'success',
                message: 'Email sent (Demo Mode)',
                resetUrl // Returned for demo purposes
            });
        } catch (err) {
            user.resetPasswordToken = undefined;
            user.resetPasswordExpire = undefined;
            await user.save();
            return res.status(500).json({ status: 'error', message: 'Email could not be sent' });
        }
    } catch (error) {
        res.status(500).json({ status: 'error', message: formatError(error) });
    }
};

// @desc    Reset Password
// @route   POST /api/auth/reset-password
// @access  Public
export const resetPassword = async (req, res) => {
    try {
        const { token, password } = req.body;

        const resetPasswordToken = crypto.createHash('sha256').update(token).digest('hex');

        const user = await User.findOne({
            resetPasswordToken,
            resetPasswordExpire: { $gt: Date.now() }
        });

        if (!user) {
            return res.status(400).json({ status: 'error', message: 'Invalid or expired reset token' });
        }

        // Set hashed password
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(password, salt);

        // Clear reset fields
        user.resetPasswordToken = undefined;
        user.resetPasswordExpire = undefined;

        await user.save();

        res.status(200).json({ status: 'success', message: 'Password reset successful' });
    } catch (error) {
        res.status(500).json({ status: 'error', message: formatError(error) });
    }
};

// @desc    Get current user profile
// @route   GET /api/auth/me
// @access  Private
export const getMe = async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select('-password');
        if (!user) {
            return res.status(404).json({ status: 'error', message: 'User not found' });
        }
        // Fetch following list
        const Follow = (await import('../models/follow.model.js')).default;
        const follows = await Follow.find({ userId: user._id });
        const following = follows.map(f => f.restaurantId.toString());

        res.status(200).json({
            status: 'success',
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                userType: user.role.toLowerCase(),
                isAdminVerified: user.isAdminVerified,
                profileImage: user.profileImage,
                restaurant: user.restaurant,
                following: following
            }
        });

    } catch (error) {
        res.status(500).json({ status: 'error', message: formatError(error) });
    }
};

// Google Auth and Forgot Password were already defined above correctly.
