import path from 'path';
import multer from 'multer';
import mongoose from 'mongoose';
import Reel from '../models/reel.model.js';
import Restaurant from '../models/restaurant.model.js';
import Follow from '../models/follow.model.js';
import User from '../models/user.model.js';
import Food from '../models/food.model.js';
import PlatformPrice from '../models/platformPrice.model.js';
import RestaurantPosConnection from '../models/restaurantPosConnection.model.js';
import FoodPosMap from '../models/foodPosMap.model.js';
import SavedReel from '../models/savedReel.model.js';
import { formatError } from '../utils/errorFormatter.js';

// Multer Storage Configuration
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'src/uploads/reels');
    },
    filename: (req, file, cb) => {
        cb(null, `${Date.now()}-${file.originalname}`);
    },
});

export const upload = multer({
    storage,
    fileFilter: (req, file, cb) => {
        const filetypes = /mp4|mov|avi|wmv|mkv/;
        const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = filetypes.test(file.mimetype);

        if (extname && mimetype) {
            return cb(null, true);
        } else {
            cb('Error: Videos Only!');
        }
    },
});

// @desc    Upload a reel
// @route   POST /api/reels
// @access  Private/Creator
export const uploadReel = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ status: 'error', message: 'Please upload a video file' });
        }

        const { caption, restaurantId, foodName, category, zomatoPrice, swiggyPrice } = req.body;

        // Validate required fields
        if (!foodName || !category) {
            return res.status(400).json({
                status: 'error',
                message: 'foodName and category are required'
            });
        }

        // Find restaurant to check verification status
        let targetRestaurantId = restaurantId;
        if (!targetRestaurantId) {
            const user = await User.findById(req.user.id);
            targetRestaurantId = user.restaurant;
        }

        if (!targetRestaurantId) {
            return res.status(403).json({ status: 'error', message: 'You must be linked to a restaurant to upload reels' });
        }

        const restaurantDoc = await Restaurant.findById(targetRestaurantId);
        if (!restaurantDoc || (restaurantDoc.verificationStatus !== 'APPROVED' && restaurantDoc.verificationStatus !== 'VERIFIED')) {
            return res.status(403).json({
                status: 'error',
                message: 'Upload failed. Your account is under verification.'
            });
        }

        if (!restaurantDoc.setupCompleted) {
            return res.status(403).json({
                status: 'error',
                message: 'Upload failed. Please complete your profile setup (POS/Manual pricing) first.'
            });
        }

        const videoUrl = `/uploads/reels/${req.file.filename}`;

        let foodItem = null;
        let priceStatus = 'PENDING';
        let priceMessage = '';

        // Find or create Food item
        foodItem = await Food.findOne({
            name: foodName,
            restaurant: targetRestaurantId
        });

        if (!foodItem) {
            foodItem = await Food.create({
                name: foodName,
                category: category,
                restaurant: targetRestaurantId
            });
        }

        // Initialize price data for Reel model
        const prices = {
            zomatoPrice: zomatoPrice ? parseFloat(zomatoPrice) : undefined,
            swiggyPrice: swiggyPrice ? parseFloat(swiggyPrice) : undefined
        };
        const priceSource = restaurantDoc.priceMode; // 'POS' or 'MANUAL'

        // Handle pricing based on priceMode
        if (restaurantDoc.priceMode === 'POS') {
            // POS MODE: Do NOT accept prices from body, fetch from POS automatically
            const posConnection = await RestaurantPosConnection.findOne({
                restaurant: targetRestaurantId,
                isConnected: true
            }).select('+apiKey');

            if (posConnection) {
                try {
                    const { getPosService } = await import('../services/pos/index.js');
                    const posService = getPosService(posConnection.posProvider);

                    if (posService) {
                        const menu = await posService.fetchMenu({ apiKey: posConnection.apiKey });
                        const posItem = menu.find(item =>
                            item.name.toLowerCase().includes(foodName.toLowerCase()) ||
                            foodName.toLowerCase().includes(item.name.toLowerCase())
                        );

                        if (posItem && posItem.basePrice) {
                            const platforms = ['ZOMATO', 'SWIGGY'];
                            prices.zomatoPrice = posItem.basePrice;
                            prices.swiggyPrice = posItem.basePrice;

                            for (const platform of platforms) {
                                const redirectUrl = platform === 'ZOMATO'
                                    ? restaurantDoc.zomatoLink || `https://zomato.com`
                                    : restaurantDoc.swiggyLink || `https://swiggy.com`;

                                await PlatformPrice.findOneAndUpdate(
                                    { food: foodItem._id, platform },
                                    { price: posItem.basePrice, redirectUrl, source: 'POS' },
                                    { upsert: true }
                                );
                            }
                            priceStatus = 'AVAILABLE';
                            priceMessage = 'Reel uploaded. Prices auto-fetched from POS.';
                        } else {
                            priceStatus = 'PENDING';
                            priceMessage = 'Reel uploaded. Food not found in POS menu yet.';
                        }
                    }
                } catch (err) {
                    priceStatus = 'PENDING';
                    priceMessage = 'Reel uploaded. POS sync in progress.';
                }
            } else {
                priceStatus = 'PENDING';
                priceMessage = 'Reel uploaded. Connect POS later to enable auto-pricing.';
            }
        } else if (restaurantDoc.priceMode === 'MANUAL') {
            // MANUAL MODE: Accept optional prices during upload
            if (zomatoPrice || swiggyPrice) {
                const platforms = [
                    { name: 'ZOMATO', price: zomatoPrice, link: restaurantDoc.zomatoLink },
                    { name: 'SWIGGY', price: swiggyPrice, link: restaurantDoc.swiggyLink }
                ];

                for (const platform of platforms) {
                    if (platform.price) {
                        const redirectUrl = platform.link || `https://${platform.name.toLowerCase()}.com`;
                        await PlatformPrice.findOneAndUpdate(
                            { food: foodItem._id, platform: platform.name },
                            {
                                price: parseFloat(platform.price),
                                redirectUrl,
                                source: 'MANUAL'
                            },
                            { upsert: true }
                        );
                    }
                }
                priceStatus = 'AVAILABLE';
                priceMessage = 'Reel uploaded. Manual prices saved.';
            } else {
                priceStatus = 'PENDING';
                priceMessage = 'Reel uploaded. Add manual prices later.';
            }
        }

        // Create reel
        const reel = await Reel.create({
            videoUrl,
            caption,
            foodName,
            category,
            food: foodItem._id,
            prices,
            priceSource,
            priceStatus,
            creator: req.user.id,
            restaurant: targetRestaurantId,
        });

        res.status(201).json({
            status: 'success',
            message: priceMessage,
            data: reel,
        });
    } catch (error) {
        res.status(500).json({ status: 'error', message: formatError(error) });
    }
};

