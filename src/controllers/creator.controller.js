import User from '../models/user.model.js';
import Reel from '../models/reel.model.js';
import Restaurant from '../models/restaurant.model.js';
import VerificationToken from '../models/verificationToken.model.js';
import { sendRestaurantVerificationEmail } from '../services/email.service.js';
import mongoose from 'mongoose';
import { formatError } from '../utils/errorFormatter.js';

// @desc    Step 4: Submit restaurant details
// @route   POST /api/creators/restaurant-details
// @access  Private/Creator
export const setupRestaurantDetails = async (req, res) => {
    try {
        if (req.user.role !== 'CREATOR') {
            return res.status(403).json({ status: 'error', message: 'Forbidden. Only Creators can setup restaurant details.' });
        }

        const {
            restaurantName,
            address,
            gstNumber,
            priceMode,
            zomatoLink,
            swiggyLink
        } = req.body;

        if (!restaurantName || !address || !gstNumber || !priceMode) {
            return res.status(400).json({ status: 'error', message: 'Required fields are missing.' });
        }

        let restaurantPhoto = '';
        if (req.file) {
            restaurantPhoto = `/uploads/restaurants/${req.file.filename}`;
        }

        // 1. Create or Update Restaurant
        const restaurantData = {
            restaurantName,
            name: restaurantName,
            address,
            gstNumber,
            priceMode,
            zomatoLink,
            swiggyLink,
            restaurantPhoto,
            verificationStatus: 'PENDING',
            verificationSubmittedAt: Date.now()
        };

        // Check if GST is already taken by ANOTHER restaurant
        const existingGst = await Restaurant.findOne({ gstNumber });

        let restaurant;
        const user = await User.findById(req.user.id);

        if (user.restaurant) {
            if (existingGst && existingGst._id.toString() !== user.restaurant.toString()) {
                return res.status(400).json({ status: 'error', message: 'This GST number is already registered with another restaurant.' });
            }
            restaurant = await Restaurant.findByIdAndUpdate(user.restaurant, restaurantData, { new: true, runValidators: true });
        } else {
            if (existingGst) {
                return res.status(400).json({ status: 'error', message: 'This GST number is already registered.' });
            }
            restaurant = await Restaurant.create(restaurantData);
            user.restaurant = restaurant._id;
            await user.save();
        }

        // 2. Set user verification status to PENDING
        user.verificationStatus = 'PENDING';
        user.isVerified = false;
        await user.save();

        // 3. Generate verification token & Send Admin Email
        try {
            const token = VerificationToken.generateToken();
            await VerificationToken.create({
                restaurantId: restaurant._id,
                token
            });
            await sendRestaurantVerificationEmail(user, restaurant, token);
            console.log(`[CREATOR] Admin verification email sent for ${restaurant.restaurantName}`);
        } catch (emailErr) {
            console.error('[CREATOR] Admin email trigger failed:', emailErr);
        }

        res.status(200).json({
            status: 'success',
            nextStep: "VERIFICATION_PENDING",
            message: "Restaurant details submitted. Admin will verify shortly."
        });
    } catch (error) {
        res.status(500).json({ status: 'error', message: formatError(error) });
    }
};

// @desc    Step 3: Select price mode (POS or MANUAL)
// @desc    Step 3: Select price mode (POS or MANUAL)
// @route   PUT /api/creators/select-price-mode
// @access  Private/Creator
export const selectPriceMode = async (req, res) => {
    try {
        const { priceMode } = req.body;

        if (!['POS', 'MANUAL'].includes(priceMode)) {
            return res.status(400).json({ status: 'error', message: 'Invalid price mode. Use POS or MANUAL.' });
        }

        const user = await User.findById(req.user.id);
        if (!user || !user.restaurant) {
            return res.status(404).json({ status: 'error', message: 'Restaurant record not found.' });
        }

        const restaurant = await Restaurant.findById(user.restaurant);

        // Rule: Only once / immutable
        if (restaurant.priceMode) {
            return res.status(400).json({ status: 'error', message: 'Price mode already selected and cannot be modified.' });
        }

        console.log(`[CREATOR] User ${user.email} selected price mode: ${priceMode}`);

        // Save priceMode
        restaurant.priceMode = priceMode;
        restaurant.setupCompleted = (priceMode === 'MANUAL');
        await restaurant.save();

        res.status(200).json({
            status: 'success',
            nextStep: "SUBMIT_DETAILS"
        });
    } catch (error) {
        res.status(500).json({ status: 'error', message: formatError(error) });
    }
};

