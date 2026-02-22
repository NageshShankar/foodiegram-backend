import Restaurant from '../models/restaurant.model.js';
import User from '../models/user.model.js';

/**
 * Step 1: Business Identity
 * Submits GST, Name, Address, Contact
 */
export const verifyIdentity = async (req, res) => {
    try {
        const { gstNumber, name, address, contactNumber } = req.body;

        if (!gstNumber || !name || !address || !contactNumber) {
            return res.status(400).json({ status: 'error', message: 'All fields are required' });
        }

        // Check for duplicate GST
        const existingGst = await Restaurant.findOne({ gstNumber });
        if (existingGst) {
            return res.status(400).json({ status: 'error', message: 'GST number already registered' });
        }

        // Find restaurant associated with creator or create new one
        let restaurant;
        const user = await User.findById(req.user.id);

        if (user.restaurant) {
            restaurant = await Restaurant.findById(user.restaurant);
        }

        if (restaurant) {
            restaurant.gstNumber = gstNumber;
            restaurant.name = name;
            restaurant.address = address;
            restaurant.contactNumber = contactNumber;
            restaurant.verificationStatus = 'PENDING';
            await restaurant.save();
        } else {
            restaurant = await Restaurant.create({
                name,
                gstNumber,
                address,
                contactNumber,
                verificationStatus: 'PENDING'
            });
            // Link to user
            user.restaurant = restaurant._id;
            await user.save();
        }

        res.status(200).json({
            status: 'success',
            message: 'Identity submitted. Status: PENDING',
            data: restaurant
        });
    } catch (error) {
        res.status(500).json({ status: 'error', message: error.message });
    }
};

/**
 * Step 2: Physical Proof
 * Uploads restaurant photo
 */
export const verifyPhoto = async (req, res) => {
    try {
        const { restaurantPhoto } = req.body;
        if (!restaurantPhoto) {
            return res.status(400).json({ status: 'error', message: 'Restaurant photo URL is required' });
        }

        const user = await User.findById(req.user.id);
        if (!user.restaurant) {
            return res.status(400).json({ status: 'error', message: 'Please complete Step 1 first' });
        }

        const restaurant = await Restaurant.findByIdAndUpdate(
            user.restaurant,
            {
                restaurantPhoto,
                verificationStatus: 'PARTIALLY_VERIFIED'
            },
            { new: true }
        );

        res.status(200).json({
            status: 'success',
            message: 'Photo uploaded. Status: PARTIALLY_VERIFIED',
            data: restaurant
        });
    } catch (error) {
        res.status(500).json({ status: 'error', message: error.message });
    }
};

/**
 * Step 3: Platform Linking
 * Submits Zomato & Swiggy links
 */
export const verifyLinks = async (req, res) => {
    try {
        const { zomatoLink, swiggyLink } = req.body;

        // Basic format check
        const urlRegex = /^(https?:\/\/)?([\da-z.-]+)\.([a-z.]{2,6})([/\w .-]*)*\/?$/;
        if (!urlRegex.test(zomatoLink) || !urlRegex.test(swiggyLink)) {
            return res.status(400).json({ status: 'error', message: 'Invalid URL format' });
        }

        const user = await User.findById(req.user.id);
        if (!user.restaurant) {
            return res.status(400).json({ status: 'error', message: 'Please complete previous steps first' });
        }

        const restaurant = await Restaurant.findByIdAndUpdate(
            user.restaurant,
            { zomatoLink, swiggyLink },
            { new: true }
        );

        res.status(200).json({
            status: 'success',
            message: 'Links submitted',
            data: restaurant
        });
    } catch (error) {
        res.status(500).json({ status: 'error', message: error.message });
    }
};

/**
 * Step 4: Price Mode Selection
 * Chooses POS or MANUAL
 */
export const selectPriceMode = async (req, res) => {
    try {
        const { priceMode } = req.body;

        if (!['POS', 'MANUAL'].includes(priceMode)) {
            return res.status(400).json({ status: 'error', message: 'Invalid price mode' });
        }

        const user = await User.findById(req.user.id);
        if (!user.restaurant) {
            return res.status(400).json({ status: 'error', message: 'Please complete previous steps first' });
        }

        const status = priceMode === 'POS' ? 'VERIFIED' : 'VERIFIED_LIMITED';

        const restaurant = await Restaurant.findByIdAndUpdate(
            user.restaurant,
            {
                priceMode,
                verificationStatus: status
            },
            { new: true }
        );

        res.status(200).json({
            status: 'success',
            message: `Verification complete. status: ${status}`,
            data: restaurant
        });
    } catch (error) {
        res.status(500).json({ status: 'error', message: error.message });
    }
};
