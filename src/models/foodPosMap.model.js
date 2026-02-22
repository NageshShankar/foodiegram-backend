import mongoose from 'mongoose';

const foodPosMapSchema = new mongoose.Schema({
    food: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Food',
        required: true,
    },
    posItemId: {
        type: String,
        required: true,
    },
    posProvider: {
        type: String,
        enum: ['PETPOOJA', 'POSIST'],
        required: true,
    },
    restaurant: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Restaurant',
        required: true,
    },
}, {
    timestamps: true,
});

// Ensure one mapping per food per restaurant
foodPosMapSchema.index({ restaurant: 1, food: 1 }, { unique: true });
// Ensure one POS item only mapped once per restaurant
foodPosMapSchema.index({ restaurant: 1, posItemId: 1 }, { unique: true });

const FoodPosMap = mongoose.model('FoodPosMap', foodPosMapSchema);

export default FoodPosMap;
