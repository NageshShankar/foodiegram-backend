import User from '../models/user.model.js';
import Restaurant from '../models/restaurant.model.js';

export const isVerified = async (req, res, next) => {
    try {
        const user = await User.findById(req.user.id);
        if (!user || !user.restaurant) {
            return res.status(403).json({ message: 'Restaurant profile not found' });
        }

        const restaurant = await Restaurant.findById(user.restaurant);
        if (!restaurant) {
            return res.status(404).json({ message: 'Restaurant not found' });
        }

        if (restaurant.verificationStatus === 'REJECTED') {
            return res.status(403).json({ message: 'Your verification request was rejected. Please contact support.' });
        }

        if (restaurant.verificationStatus !== 'APPROVED' && restaurant.verificationStatus !== 'VERIFIED') {
            return res.status(403).json({ message: 'Your account is under verification. This may take 2–3 hours.' });
        }

        // Check if setup is completed (POS/Manual configuration)
        if (!restaurant.setupCompleted) {
            return res.status(403).json({
                status: 'setup_required',
                message: 'Please complete your profile setup (POS/Manual pricing) to continue.'
            });
        }

        next();
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
