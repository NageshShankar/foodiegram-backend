import mongoose from 'mongoose';

const cartSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        unique: true,
    },
    items: [
        {
            reelId: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'Reel',
                required: true,
            },
            restaurantId: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'Restaurant',
                required: true,
            },
            foodName: {
                type: String,
                required: true,
            },
            platform: {
                type: String,
                enum: ['ZOMATO', 'SWIGGY'],
                required: true,
            },
            price: {
                type: Number,
                required: true,
            },
            quantity: {
                type: Number,
                default: 1,
                min: 1,
            },
        }
    ],
}, {
    timestamps: true,
});

const Cart = mongoose.model('Cart', cartSchema);

export default Cart;
