import express from 'express';
import { addToCart, getCart, getCheckoutDetails, updateQuantity, removeItem } from '../controllers/cart.controller.js';
import { protect } from '../middleware/auth.middleware.js';

const router = express.Router();

router.use(protect);

router.post('/add', addToCart);
router.get('/', getCart);
router.get('/checkout', getCheckoutDetails);
router.patch('/update', updateQuantity);
router.delete('/remove', removeItem);

export default router;
