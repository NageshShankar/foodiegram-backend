import express from 'express';
import { connectPos, mapPosItems, getPosMenu } from '../controllers/pos.controller.js';
import { protect } from '../middleware/auth.middleware.js';
import { creatorOnly } from '../middleware/role.middleware.js';
import { isVerified } from '../middleware/verification.middleware.js';

const router = express.Router();

router.post('/connect', protect, creatorOnly, isVerified, connectPos);
router.post('/map-items', protect, creatorOnly, isVerified, mapPosItems);
router.get('/menu', protect, creatorOnly, isVerified, getPosMenu);

export default router;
