import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { register, login, creatorLogin, verifyCreatorOTP, googleAuth, forgotPassword, resetPassword, verifyRegistrationOTP, getMe } from '../controllers/auth.controller.js';
import { protect } from '../middleware/auth.middleware.js';

import rateLimit from 'express-rate-limit';

const router = express.Router();

// Rate limiting for OTP routes to prevent brute force/spam
const otpLimiter = rateLimit({
    windowMs: 5 * 60 * 1000, // 5 minutes
    max: 5, // Limit each IP to 5 OTP requests per window
    message: {
        status: 'error',
        message: 'Too many OTP attempts. Please try again after 5 minutes.'
    },
    standardHeaders: true,
    legacyHeaders: false,
});

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

router.post('/register', register);
router.post('/verify-otp', verifyRegistrationOTP);
router.post('/login', login);

// 2FA Routes for Creator
router.post('/creator/login', otpLimiter, creatorLogin);
router.post('/creator/verify-otp', otpLimiter, verifyCreatorOTP);
router.post('/google', googleAuth);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);
router.get('/me', protect, getMe);


export default router;
