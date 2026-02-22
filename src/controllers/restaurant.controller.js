import User from '../models/user.model.js';
import Restaurant from '../models/restaurant.model.js';
import { formatError } from '../utils/errorFormatter.js';

// Helper to find restaurant for logged-in creator
const getCreatorRestaurant = async (userId) => {
    const user = await User.findById(userId);
    if (!user || user.role !== 'CREATOR' || !user.restaurant) return null;
    return Restaurant.findById(user.restaurant);
};

// @desc    Get all restaurants
// @route   GET /api/restaurants
// @access  Public
export const getRestaurants = async (req, res) => {
    try {
        const restaurants = await Restaurant.find({
            verificationStatus: { $in: ['APPROVED', 'VERIFIED'] },
            setupCompleted: true
        });
        res.status(200).json({
            status: 'success',
            count: restaurants.length,
            data: restaurants,
        });
    } catch (error) {
        res.status(500).json({ status: 'error', message: formatError(error) });
    }
};

// @desc    Get single restaurant
// @route   GET /api/restaurants/:id
// @access  Public
export const getRestaurant = async (req, res) => {
    try {
        const restaurant = await Restaurant.findById(req.params.id);
        if (!restaurant) {
            return res.status(404).json({ status: 'error', message: 'Restaurant not found' });
        }
        res.status(200).json({
            status: 'success',
            data: restaurant,
        });
    } catch (error) {
        res.status(500).json({ status: 'error', message: formatError(error) });
    }
};

// --- ONBOARDING ENDPOINTS ---

// @desc    Step A: Basic Info
// @route   PUT /api/restaurants/setup/basic
export const updateBasicInfo = async (req, res) => {
    try {
        const { name, address, contactNumber } = req.body;
        const restaurant = await getCreatorRestaurant(req.user.id);
        if (!restaurant) return res.status(404).json({ message: 'Restaurant not found' });

        restaurant.name = name || restaurant.name;
        restaurant.address = address || restaurant.address;
        restaurant.contactNumber = contactNumber || restaurant.contactNumber;

        await restaurant.save();
        res.status(200).json({ status: 'success', data: restaurant });
    } catch (error) {
        res.status(500).json({ message: formatError(error) });
    }
};



// @desc    Step C (POS): POS Details
// @route   PUT /api/restaurants/setup/pos-info
export const updatePosInfo = async (req, res) => {
    try {
        const { posProvider, zomatoLink, swiggyLink } = req.body;
        const restaurant = await getCreatorRestaurant(req.user.id);
        if (!restaurant) return res.status(404).json({ message: 'Restaurant not found' });

        restaurant.posProvider = posProvider;
        restaurant.zomatoLink = zomatoLink;
        restaurant.swiggyLink = swiggyLink;

        await restaurant.save();
        res.status(200).json({ status: 'success', data: restaurant });
    } catch (error) {
        res.status(500).json({ message: formatError(error) });
    }
};

// @desc    Step C (Manual): Links
// @route   PUT /api/restaurants/setup/manual-info
export const updateManualInfo = async (req, res) => {
    try {
        const { zomatoLink, swiggyLink } = req.body;
        const restaurant = await getCreatorRestaurant(req.user.id);
        if (!restaurant) return res.status(404).json({ message: 'Restaurant not found' });

        restaurant.zomatoLink = zomatoLink;
        restaurant.swiggyLink = swiggyLink;

        await restaurant.save();
        res.status(200).json({ status: 'success', data: restaurant });
    } catch (error) {
        res.status(500).json({ message: formatError(error) });
    }
};
// @desc    Get public restaurant details
// @route   GET /api/restaurants/:id/details
// @access  Public
export const getRestaurantDetails = async (req, res) => {
    try {
        const restaurant = await Restaurant.findById(req.params.id)
            .select('name restaurantName description ambienceImages menuImages zomatoLink swiggyLink isVerified verificationStatus');

        if (!restaurant) {
            return res.status(404).json({ status: 'error', message: 'Restaurant not found' });
        }

        // Standardize response fields
        const details = {
            id: restaurant._id,
            name: restaurant.restaurantName || restaurant.name,
            description: restaurant.description || '',
            ambienceImages: restaurant.ambienceImages || [],
            menuImages: restaurant.menuImages || [],
            zomatoLink: restaurant.zomatoLink || '',
            swiggyLink: restaurant.swiggyLink || '',
            isVerified: restaurant.isVerified || ['APPROVED', 'VERIFIED'].includes(restaurant.verificationStatus)
        };

        res.status(200).json({
            status: 'success',
            data: details,
        });
    } catch (error) {
        res.status(500).json({ status: 'error', message: formatError(error) });
    }
};
