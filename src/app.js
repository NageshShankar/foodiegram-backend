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
app.use(cors());
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
