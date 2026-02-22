import mongoose from 'mongoose';

const restaurantPosConnectionSchema = new mongoose.Schema({
    restaurant: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Restaurant',
        required: true,
        unique: true
    },
    posProvider: {
        type: String,
        enum: ['PETPOOJA', 'POSIST'],
        required: true
    },
    apiKey: {
        type: String,
        required: true,
        select: false // Hide by default for security
    },
    isConnected: {
        type: Boolean,
        default: true
    },
    connectedAt: {
        type: Date,
        default: Date.now
    }
}, { timestamps: true });

const RestaurantPosConnection = mongoose.model('RestaurantPosConnection', restaurantPosConnectionSchema);

export default RestaurantPosConnection;
