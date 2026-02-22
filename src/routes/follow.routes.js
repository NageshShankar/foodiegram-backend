import express from 'express';
import { followCreator, unfollowCreator } from '../controllers/follow.controller.js';
import { protect } from '../middleware/auth.middleware.js';

const router = express.Router();

router.post('/follow/:creatorId', protect, followCreator);
router.post('/unfollow/:creatorId', protect, unfollowCreator);

export default router;