// @desc    Get reel feed
// @route   GET /api/reels
// @access  Private
export const getFeed = async (req, res) => {
    try {
        const { creator } = req.query;

        // If filtering by creator (e.g. Profile Page)
        if (creator) {
            const reels = await Reel.find({ creator })
                .sort({ createdAt: -1 })
                .populate('creator', 'name username profileImage followersCount')
                .populate('likes', 'name username profileImage')
                .populate('restaurant', 'name restaurantName isVerified verificationStatus setupCompleted zomatoLink swiggyLink');

            // Fetch prices
            const foodIds = reels.map(r => r.food).filter(Boolean);
            const PlatformPrice = mongoose.model('PlatformPrice');
            const prices = await PlatformPrice.find({ food: { $in: foodIds } });

            let followingRestaurantIds = [];
            if (req.user) {
                const follows = await Follow.find({ userId: req.user.id });
                followingRestaurantIds = follows.map(f => f.restaurantId.toString());
            }

            let savedReelIds = [];
            if (req.user) {
                const savedReels = await SavedReel.find({ userId: req.user.id });
                savedReelIds = savedReels.map(s => s.reelId.toString());
            }

            const reelsWithPrices = reels.map(r => {
                const reelObj = r.toObject();

                reelObj.isFollowing = followingRestaurantIds.includes(r.restaurant?._id?.toString());
                reelObj.isSaved = savedReelIds.includes(r._id.toString());

                if (r.priceSource === 'MANUAL') {
                    reelObj.prices = {
                        zomatoPrice: r.prices?.zomatoPrice,
                        swiggyPrice: r.prices?.swiggyPrice
                    };
                } else {
                    const reelPrices = prices.filter(p => p.food?.toString() === r.food?.toString());
                    const formattedPrices = {};
                    reelPrices.forEach(p => {
                        if (p.platform === 'ZOMATO') formattedPrices.zomatoPrice = p.price;
                        if (p.platform === 'SWIGGY') formattedPrices.swiggyPrice = p.price;
                    });
                    reelObj.prices = {
                        zomatoPrice: formattedPrices.zomatoPrice,
                        swiggyPrice: formattedPrices.swiggyPrice
                    };
                }
                return reelObj;
            });

            return res.status(200).json({ status: 'success', data: reelsWithPrices });
        }

        let followingRestaurantIds = [];
        if (req.user) {
            const follows = await Follow.find({ userId: req.user.id });
            followingRestaurantIds = follows.map(f => f.restaurantId.toString());
        }

        // 1. Fetch reels from followed restaurants
        const followedReels = await Reel.find({ restaurant: { $in: followingRestaurantIds } })
            .sort({ createdAt: -1 })
            .populate('creator', 'name username profileImage followersCount')
            .populate('likes', 'name username profileImage')
            .populate('restaurant', 'name restaurantName isVerified verificationStatus setupCompleted zomatoLink swiggyLink');

        // 2. Fetch all other reels
        const otherReels = await Reel.find({ restaurant: { $nin: followingRestaurantIds } })
            .sort({ createdAt: -1 })
            .populate('creator', 'name username profileImage followersCount')
            .populate('likes', 'name username profileImage')
            .populate('restaurant', 'name restaurantName isVerified verificationStatus setupCompleted zomatoLink swiggyLink');

        // 3. Merge (Followed first) & Filter
        const allReelsRaw = [...followedReels, ...otherReels];
        const allReels = allReelsRaw.filter(r => r.restaurant);

        // ... increment views and fetch prices ...
        const reelIds = allReels.map(r => r._id);
        if (reelIds.length > 0) {
            await Reel.updateMany({ _id: { $in: reelIds } }, { $inc: { views: 1 } });
            const restaurantIds = [...new Set(allReels.map(r => r.restaurant?._id?.toString()).filter(Boolean))];
            for (const resId of restaurantIds) {
                const count = allReels.filter(r => r.restaurant?._id?.toString() === resId).length;
                await Restaurant.findByIdAndUpdate(resId, { $inc: { totalViews: count } });
            }
        }

        const foodIds = allReels.map(r => r.food).filter(Boolean);
        const PlatformPrice = mongoose.model('PlatformPrice');
        const prices = await PlatformPrice.find({ food: { $in: foodIds } });

        let savedReelIds = [];
        if (req.user) {
            const savedReels = await SavedReel.find({ userId: req.user.id });
            savedReelIds = savedReels.map(s => s.reelId.toString());
        }

        const reelsWithPrices = allReels.map(reel => {
            const reelObj = reel.toObject();

            // Set isFollowing
            reelObj.isFollowing = followingRestaurantIds.includes(reel.restaurant?._id?.toString());
            reelObj.isSaved = savedReelIds.includes(reel._id.toString());

            if (reel.priceSource === 'MANUAL') {
                reelObj.prices = {
                    zomatoPrice: reel.prices?.zomatoPrice,
                    swiggyPrice: reel.prices?.swiggyPrice
                };
            } else {
                const reelPrices = prices.filter(p => p.food?.toString() === reel.food?.toString());
                const formattedPrices = {};
                reelPrices.forEach(p => {
                    if (p.platform === 'ZOMATO') formattedPrices.zomatoPrice = p.price;
                    if (p.platform === 'SWIGGY') formattedPrices.swiggyPrice = p.price;
                });
                reelObj.prices = {
                    zomatoPrice: formattedPrices.zomatoPrice,
                    swiggyPrice: formattedPrices.swiggyPrice
                };
            }

            return reelObj;
        });

        res.status(200).json({
            status: 'success',
            count: reelsWithPrices.length,
            data: reelsWithPrices,
        });
    } catch (error) {
        res.status(500).json({ status: 'error', message: formatError(error) });
    }
};

