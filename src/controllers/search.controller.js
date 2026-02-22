import Restaurant from '../models/restaurant.model.js';
import Food from '../models/food.model.js';
import { formatError } from '../utils/errorFormatter.js';

// @desc    Search restaurants and foods
// @route   GET /api/search
// @access  Private
export const globalSearch = async (req, res) => {
    try {
        const { q } = req.query;

        if (!q) {
            return res.status(400).json({ status: 'error', message: 'Please provide a search query' });
        }

        const regex = new RegExp(q, 'i');

        // 1. Search restaurants by name (must be verified)
        const restaurantsByName = await Restaurant.find({
            name: regex,
            verificationStatus: 'APPROVED'
        });

        // 2. Search foods by name and get their restaurants (must be verified)
        const foods = await Food.find({ name: regex }).populate({
            path: 'restaurant',
            match: { verificationStatus: 'APPROVED' }
        });
        const restaurantsByFood = foods.map(food => food.restaurant).filter(Boolean);

        // 3. Merge and deduplicate restaurants
        const allRestaurants = [...restaurantsByName, ...restaurantsByFood];
        const uniqueRestaurantIds = new Set();
        const mergedUnique = [];

        allRestaurants.forEach(restaurant => {
            if (!uniqueRestaurantIds.has(restaurant._id.toString())) {
                uniqueRestaurantIds.add(restaurant._id.toString());
                mergedUnique.push(restaurant);
            }
        });

        const now = new Date();

        // 4. Filter Sponsored (Valid Date Range) vs Regular
        const validSponsored = [];
        const regular = [];

        mergedUnique.forEach(res => {
            const isCurrentlySponsored =
                res.isSponsored &&
                (!res.sponsoredFrom || res.sponsoredFrom <= now) &&
                (!res.sponsoredTill || res.sponsoredTill >= now);

            if (isCurrentlySponsored) {
                validSponsored.push(res);
            } else {
                regular.push(res);
            }
        });

        // 5. Sort valid sponsored and regular by rating
        validSponsored.sort((a, b) => b.rating - a.rating);
        regular.sort((a, b) => b.rating - a.rating);

        // 6. Final Result: Max 2 sponsored at top + all regular
        const finalResults = [...validSponsored.slice(0, 2), ...regular];

        res.status(200).json({
            status: 'success',
            count: finalResults.length,
            data: finalResults,
        });
    } catch (error) {
        res.status(500).json({ status: 'error', message: formatError(error) });
    }
};
