import User from '../models/user.model.js';
import Restaurant from '../models/restaurant.model.js';
import VerificationToken from '../models/verificationToken.model.js';
import { sendCreatorStatusEmail } from '../services/email.service.js';
import { formatError } from '../utils/errorFormatter.js';

// @desc    Verify/Reject Creator
// @route   POST /api/admin/verify-creator
export const verifyCreator = async (req, res) => {
    try {
        const { creatorId, action } = req.body;

        if (!['APPROVE', 'REJECT'].includes(action)) {
            return res.status(400).json({ message: 'Invalid Action. Use APPROVE or REJECT.' });
        }

        let restaurant;
        let user = await User.findById(creatorId);

        if (user && user.restaurant) {
            restaurant = await Restaurant.findById(user.restaurant);
        } else {
            // Fallback: maybe creatorId is restaurantId?
            restaurant = await Restaurant.findById(creatorId);
            if (restaurant) {
                user = await User.findOne({ restaurant: restaurant._id });
            }
        }

        if (!restaurant) {
            return res.status(404).json({ message: 'Restaurant not found for given ID' });
        }

        if (action === 'APPROVE') {
            restaurant.verificationStatus = 'APPROVED';
            restaurant.verifiedAt = Date.now();
            restaurant.verifiedBy = 'nageshshankar183@gmail.com';

            // If MANUAL, setup is done. If POS, they still need to connect.
            if (restaurant.priceMode === 'MANUAL') {
                restaurant.setupCompleted = true;
            }

            await restaurant.save();

            if (user) {
                user.isAdminVerified = true;
                await user.save();
                sendCreatorStatusEmail(user.email, 'Congratulations! Your account is APPROVED. You can now set up POS/Manual pricing and upload reels.');
            }
        } else {
            restaurant.verificationStatus = 'REJECTED';
            await restaurant.save();
            if (user) {
                user.isAdminVerified = false;
                await user.save();
                sendCreatorStatusEmail(user.email, 'Your account verification was REJECTED.');
            }
        }

        res.status(200).json({ status: 'success', data: restaurant });
    } catch (error) {
        res.status(500).json({ status: 'error', message: formatError(error) });
    }
};

// @desc    Verify Restaurant via Email Button
// @route   GET /api/admin/verify
export const verifyRestaurant = async (req, res) => {
    try {
        const { restaurantId, token } = req.query;

        if (!restaurantId || !token) {
            return res.status(400).send('<h1>Missing restaurantId or token.</h1>');
        }

        const verificationToken = await VerificationToken.findOne({
            restaurantId,
            token,
            used: false,
            expiresAt: { $gt: Date.now() }
        });

        if (!verificationToken) {
            return res.status(400).send('<h1>Invalid or expired verification token.</h1>');
        }

        const restaurant = await Restaurant.findById(restaurantId);
        if (!restaurant) {
            return res.status(404).send('<h1>Restaurant not found.</h1>');
        }

        // Update restaurant status
        restaurant.verificationStatus = 'APPROVED';
        restaurant.isVerified = true;
        restaurant.verifiedAt = Date.now();
        restaurant.verifiedBy = 'nageshshankar183@gmail.com';

        // If MANUAL, setup is done.
        if (restaurant.priceMode === 'MANUAL') {
            restaurant.setupCompleted = true;
        }

        await restaurant.save();

        // Update creator status
        const user = await User.findOne({ restaurant: restaurantId });
        if (user) {
            user.verificationStatus = 'APPROVED';
            user.isVerified = true;
            user.isAdminVerified = true;
            await user.save();
            sendCreatorStatusEmail(user.email, 'Congratulations! Your restaurant account has been verified. You can now proceed normally.');
        }

        // Mark token as used
        verificationToken.used = true;
        await verificationToken.save();

        res.send(`
            <div style="font-family: Arial, sans-serif; text-align: center; padding: 50px; background-color: #f0fdf4; height: 100vh;">
                <h1 style="color: #16a34a; font-size: 48px;">Success!</h1>
                <p style="font-size: 20px;">The restaurant <strong>${restaurant.restaurantName}</strong> has been successfully verified.</p>
                <p>The creator has been notified and can now access all features.</p>
            </div>
        `);
    } catch (error) {
        res.status(500).send('<h1>Verification error:</h1><p>' + error.message + '</p>');
    }
};

// @desc    Reject Restaurant via Email Button
// @route   GET /api/admin/reject
export const rejectRestaurant = async (req, res) => {
    try {
        const { restaurantId, token } = req.query;

        if (!restaurantId || !token) {
            return res.status(400).send('<h1>Missing restaurantId or token.</h1>');
        }

        const verificationToken = await VerificationToken.findOne({
            restaurantId,
            token,
            used: false,
            expiresAt: { $gt: Date.now() }
        });

        if (!verificationToken) {
            return res.status(400).send('<h1>Invalid or expired verification token.</h1>');
        }

        const restaurant = await Restaurant.findById(restaurantId);
        if (!restaurant) {
            return res.status(404).send('<h1>Restaurant not found.</h1>');
        }

        // Update restaurant status
        restaurant.verificationStatus = 'REJECTED';
        restaurant.isVerified = false;
        await restaurant.save();

        // Update creator status
        const user = await User.findOne({ restaurant: restaurantId });
        if (user) {
            user.verificationStatus = 'REJECTED';
            user.isVerified = false;
            user.isAdminVerified = false;
            await user.save();
            sendCreatorStatusEmail(user.email, 'Your account does not seem genuine. Please try again creating the account.');
        }

        // Mark token as used
        verificationToken.used = true;
        await verificationToken.save();

        res.send(`
            <div style="font-family: Arial, sans-serif; text-align: center; padding: 50px; background-color: #fef2f2; height: 100vh;">
                <h1 style="color: #dc2626; font-size: 48px;">Rejected</h1>
                <p style="font-size: 20px;">The restaurant <strong>${restaurant.restaurantName}</strong> has been rejected.</p>
                <p>The creator has been notified.</p>
            </div>
        `);
    } catch (error) {
        res.status(500).send('<h1>Rejection error:</h1><p>' + error.message + '</p>');
    }
};
