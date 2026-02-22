import express from 'express';
import {
    getRestaurants,
    getRestaurant,
    updateBasicInfo,
    updatePosInfo,
    updateManualInfo,
    getRestaurantDetails
} from '../controllers/restaurant.controller.js';
import { followRestaurant, unfollowRestaurant } from '../controllers/follow.controller.js';
import { protect } from '../middleware/auth.middleware.js';
import { creatorOnly } from '../middleware/role.middleware.js';
import { isVerified } from '../middleware/verification.middleware.js';

const router = express.Router();

router.get('/', getRestaurants);
router.get('/:id', getRestaurant);
router.get('/:id/details', getRestaurantDetails);

// Follow Routes
router.post('/:id/follow', protect, followRestaurant);
router.delete('/:id/unfollow', protect, unfollowRestaurant);

// Onboarding Routes (Protected + Creator Only)
router.put('/setup/basic', protect, creatorOnly, updateBasicInfo); // Allow update for verification
router.put('/setup/pos-info', protect, creatorOnly, isVerified, updatePosInfo);
router.put('/setup/manual-info', protect, creatorOnly, isVerified, updateManualInfo);

export default router;