// @desc    Get creator profile status and next steps
// @route   GET /api/creators/profile-status
// @access  Private/Creator
export const getProfileStatus = async (req, res) => {
    try {
        const user = await User.findById(req.user.id).populate('restaurant');
        if (!user) {
            return res.status(404).json({ status: 'error', message: 'User not found' });
        }

        // 1. Check Email Verification
        if (!user.isEmailVerified) {
            return res.status(200).json({
                status: 'success',
                data: {
                    verificationStatus: 'EMAIL_UNVERIFIED',
                    nextStep: 'VERIFY_OTP'
                }
            });
        }

        // 2. Check Restaurant Submission
        if (!user.restaurant) {
            return res.status(200).json({
                status: 'success',
                data: {
                    verificationStatus: 'NOT_STARTED',
                    nextStep: 'RESTAURANT_DETAILS'
                }
            });
        }

        const restaurant = user.restaurant;
        let nextStep = 'READY';

        // 3. Logic based on Verification Status (PART H)
        if (user.verificationStatus === 'REJECTED') {
            nextStep = 'BLOCKED_REJECTED';
        } else if (user.verificationStatus === 'PENDING') {
            nextStep = 'VERIFICATION_PENDING';
        } else if (user.verificationStatus === 'APPROVED') {
            if (!restaurant.setupCompleted) {
                if (restaurant.priceMode === 'POS' && !restaurant.posConnected) {
                    nextStep = 'COMPLETE_POS_SETUP';
                } else if (restaurant.priceMode === 'MANUAL') {
                    // Manual might need some setup, but for now we say READY or specific manual steps
                    nextStep = 'READY';
                }
            }
        }

        res.status(200).json({
            status: 'success',
            data: {
                verificationStatus: user.verificationStatus,
                isVerified: user.isVerified,
                priceMode: restaurant.priceMode,
                setupCompleted: restaurant.setupCompleted || (user.verificationStatus === 'APPROVED' && restaurant.priceMode === 'MANUAL'),
                restaurantName: restaurant.restaurantName,
                nextStep
            }
        });
    } catch (error) {
        res.status(500).json({ status: 'error', message: formatError(error) });
    }
};

// @desc    Step 1: Add menu item (Manual)
// @route   POST /api/creators/manual/add-menu
// @access  Private/Creator
export const addManualMenu = async (req, res) => {
    try {
        const { name, category } = req.body;
        const user = await User.findById(req.user.id);
        const Food = mongoose.model('Food');

        const food = await Food.create({
            name,
            category,
            restaurant: user.restaurant
        });

        res.status(201).json({ status: 'success', data: food });
    } catch (error) {
        res.status(500).json({ status: 'error', message: formatError(error) });
    }
};

// @desc    Step 2: Add prices (Manual)
// @route   POST /api/creators/manual/add-prices
// @access  Private/Creator
export const addManualPrices = async (req, res) => {
    try {
        const { foodId, zomatoPrice, swiggyPrice } = req.body;
        const user = await User.findById(req.user.id).populate('restaurant');
        const PlatformPrice = mongoose.model('PlatformPrice');

        const platforms = [
            { name: 'ZOMATO', price: zomatoPrice, link: user.restaurant.zomatoLink },
            { name: 'SWIGGY', price: swiggyPrice, link: user.restaurant.swiggyLink }
        ];

        for (const platform of platforms) {
            if (platform.price) {
                await PlatformPrice.findOneAndUpdate(
                    { food: foodId, platform: platform.name },
                    {
                        price: parseFloat(platform.price),
                        redirectUrl: platform.link || `https://${platform.name.toLowerCase()}.com`,
                        source: 'MANUAL'
                    },
                    { upsert: true, new: true }
                );
            }
        }

        // Check if at least one valid price exists to mark as AVAILABLE
        const hasZomato = zomatoPrice && parseFloat(zomatoPrice) > 0;
        const hasSwiggy = swiggyPrice && parseFloat(swiggyPrice) > 0;
        const newStatus = (hasZomato || hasSwiggy) ? 'AVAILABLE' : 'PENDING';

        // AUTO-UPDATE REELS: Set priceStatus and sync prices
        await Reel.updateMany(
            { food: foodId },
            {
                priceStatus: newStatus,
                prices: {
                    zomatoPrice: hasZomato ? parseFloat(zomatoPrice) : undefined,
                    swiggyPrice: hasSwiggy ? parseFloat(swiggyPrice) : undefined
                },
                priceSource: 'MANUAL'
            }
        );

        res.status(200).json({ status: 'success', message: 'Prices added successfully and reels updated' });
    } catch (error) {
        res.status(500).json({ status: 'error', message: formatError(error) });
    }
};

