import express from 'express';
import { addToCart, getCart, getCheckoutDetails, updateQuantity, removeItem } from '../controllers/cart.controller.js';
import { protect } from '../middleware/auth.middleware.js';

const router = express.Router();

router.post('/add', protect, addToCart);
router.get('/', protect, getCart);
router.get('/checkout', protect, getCheckoutDetails);
router.patch('/update', protect, updateQuantity);
router.delete('/remove', protect, removeItem);

export default router;
