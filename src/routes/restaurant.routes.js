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

// Public
router.get('/', getRestaurants);
router.get('/:id', getRestaurant);
router.get('/:id/details', getRestaurantDetails);

// Follow — open to all authenticated users including unverified creators
router.post('/:id/follow', protect, followRestaurant);
router.delete('/:id/unfollow', protect, unfollowRestaurant);

// Onboarding setup — exempt from admin restriction
router.put('/setup/basic', protect, creatorOnly, updateBasicInfo);
router.put('/setup/pos-info', protect, creatorOnly, isVerified, updatePosInfo);
router.put('/setup/manual-info', protect, creatorOnly, isVerified, updateManualInfo);

export default router;
