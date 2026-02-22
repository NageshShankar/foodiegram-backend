import express from 'express';
import { verifyCreator, verifyRestaurant, rejectRestaurant } from '../controllers/admin.controller.js';
import { protect } from '../middleware/auth.middleware.js';
import { adminOnly } from '../middleware/role.middleware.js';

const router = express.Router();

// Existing dashboard-style route (requires auth)
router.post('/verify-creator', protect, adminOnly, verifyCreator);

// New email-button routes (secured by token)
router.get('/verify', verifyRestaurant);
router.get('/reject', rejectRestaurant);

export default router;
