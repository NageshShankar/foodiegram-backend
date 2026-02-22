import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import {
    getCreatorProfile,
    updateCreatorProfile,
    setupRestaurantDetails,
    selectPriceMode,
    completeManualSetup,
    getProfileStatus,
    completePosSetup,
    addManualMenu,
    addManualPrices,
    updateRestaurantProfile
} from '../controllers/creator.controller.js';
import { connectPos, mapPosItems } from '../controllers/pos.controller.js';
import { getFollowers, getFollowing } from '../controllers/follow.controller.js';
import { protect } from '../middleware/auth.middleware.js';
import { creatorOnly } from '../middleware/role.middleware.js';
import { isVerified } from '../middleware/verification.middleware.js';

const router = express.Router();

// Ensure upload directory exists
const uploadDir = 'src/uploads/restaurants';
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        cb(null, `rest-${Date.now()}${path.extname(file.originalname)}`);
    }
});

const upload = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
    fileFilter: (req, file, cb) => {
        const filetypes = /jpeg|jpg|png|webp/;
        const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = filetypes.test(file.mimetype);
        if (extname && mimetype) return cb(null, true);
        cb(new Error('Images Only!'));
    }
});

// PART A - Onboarding Flow (New)
router.post('/restaurant-details', protect, upload.single('restaurantPhoto'), setupRestaurantDetails);

// PART B - Profile Status
router.get('/profile-status', protect, creatorOnly, getProfileStatus);

// Features (Enabled after verification)
router.post('/pos/connect', protect, creatorOnly, isVerified, connectPos);
router.post('/pos/map-menu', protect, creatorOnly, isVerified, mapPosItems);
router.post('/pos/complete', protect, creatorOnly, isVerified, completePosSetup);

router.post('/manual/add-menu', protect, creatorOnly, isVerified, addManualMenu);
router.post('/manual/add-prices', protect, creatorOnly, isVerified, addManualPrices);
router.post('/manual/complete', protect, creatorOnly, isVerified, completeManualSetup);

router.put('/select-price-mode', protect, selectPriceMode);
router.post('/complete-manual-setup', protect, completeManualSetup);

router.get('/:id', getCreatorProfile);
router.put('/profile', protect, isVerified, upload.single('profileImage'), updateCreatorProfile);
router.put('/restaurant/profile', protect, creatorOnly, isVerified, upload.fields([
    { name: 'ambienceImages', maxCount: 10 },
    { name: 'menuImages', maxCount: 10 }
]), updateRestaurantProfile);

// Follow lists
router.get('/:id/followers', getFollowers);
router.get('/:id/following', getFollowing);

export default router;
