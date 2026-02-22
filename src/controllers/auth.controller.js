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

        const finalRole = (role || 'USER').toUpperCase();
        const finalEmail = email ? email.toLowerCase().trim() : '';
        const finalUsername = username ? username.toLowerCase().trim() : '';

        if (!fullName || !finalEmail || !finalUsername || !password || !confirmPassword) {
            return res.status(400).json({ status: 'error', message: 'All fields are required' });
        }

        if (password !== confirmPassword) {
            return res.status(400).json({ status: 'error', message: 'Passwords do not match' });
        }

        // 1. Name Validation: Alphanumeric, spaces, dots, hyphens, single quotes
        const nameRegex = /^[\w\s.'-]+$/u;
        if (!nameRegex.test(fullName)) {
            return res.status(400).json({ status: 'error', message: 'Full Name contains invalid characters' });
        }

        // 2. Email Validation: Legit format, NO WHITESPACE
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(finalEmail)) {
            return res.status(400).json({ status: 'error', message: 'Please enter a valid email address' });
        }

        // 3. Username Validation: Alphanumeric and underscores, 3-20 chars
        const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/;
        if (!usernameRegex.test(finalUsername)) {
            return res.status(400).json({ status: 'error', message: 'Username must be 3-20 characters (alphanumeric and underscores only)' });
        }

        if (/\s/.test(password)) {
            return res.status(400).json({ status: 'error', message: 'Password cannot contain spaces' });
        }

        // Check if email exists for this role
        const emailExists = await User.findOne({ email: finalEmail, role: finalRole });
        if (emailExists) {
            return res.status(400).json({ status: 'error', message: `Email is already registered as ${finalRole.toLowerCase()}` });
        }

        // Check if username exists
        const usernameExists = await User.findOne({ username: finalUsername });
        if (usernameExists) {
            return res.status(400).json({ status: 'error', message: 'Username is already taken' });
        }

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Generate OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();

        // Create user
        const user = new User({
            name: fullName,
            email: finalEmail,
            username: finalUsername,
            password: hashedPassword,
            role: finalRole,
            otp: otp,
            otpExpiresAt: Date.now() + 10 * 60 * 1000, // 10 minutes
            isEmailVerified: false
        });

        await user.save();

        // Send OTP Email
        const emailSuccess = await sendRegistrationOTPEmail(user.email, otp);

        if (!emailSuccess) {
            await User.findByIdAndDelete(user._id);
            return res.status(500).json({ status: 'error', message: 'Failed to send OTP email. Please check your email address and try again.' });
        }

        return res.status(201).json({
            status: 'pending',
            message: 'OTP sent to email. Please verify to continue.',
            email: user.email
        });

    } catch (error) {
        res.status(500).json({ status: 'error', message: formatError(error) });
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
                userType: user.role.toLowerCase()
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

        // Check for user (Email or Username)
        const user = await User.findOne({
            $or: [
                { email: finalEmail },
                { username: finalEmail }
            ]
        }).select('+password');

        if (!user) {
            return res.status(401).json({ status: 'error', message: 'Invalid credentials' });
        }

        // Check if user is email verified
        if (!user.isEmailVerified) {
            return res.status(401).json({ status: 'error', message: 'Please verify your email to login' });
        }

        // Check if password matches
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ status: 'error', message: 'Invalid credentials' });
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
            const restaurant = await Restaurant.findOne({ creator: user._id });

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

        // Send OTP
        const emailSent = await sendOTPEmail(user.email, otp);
        if (!emailSent) {
            return res.status(500).json({ status: 'error', message: 'Failed to send OTP email' });
        }

        res.status(200).json({
            status: 'success',
            message: 'OTP sent to registered email',
            email: user.email
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
            const restaurant = await Restaurant.findOne({ creator: user._id });

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

        const ticket = await client.verifyIdToken({
            idToken: credential,
            audience: process.env.GOOGLE_CLIENT_ID,
        });

        const payload = ticket.getPayload();
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
            const restaurant = await Restaurant.findOne({ creator: user._id });

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
                profileImage: user.profileImage
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
            res.status(200).json({ status: 'success', message: 'Email sent' });
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
// Google Auth and Forgot Password were already defined above correctly.
