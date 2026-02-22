import Cart from '../models/cart.model.js';
import PlatformPrice from '../models/platformPrice.model.js';
import Food from '../models/food.model.js';
import Reel from '../models/reel.model.js';
import Restaurant from '../models/restaurant.model.js';
import { formatError } from '../utils/errorFormatter.js';

// @desc    Add item to cart
// @route   POST /api/cart/add
// @access  Private
export const addToCart = async (req, res) => {
    try {
        const { reelId, platform, quantity = 1 } = req.body;
        console.log(`[CART_DEBUG] Adding item. Reel: ${reelId}, Platform: ${platform}`);

        if (!reelId || !platform) {
            return res.status(400).json({
                success: false,
                message: 'ReelId and platform are required'
            });
        }

        // Fetch reel with populated restaurant
        const reel = await Reel.findById(reelId).populate('restaurant');
        if (!reel) {
            return res.status(404).json({
                success: false,
                message: 'Reel not found'
            });
        }

        let price = 0;
        const targetPlatform = platform.toUpperCase();

        // 🎯 SOURCE OF TRUTH: Reel pricing for MANUAL mode
        if (reel.priceSource === 'MANUAL') {
            price = targetPlatform === 'ZOMATO' ? reel.prices?.zomatoPrice : reel.prices?.swiggyPrice;
        } else {
            // POS Mode - Fetch from PlatformPrice model (unchanged as per requirements)
            const platformPrice = await PlatformPrice.findOne({
                food: reel.food,
                platform: targetPlatform
            });
            price = platformPrice ? platformPrice.price : 0;
        }

        // 🛑 VALIDATION: Error if price is missing
        if (!price || price <= 0) {
            return res.status(400).json({
                success: false,
                message: `Price not available for ${targetPlatform} on this reel. Please update the reel pricing.`
            });
        }

        // Increment stats safely
        await Reel.findByIdAndUpdate(reelId, { $inc: { cartAdds: 1 } });
        if (reel.restaurant) {
            await Restaurant.findByIdAndUpdate(reel.restaurant._id, { $inc: { totalCartAdds: 1 } });
        }

        let cart = await Cart.findOne({ user: req.user.id });

        const newItem = {
            reelId: reel._id,
            restaurantId: reel.restaurant?._id || reel.restaurant,
            foodName: reel.foodName || 'Tasty Dish',
            platform: targetPlatform,
            price,
            quantity
        };

        if (!newItem.restaurantId) {
            return res.status(400).json({
                success: false,
                message: 'This reel is not properly linked to a restaurant.'
            });
        }

        if (!cart) {
            cart = await Cart.create({
                user: req.user.id,
                items: [newItem],
            });
        } else {
            const itemIndex = cart.items.findIndex(
                (item) => item.reelId.toString() === reelId && item.platform === targetPlatform
            );

            if (itemIndex > -1) {
                cart.items[itemIndex].quantity += quantity;
            } else {
                cart.items.push(newItem);
            }

            await cart.save();
        }

        return res.status(200).json({
            success: true,
            data: cart
        });

    } catch (error) {
        res.status(500).json({ status: 'error', message: formatError(error) });
    }
};

