import Follow from '../models/follow.model.js';
import User from '../models/user.model.js';
import Restaurant from '../models/restaurant.model.js';
import { formatError } from '../utils/errorFormatter.js';

// @desc    Follow a restaurant
// @route   POST /api/restaurants/:id/follow
// @access  Private
export const followRestaurant = async (req, res) => {
    try {
        const restaurantId = req.params.id;
        const userId = req.user.id;

        const restaurant = await Restaurant.findById(restaurantId);
        if (!restaurant) {
            return res.status(404).json({ status: 'error', message: 'Restaurant not found' });
        }

        const existingFollow = await Follow.findOne({ userId, restaurantId });
        if (existingFollow) {
            return res.status(200).json({ status: 'success', message: 'Already following this restaurant' });
        }

        await Follow.create({ userId, restaurantId });

        res.status(200).json({ status: 'success', message: 'Followed successfully' });
    } catch (error) {
        res.status(500).json({ status: 'error', message: formatError(error) });
    }
};

// @desc    Unfollow a restaurant
// @route   DELETE /api/restaurants/:id/unfollow
// @access  Private
export const unfollowRestaurant = async (req, res) => {
    try {
        const restaurantId = req.params.id;
        const userId = req.user.id;

        const follow = await Follow.findOneAndDelete({ userId, restaurantId });

        if (!follow) {
            return res.status(400).json({ status: 'error', message: 'Not following this restaurant' });
        }

        res.status(200).json({ status: 'success', message: 'Unfollowed successfully' });
    } catch (error) {
        res.status(500).json({ status: 'error', message: formatError(error) });
    }
};

// @desc    Get followers list for a restaurant
// @route   GET /api/restaurants/:id/followers
export const getRestaurantFollowers = async (req, res) => {
    try {
        const follows = await Follow.find({ restaurantId: req.params.id }).populate('userId', 'name username profileImage');
        res.status(200).json({
            status: 'success',
            data: follows.map(f => f.userId)
        });
    } catch (error) {
        res.status(500).json({ status: 'error', message: formatError(error) });
    }
};

// @desc    Follow a creator
// @route   POST /api/follow/:creatorId
// @access  Private
export const followCreator = async (req, res) => {
    try {
        const creatorId = req.params.creatorId;
        const userId = req.user.id;

        if (userId === creatorId) {
            return res.status(400).json({ status: 'error', message: 'You cannot follow yourself' });
        }

        const creator = await User.findById(creatorId);
        if (!creator) {
            return res.status(404).json({ status: 'error', message: 'Creator not found' });
        }

        const existingFollow = await Follow.findOne({ userId, restaurantId: creator.restaurant });
        if (existingFollow) {
            return res.status(400).json({ status: 'error', message: 'Already following this creator\'s restaurant' });
        }

        await Follow.create({ userId, restaurantId: creator.restaurant });

        res.status(200).json({ status: 'success', message: 'Followed successfully' });
    } catch (error) {
        res.status(500).json({ status: 'error', message: formatError(error) });
    }
};

// @desc    Unfollow a creator
// @route   POST /api/unfollow/:creatorId
// @access  Private
export const unfollowCreator = async (req, res) => {
    try {
        const creatorId = req.params.creatorId;
        const userId = req.user.id;

        const creator = await User.findById(creatorId);
        if (!creator) return res.status(404).json({ status: 'error', message: 'Creator not found' });

        const follow = await Follow.findOneAndDelete({ userId, restaurantId: creator.restaurant });

        if (!follow) {
            return res.status(400).json({ status: 'error', message: 'Not following this creator' });
        }

        res.status(200).json({ status: 'success', message: 'Unfollowed successfully' });
    } catch (error) {
        res.status(500).json({ status: 'error', message: formatError(error) });
    }
};

// @desc    Get followers list for a creator
// @route   GET /api/creators/:id/followers
export const getFollowers = async (req, res) => {
    try {
        const creatorId = req.params.id;
        const creator = await User.findById(creatorId);
        if (!creator) return res.status(404).json({ status: 'error', message: 'Creator not found' });

        const follows = await Follow.find({ restaurantId: creator.restaurant }).populate('userId', 'name username profileImage');
        res.status(200).json({
            status: 'success',
            data: follows.map(f => f.userId)
        });
    } catch (error) {
        res.status(500).json({ status: 'error', message: formatError(error) });
    }
};

// @desc    Get following list for a user
// @route   GET /api/users/:id/following
export const getFollowing = async (req, res) => {
    try {
        const userId = req.params.id;
        const follows = await Follow.find({ userId }).populate('restaurantId', 'name restaurantName profileImage');
        res.status(200).json({
            status: 'success',
            data: follows.map(f => f.restaurantId)
        });
    } catch (error) {
        res.status(500).json({ status: 'error', message: formatError(error) });
    }
};
