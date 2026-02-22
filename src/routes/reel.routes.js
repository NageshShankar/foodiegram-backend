import express from 'express';
import { uploadReel, getFeed, getReelById, likeReel, commentReel, deleteComment, replyToComment, deleteReply, upload, saveReel, unsaveReel, getSavedReels } from '../controllers/reel.controller.js';
import { protect } from '../middleware/auth.middleware.js';
import { creatorOnly } from '../middleware/role.middleware.js';

import { isVerified } from '../middleware/verification.middleware.js';

const router = express.Router();

router.post('/', protect, creatorOnly, isVerified, upload.single('video'), uploadReel);
router.get('/', protect, getFeed);
router.get('/saved', protect, getSavedReels);
router.get('/:id', protect, getReelById);
router.post('/:id/like', protect, likeReel);
router.post('/:id/save', protect, saveReel);
router.delete('/:id/unsave', protect, unsaveReel);
router.post('/:id/comment', protect, commentReel);
router.delete('/:id/comment/:commentId', protect, deleteComment);
router.post('/:id/comment/:commentId/reply', protect, replyToComment);
router.delete('/:id/comment/:commentId/reply/:replyId', protect, deleteReply);

export default router;