// @desc    Get user cart
// @route   GET /api/cart
// @access  Private
export const getCart = async (req, res) => {
    try {
        const cart = await Cart.findOne({ user: req.user.id })
            .populate({
                path: 'items.reelId',
                select: 'prices videoUrl'
            })
            .populate({
                path: 'items.restaurantId',
                select: 'name restaurantName zomatoLink swiggyLink'
            });

        if (!cart) {
            return res.status(200).json({ status: 'success', data: { items: [], totalAmount: 0 } });
        }

        const formattedItems = cart.items.map(item => ({
            reelId: item.reelId?._id || item.reelId,
            foodName: item.foodName,
            restaurantName: item.restaurantId?.restaurantName || item.restaurantId?.name || 'Unknown Restaurant',
            restaurantId: item.restaurantId?._id,
            platform: item.platform,
            price: item.price,
            quantity: item.quantity,
            totalPrice: item.price * item.quantity,
            // Add comparison data
            comparisonPrices: {
                zomato: item.reelId?.prices?.zomatoPrice || 0,
                swiggy: item.reelId?.prices?.swiggyPrice || 0
            },
            links: {
                zomato: item.restaurantId?.zomatoLink || '',
                swiggy: item.restaurantId?.swiggyLink || ''
            },
            image: item.reelId?.videoUrl ? '' : '🍲' // We might need a thumbnail here, but empty for now
        }));

        const totalAmount = formattedItems.reduce((acc, item) => acc + item.totalPrice, 0);

        res.status(200).json({
            status: 'success',
            data: {
                items: formattedItems,
                totalAmount
            },
        });
    } catch (error) {
        res.status(500).json({ status: 'error', message: formatError(error) });
    }
};

// @desc    Get checkout details grouped by restaurant
// @route   GET /api/cart/checkout
// @access  Private
export const getCheckoutDetails = async (req, res) => {
    try {
        const cart = await Cart.findOne({ user: req.user.id })
            .populate('items.restaurantId', 'name restaurantName zomatoLink swiggyLink');

        if (!cart || cart.items.length === 0) {
            return res.status(400).json({ status: 'error', message: 'Cart is empty' });
        }

        // Group by restaurant
        const grouped = {};

        cart.items.forEach(item => {
            const restId = item.restaurantId?._id?.toString() || 'unknown';
            if (!grouped[restId]) {
                grouped[restId] = {
                    restaurantName: item.restaurantId?.restaurantName || item.restaurantId?.name || 'Unknown Restaurant',
                    items: [],
                    checkoutLinks: {
                        zomato: item.restaurantId?.zomatoLink || '',
                        swiggy: item.restaurantId?.swiggyLink || '',
                        zomatoAvailable: !!item.restaurantId?.zomatoLink,
                        swiggyAvailable: !!item.restaurantId?.swiggyLink
                    }
                };
            }
            grouped[restId].items.push({
                foodName: item.foodName,
                platform: item.platform,
                price: item.price,
                quantity: item.quantity,
                totalPrice: item.price * item.quantity
            });
        });

        res.status(200).json({
            status: 'success',
            data: Object.values(grouped)
        });
    } catch (error) {
        res.status(500).json({ status: 'error', message: formatError(error) });
    }
};
// @desc    Update item quantity
// @route   PATCH /api/cart/update
// @access  Private
export const updateQuantity = async (req, res) => {
    try {
        const { reelId, platform, quantity } = req.body;
        const cart = await Cart.findOne({ user: req.user.id });
        if (!cart) return res.status(404).json({ status: 'error', message: 'Cart not found' });

        const itemIndex = cart.items.findIndex(
            (item) => item.reelId.toString() === reelId && item.platform === platform.toUpperCase()
        );

        if (itemIndex > -1) {
            cart.items[itemIndex].quantity = Math.max(1, quantity);
            await cart.save();
            res.status(200).json({ status: 'success', data: cart });
        } else {
            res.status(404).json({ status: 'error', message: 'Item not found in cart' });
        }
    } catch (error) {
        res.status(500).json({ status: 'error', message: formatError(error) });
    }
};

// @desc    Remove item from cart
// @route   DELETE /api/cart/remove
// @access  Private
export const removeItem = async (req, res) => {
    try {
        const { reelId, platform } = req.body;
        const cart = await Cart.findOne({ user: req.user.id });
        if (!cart) return res.status(404).json({ status: 'error', message: 'Cart not found' });

        cart.items = cart.items.filter(
            (item) => !(item.reelId.toString() === reelId && item.platform === platform.toUpperCase())
        );

        await cart.save();
        res.status(200).json({ status: 'success', data: cart });
    } catch (error) {
        res.status(500).json({ status: 'error', message: formatError(error) });
    }
};