// @desc    Get single reel
// @route   GET /api/reels/:id
// @access  Public
export const getReelById = async (req, res) => {
    try {
        const reel = await Reel.findById(req.params.id)
            .populate('creator', 'name username profileImage followersCount')
            .populate('restaurant', 'name restaurantName isVerified zomatoLink swiggyLink');

        if (!reel) {
            return res.status(404).json({ success: false, message: 'Reel not found' });
        }

        const reelObj = reel.toObject();

        if (reel.priceSource === 'MANUAL') {
            reelObj.prices = {
                zomatoPrice: reel.prices?.zomatoPrice,
                swiggyPrice: reel.prices?.swiggyPrice
            };
        } else {
            const prices = await PlatformPrice.find({ food: reel.food });
            const formattedPrices = {};
            prices.forEach(p => {
                if (p.platform === 'ZOMATO') formattedPrices.zomatoPrice = p.price;
                if (p.platform === 'SWIGGY') formattedPrices.swiggyPrice = p.price;
            });
            reelObj.prices = {
                zomatoPrice: formattedPrices.zomatoPrice,
                swiggyPrice: formattedPrices.swiggyPrice
            };
        }

        res.status(200).json({
            success: true,
            data: {
                id: reel._id,
                foodName: reel.foodName,
                restaurantName: reel.restaurant?.restaurantName || reel.restaurant?.name,
                prices: reelObj.prices
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: formatError(error) });
    }
};

// @desc    Like/Unlike a reel
// @route   POST /api/reels/:id/like
// @access  Private
export const likeReel = async (req, res) => {
    try {
        const reel = await Reel.findById(req.params.id);

        if (!reel) {
            return res.status(404).json({ status: 'error', message: 'Reel not found' });
        }

        // Check if user already liked the reel
        const isLiked = reel.likes.includes(req.user.id);

        if (isLiked) {
            // Unlike
            reel.likes = reel.likes.filter((userId) => userId.toString() !== req.user.id);
        } else {
            // Like
            reel.likes.push(req.user.id);
        }

        await reel.save();
        await reel.populate('likes', 'name username profileImage');

        res.status(200).json({
            status: 'success',
            message: isLiked ? 'Reel unliked' : 'Reel liked',
            likes: reel.likes,
            likesCount: reel.likes.length,
        });
    } catch (error) {
        res.status(500).json({ status: 'error', message: formatError(error) });
    }
};

// @desc    Comment on a reel
// @route   POST /api/reels/:id/comment
// @access  Private
export const commentReel = async (req, res) => {
    try {
        const { text } = req.body;
        const reel = await Reel.findById(req.params.id);

        if (!reel) {
            return res.status(404).json({ status: 'error', message: 'Reel not found' });
        }

        // Fetch user information to get the name
        const user = await User.findById(req.user.id);
        const displayName = user?.name || user?.username || 'Anonymous';

        const comment = {
            user: req.user.id,
            username: user?.username || 'Anonymous', // Unique handle
            displayName: user?.name || 'Anonymous',   // Full Name
            profileImage: user?.profileImage || '',   // Avatar
            text,
            createdAt: new Date()
        };

        reel.comments.push(comment);
        await reel.save();

        res.status(200).json({ status: 'success', data: reel.comments });
    } catch (error) {
        res.status(500).json({ status: 'error', message: formatError(error) });
    }
};

// @desc    Delete a comment
// @route   DELETE /api/reels/:id/comment/:commentId
// @access  Private
export const deleteComment = async (req, res) => {
    try {
        const reel = await Reel.findById(req.params.id);
        if (!reel) {
            return res.status(404).json({ status: 'error', message: 'Reel not found' });
        }

        const comment = reel.comments.id(req.params.commentId);
        if (!comment) {
            return res.status(404).json({ status: 'error', message: 'Comment not found' });
        }

        // Check ownership
        if (comment.user.toString() !== req.user.id) {
            return res.status(403).json({ status: 'error', message: 'Not authorized to delete this comment' });
        }

        reel.comments.pull(req.params.commentId);
        await reel.save();

        res.status(200).json({ status: 'success', message: 'Comment deleted' });
    } catch (error) {
        res.status(500).json({ status: 'error', message: formatError(error) });
    }
};

// @desc    Reply to a comment
// @route   POST /api/reels/:id/comment/:commentId/reply
// @access  Private
export const replyToComment = async (req, res) => {
    try {
        const { text } = req.body;
        const reel = await Reel.findById(req.params.id);

        if (!reel) {
            return res.status(404).json({ status: 'error', message: 'Reel not found' });
        }

        const comment = reel.comments.id(req.params.commentId);
        if (!comment) {
            return res.status(404).json({ status: 'error', message: 'Comment not found' });
        }

        const user = await mongoose.model('User').findById(req.user.id);

        const reply = {
            user: req.user.id,
            username: user?.username || 'Anonymous',
            displayName: user?.name || 'Anonymous',
            profileImage: user?.profileImage || '',
            text,
            createdAt: new Date()
        };

        comment.replies.push(reply);
        await reel.save();

        res.status(200).json({ status: 'success', data: reel.comments });
    } catch (error) {
        res.status(500).json({ status: 'error', message: formatError(error) });
    }
};

// @desc    Delete a reply
// @route   DELETE /api/reels/:id/comment/:commentId/reply/:replyId
// @access  Private
export const deleteReply = async (req, res) => {
    try {
        const reel = await Reel.findById(req.params.id);

        if (!reel) {
            return res.status(404).json({ status: 'error', message: 'Reel not found' });
        }

        const comment = reel.comments.id(req.params.commentId);
        if (!comment) {
            return res.status(404).json({ status: 'error', message: 'Comment not found' });
        }

        const reply = comment.replies.id(req.params.replyId);
        if (!reply) {
            return res.status(404).json({ status: 'error', message: 'Reply not found' });
        }

        // Check ownership
        if (reply.user.toString() !== req.user.id) {
            return res.status(403).json({ status: 'error', message: 'Not authorized to delete this reply' });
        }

        comment.replies.pull(req.params.replyId);
        await reel.save();

        res.status(200).json({ status: 'success', message: 'Reply deleted' });
    } catch (error) {
        res.status(500).json({ status: 'error', message: formatError(error) });
    }
};

// @desc    Save a reel
// @route   POST /api/reels/:id/save
// @access  Private
export const saveReel = async (req, res) => {
    try {
        const reel = await Reel.findById(req.params.id);
        if (!reel) {
            return res.status(404).json({ success: false, message: 'Reel not found' });
        }

        const existingSave = await SavedReel.findOne({
            userId: req.user.id,
            reelId: req.params.id
        });

        if (existingSave) {
            return res.status(200).json({ success: true, saved: true });
        }

        await SavedReel.create({
            userId: req.user.id,
            reelId: req.params.id
        });

        res.status(201).json({ success: true, saved: true });
    } catch (error) {
        res.status(500).json({ success: false, message: formatError(error) });
    }
};

// @desc    Unsave a reel
// @route   DELETE /api/reels/:id/unsave
// @access  Private
export const unsaveReel = async (req, res) => {
    try {
        await SavedReel.findOneAndDelete({
            userId: req.user.id,
            reelId: req.params.id
        });

        res.status(200).json({ success: true, saved: false });
    } catch (error) {
        res.status(500).json({ success: false, message: formatError(error) });
    }
};

// @desc    Get saved reels
// @route   GET /api/reels/saved
// @access  Private
export const getSavedReels = async (req, res) => {
    try {
        const savedEntries = await SavedReel.find({ userId: req.user.id })
            .sort({ createdAt: -1 });

        const reelIds = savedEntries.map(entry => entry.reelId);

        const reels = await Reel.find({ _id: { $in: reelIds } })
            .populate('creator', 'name username profileImage followersCount')
            .populate('restaurant', 'name restaurantName isVerified verificationStatus setupCompleted zomatoLink swiggyLink');

        // Maintain the order of saved entries
        const orderedReels = savedEntries.map(entry => {
            const reel = reels.find(r => r._id.toString() === entry.reelId.toString());
            if (!reel) return null;

            const reelObj = reel.toObject();
            reelObj.isSaved = true;
            // Note: Since we are fetching saved reels, they are all saved by definition
            return reelObj;
        }).filter(Boolean);

        // Fetch prices for these reels
        const foodIds = orderedReels.map(r => r.food).filter(Boolean);
        const prices = await mongoose.model('PlatformPrice').find({ food: { $in: foodIds } });

        const reelsWithPrices = orderedReels.map(reelObj => {
            if (reelObj.priceSource === 'MANUAL') {
                reelObj.prices = {
                    zomatoPrice: reelObj.prices?.zomatoPrice,
                    swiggyPrice: reelObj.prices?.swiggyPrice
                };
            } else {
                const reelPrices = prices.filter(p => p.food?.toString() === reelObj.food?.toString());
                const formattedPrices = {};
                reelPrices.forEach(p => {
                    if (p.platform === 'ZOMATO') formattedPrices.zomatoPrice = p.price;
                    if (p.platform === 'SWIGGY') formattedPrices.swiggyPrice = p.price;
                });
                reelObj.prices = {
                    zomatoPrice: formattedPrices.zomatoPrice,
                    swiggyPrice: formattedPrices.swiggyPrice
                };
            }
            return reelObj;
        });

        res.status(200).json({
            status: 'success',
            count: reelsWithPrices.length,
            data: reelsWithPrices
        });
    } catch (error) {
        res.status(500).json({ status: 'error', message: formatError(error) });
    }
};
