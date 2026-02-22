import RestaurantPosConnection from '../models/restaurantPosConnection.model.js';
import FoodPosMap from '../models/foodPosMap.model.js';
import Restaurant from '../models/restaurant.model.js';
import User from '../models/user.model.js';
import Food from '../models/food.model.js';
import { getPosService } from '../services/pos/index.js';
import mongoose from 'mongoose';
import { formatError } from '../utils/errorFormatter.js';

// Helper: Get Logged In Restaurant
const getRestaurantId = async (userId) => {
    const user = await User.findById(userId);
    if (!user || user.role !== 'CREATOR' || !user.restaurant) return null;
    return user.restaurant;
}

// @desc    Connect POS
// @route   POST /api/pos/connect
export const connectPos = async (req, res) => {
    try {
        const { posProvider, apiKey } = req.body;
        const restaurantId = await getRestaurantId(req.user.id);

        if (!restaurantId) return res.status(404).json({ message: 'Restaurant not found' });
        if (!['PETPOOJA', 'POSIST'].includes(posProvider)) return res.status(400).json({ message: 'Invalid Provider' });

        // Update or Create Connection
        let connection = await RestaurantPosConnection.findOne({ restaurant: restaurantId });
        if (connection) {
            connection.posProvider = posProvider;
            connection.apiKey = apiKey;
            connection.isConnected = true;
            connection.connectedAt = Date.now();
        } else {
            connection = new RestaurantPosConnection({
                restaurant: restaurantId,
                posProvider,
                apiKey,
                isConnected: true
            });
        }
        await connection.save();

        // Update Restaurant Status
        const restaurantDoc = await Restaurant.findByIdAndUpdate(restaurantId, {
            priceMode: 'POS',
            posProvider,
            posConnected: true,
            setupCompleted: true
        }, { new: true });

        // AUTO-UPDATE EXISTING REELS: Trigger price sync for all reels of this restaurant
        const Reel = mongoose.model('Reel');
        const Food = mongoose.model('Food');
        const PlatformPrice = mongoose.model('PlatformPrice');

        const reels = await Reel.find({ restaurant: restaurantId });
        if (reels.length > 0) {
            try {
                const service = getPosService(posProvider);
                if (service) {
                    const menu = await service.fetchMenu({ apiKey });
                    for (const reel of reels) {
                        const posItem = menu.find(item =>
                            item.name.toLowerCase().includes(reel.foodName.toLowerCase()) ||
                            reel.foodName.toLowerCase().includes(item.name.toLowerCase())
                        );

                        if (posItem && posItem.basePrice) {
                            const platforms = ['ZOMATO', 'SWIGGY'];
                            for (const platform of platforms) {
                                const redirectUrl = platform === 'ZOMATO'
                                    ? restaurantDoc.zomatoLink || `https://zomato.com`
                                    : restaurantDoc.swiggyLink || `https://swiggy.com`;

                                await PlatformPrice.findOneAndUpdate(
                                    { food: reel.food, platform },
                                    {
                                        price: posItem.basePrice,
                                        redirectUrl,
                                        source: 'POS'
                                    },
                                    { upsert: true }
                                );
                            }
                            reel.priceStatus = 'AVAILABLE';
                            await reel.save();
                        }
                    }
                }
            } catch (syncErr) {
                console.error("Auto-sync error during POS connect:", syncErr);
            }
        }

        res.status(200).json({ status: 'success', message: 'POS Connected and prices synced', data: connection });
    } catch (error) {
        res.status(500).json({ status: 'error', message: formatError(error) });
    }
};

// @desc    Map POS Items
// @route   POST /api/pos/map-items
export const mapPosItems = async (req, res) => {
    try {
        const { posItemId, foodId } = req.body;
        const restaurantId = await getRestaurantId(req.user.id);
        if (!restaurantId) return res.status(404).json({ message: 'Restaurant not found' });

        // Validate Connection
        const connection = await RestaurantPosConnection.findOne({ restaurant: restaurantId });
        if (!connection || !connection.isConnected) {
            return res.status(400).json({ message: 'POS not connected' });
        }

        // Validate Food Ownership
        const food = await Food.findById(foodId);
        if (!food || food.restaurant.toString() !== restaurantId.toString()) {
            return res.status(404).json({ message: 'Food item not found or unauthorized' });
        }

        // Create/Update Map
        const mapping = await FoodPosMap.findOneAndUpdate(
            { restaurant: restaurantId, food: foodId },
            {
                posItemId,
                posProvider: connection.posProvider,
                restaurant: restaurantId,
                food: foodId
            },
            { new: true, upsert: true, setDefaultsOnInsert: true }
        );

        res.status(200).json({ status: 'success', data: mapping });
    } catch (error) {
        res.status(500).json({ status: 'error', message: formatError(error) });
    }
};

// @desc    Fetch Menu (For Manual Mapping UI)
// @route   GET /api/pos/menu
export const getPosMenu = async (req, res) => {
    try {
        const restaurantId = await getRestaurantId(req.user.id);
        if (!restaurantId) return res.status(404).json({ message: 'Restaurant not found' });

        const connection = await RestaurantPosConnection.findOne({ restaurant: restaurantId }).select('+apiKey');
        if (!connection || !connection.isConnected) {
            return res.status(400).json({ message: 'POS not connected' });
        }

        const service = getPosService(connection.posProvider);
        if (!service) return res.status(500).json({ message: 'Service not found' });

        const menu = await service.fetchMenu({ apiKey: connection.apiKey });
        res.status(200).json({ status: 'success', data: menu });
    } catch (error) {
        res.status(500).json({ status: 'error', message: formatError(error) });
    }
}