// @desc    Final Step: Complete manual setup
// @route   POST /api/creators/manual/complete
// @access  Private/Creator
export const completeManualSetup = async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        if (!user || !user.restaurant) {
            return res.status(404).json({ status: 'error', message: 'Restaurant record not found.' });
        }

        const restaurant = await Restaurant.findByIdAndUpdate(
            user.restaurant,
            { setupCompleted: true },
            { new: true }
        );

        res.status(200).json({
            status: 'success',
            message: 'Manual setup completed. You can now upload reels!',
            data: restaurant
        });
    } catch (error) {
        res.status(500).json({ status: 'error', message: formatError(error) });
    }
};

// @desc    Final Step: Complete POS setup
// @route   POST /api/creators/pos/complete
// @access  Private/Creator
export const completePosSetup = async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        if (!user || !user.restaurant) {
            return res.status(404).json({ status: 'error', message: 'Restaurant record not found.' });
        }

        const restaurant = await Restaurant.findByIdAndUpdate(
            user.restaurant,
            { setupCompleted: true },
            { new: true }
        );

        res.status(200).json({
            status: 'success',
            message: 'POS setup completed. You can now upload reels!',
            data: restaurant
        });
    } catch (error) {
        res.status(500).json({ status: 'error', message: formatError(error) });
    }
};

// @desc    Get creator profile
// ...
// @route   GET /api/creators/:id
// @access  Public
export const getCreatorProfile = async (req, res) => {
    try {
        const creator = await User.findById(req.params.id)
            .select('-password')
            .populate('restaurant');

        if (!creator) {
            return res.status(404).json({ status: 'error', message: 'Creator not found' });
        }

        const reelsCount = await Reel.countDocuments({ creator: creator._id });

        res.status(200).json({
            status: 'success',
            data: {
                ...creator._doc,
                reelsCount
            }
        });
    } catch (error) {
        res.status(500).json({ status: 'error', message: formatError(error) });
    }
};

// @desc    Update creator profile
// @route   PUT /api/creators/profile
// @access  Private/Creator
export const updateCreatorProfile = async (req, res) => {
    try {
        if (req.user.role !== 'CREATOR') {
            return res.status(403).json({ status: 'error', message: 'Forbidden. Only Creators can update profile details.' });
        }

        const { bio, name } = req.body;
        let profileImage = req.body.profileImage;

        if (req.file) {
            profileImage = `/uploads/restaurants/${req.file.filename}`;
        }

        const creator = await User.findByIdAndUpdate(
            req.user.id,
            { bio, profileImage, name },
            { new: true, runValidators: true }
        ).select('-password');

        res.status(200).json({
            status: 'success',
            data: creator
        });
    } catch (error) {
        res.status(500).json({ status: 'error', message: formatError(error) });
    }
};
// @desc    Update restaurant details by creator
// @route   PUT /api/creators/restaurant/profile
// @access  Private/Creator
export const updateRestaurantProfile = async (req, res) => {
    try {
        if (req.user.role !== 'CREATOR') {
            return res.status(403).json({ status: 'error', message: 'Forbidden.' });
        }

        const { description, zomatoLink, swiggyLink } = req.body;

        const user = await User.findById(req.user.id);
        if (!user || !user.restaurant) {
            return res.status(404).json({ status: 'error', message: 'Restaurant not found.' });
        }

        const updateData = {
            description,
            zomatoLink,
            swiggyLink
        };

        // Handle existing images to keep
        let finalAmbienceImages = [];
        if (req.body.existingAmbienceImages) {
            finalAmbienceImages = Array.isArray(req.body.existingAmbienceImages)
                ? req.body.existingAmbienceImages
                : [req.body.existingAmbienceImages];
        }

        let finalMenuImages = [];
        if (req.body.existingMenuImages) {
            finalMenuImages = Array.isArray(req.body.existingMenuImages)
                ? req.body.existingMenuImages
                : [req.body.existingMenuImages];
        }

        // Handle uploaded files
        if (req.files) {
            if (req.files.ambienceImages) {
                const newAmbience = req.files.ambienceImages.map(file => `/uploads/restaurants/${file.filename}`);
                finalAmbienceImages = [...finalAmbienceImages, ...newAmbience];
            }
            if (req.files.menuImages) {
                const newMenu = req.files.menuImages.map(file => `/uploads/restaurants/${file.filename}`);
                finalMenuImages = [...finalMenuImages, ...newMenu];
            }
        }

        if (finalAmbienceImages.length > 0 || req.files?.ambienceImages) {
            updateData.ambienceImages = finalAmbienceImages;
        }
        if (finalMenuImages.length > 0 || req.files?.menuImages) {
            updateData.menuImages = finalMenuImages;
        }

        const restaurant = await Restaurant.findByIdAndUpdate(
            user.restaurant,
            updateData,
            { new: true, runValidators: true }
        );

        res.status(200).json({
            status: 'success',
            data: restaurant
        });
    } catch (error) {
        res.status(500).json({ status: 'error', message: formatError(error) });
    }
};
