import mongoose from 'mongoose';

const followSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    restaurantId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Restaurant',
        required: true,
    },
}, {
    timestamps: true,
});

// Prevent duplicate follows
followSchema.index({ userId: 1, restaurantId: 1 }, { unique: true });

const Follow = mongoose.model('Follow', followSchema);

export default Follow;
