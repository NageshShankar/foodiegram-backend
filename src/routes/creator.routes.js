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
import { restrictUnverifiedCreatorUpload } from '../middleware/restrictCreatorUpload.js';


const router = express.Router();

// Ensure upload directory exists
const uploadDir = 'src/uploads/restaurants';
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => { cb(null, uploadDir); },
    filename: (req, file, cb) => {
        cb(null, `rest-${Date.now()}${path.extname(file.originalname)}`);
    }
});

const upload = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        const filetypes = /jpeg|jpg|png|webp/;
        const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = filetypes.test(file.mimetype);
        if (extname && mimetype) return cb(null, true);
        cb(new Error('Images Only!'));
    }
});

// ─── Onboarding (No admin restriction — always accessible) ────────────────────
router.post('/restaurant-details', protect, upload.single('restaurantPhoto'), setupRestaurantDetails);
router.get('/profile-status', protect, creatorOnly, getProfileStatus);

// ─── Post-setup Features ──────────────────────────────────────────────────────
router.post('/pos/connect', protect, creatorOnly, isVerified, restrictUnverifiedCreatorUpload, connectPos);
router.post('/pos/map-menu', protect, creatorOnly, isVerified, restrictUnverifiedCreatorUpload, mapPosItems);
router.post('/pos/complete', protect, creatorOnly, isVerified, restrictUnverifiedCreatorUpload, completePosSetup);

router.post('/manual/add-menu', protect, creatorOnly, isVerified, restrictUnverifiedCreatorUpload, addManualMenu);
router.post('/manual/add-prices', protect, creatorOnly, isVerified, restrictUnverifiedCreatorUpload, addManualPrices);
router.post('/manual/complete', protect, creatorOnly, isVerified, restrictUnverifiedCreatorUpload, completeManualSetup);


router.put('/select-price-mode', protect, selectPriceMode);
router.post('/complete-manual-setup', protect, completeManualSetup);

// ─── Profile Editing (Open — unverified creators can still edit their profile) ─
router.put('/profile', protect, isVerified, upload.single('profileImage'), updateCreatorProfile);
router.put('/restaurant/profile', protect, creatorOnly, isVerified, upload.fields([
    { name: 'ambienceImages', maxCount: 10 },
    { name: 'menuImages', maxCount: 10 }
]), updateRestaurantProfile);

// ─── Public Reads ─────────────────────────────────────────────────────────────
router.get('/:id', getCreatorProfile);
router.get('/:id/followers', getFollowers);
router.get('/:id/following', getFollowing);

export default router;
