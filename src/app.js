import path from 'path';
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/auth.routes.js';
import reelRoutes from './routes/reel.routes.js';
import searchRoutes from './routes/search.routes.js';
import cartRoutes from './routes/cart.routes.js';
import restaurantRoutes from './routes/restaurant.routes.js';
import creatorRoutes from './routes/creator.routes.js';
import followRoutes from './routes/follow.routes.js';
import restaurantVerificationRoutes from './routes/restaurant.verification.routes.js';
import posRoutes from './routes/pos.routes.js';
import adminRoutes from './routes/admin.routes.js';

dotenv.config();

const app = express();
const __dirname = path.resolve();

// Middleware
const allowedOrigins = [
    'http://localhost:3000',
    'http://localhost:3001',
    process.env.FRONTEND_URL,
    'https://foodiegram-frontend.vercel.app',
    'https://foodiegram.vercel.app'
].filter(Boolean);

app.use(cors({
    origin: function (origin, callback) {
        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin) return callback(null, true);

        // Check if origin is in the allowed list or is a localhost/127.0.0.1 origin
        const isAllowed = allowedOrigins.includes(origin) ||
            origin.includes('localhost') ||
            origin.includes('127.0.0.1') ||
            origin.includes('.loca.lt'); // LocalTunnel support

        if (isAllowed) {
            callback(null, true);
        } else {
            console.log(`[CORS] Rejected origin: ${origin}`);
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin']
}));
app.use(express.json());

// Request logger for debugging
app.use((req, res, next) => {
    console.log(`${req.method} ${req.url}`, req.body);
    next();
});

// Serve static files
app.use('/uploads', express.static(path.join(__dirname, 'src/uploads')));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/reels', reelRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/cart', cartRoutes);
// app.use('/api/restaurants/verify', restaurantVerificationRoutes); // DISABLED - Using new creator flow
app.use('/api/restaurants', restaurantRoutes);
app.use('/api/creators', creatorRoutes);
app.use('/api/creator', creatorRoutes);
app.use('/api', followRoutes);
app.use('/api/pos', posRoutes);
app.use('/api/admin', adminRoutes);

// Health Check API
app.get('/health', (req, res) => {
    res.json({
        status: 'success',
        message: 'Foodiegram API is healthy and running'
    });
});

export default app;
