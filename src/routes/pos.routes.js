import express from 'express';
import { connectPos, mapPosItems, getPosMenu } from '../controllers/pos.controller.js';
import { protect } from '../middleware/auth.middleware.js';
import { creatorOnly } from '../middleware/role.middleware.js';
import { isVerified } from '../middleware/verification.middleware.js';

const router = express.Router();

router.use(protect);
router.use(creatorOnly);
router.use(isVerified);

router.post('/connect', connectPos);
router.post('/map-items', mapPosItems);
router.get('/menu', getPosMenu);

export default router;
