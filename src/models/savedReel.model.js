import mongoose from 'mongoose';

const savedReelSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    reelId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Reel',
        required: true,
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
}, {
    timestamps: true,
});

// Prevent duplicate saves
savedReelSchema.index({ userId: 1, reelId: 1 }, { unique: true });

const SavedReel = mongoose.model('SavedReel', savedReelSchema);

export default SavedReel;
