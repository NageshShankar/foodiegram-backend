import mongoose from 'mongoose';

const restaurantPosSchema = new mongoose.Schema({
    restaurant: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Restaurant',
        required: true,
    },
    posProvider: {
        type: String,
        enum: ['PETPOOJA', 'POSIST'],
        required: true,
    },
    accessToken: {
        type: String,
    },
    apiKey: {
        type: String,
    },
}, {
    timestamps: true,
});

const RestaurantPos = mongoose.model('RestaurantPos', restaurantPosSchema);

export default RestaurantPos;
