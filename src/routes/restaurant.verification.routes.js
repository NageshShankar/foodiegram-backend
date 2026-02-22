import express from 'express';
import {
    verifyIdentity,
    verifyPhoto,
    verifyLinks,
    selectPriceMode
} from '../controllers/restaurant.verification.controller.js';
import { protect, creator } from '../middleware/auth.middleware.js';
import { isVerified } from '../middleware/verification.middleware.js';

const router = express.Router();

// All verification routes require authentication and CREATOR role
router.use(protect);
router.use(creator);

router.post('/step1-identity', verifyIdentity);
router.post('/step2-photo', verifyPhoto);
router.post('/step3-links', verifyLinks);
router.post('/step4-mode', isVerified, selectPriceMode);

export default router;
