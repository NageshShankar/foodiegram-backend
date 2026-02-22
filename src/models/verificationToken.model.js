import mongoose from 'mongoose';
import crypto from 'crypto';

const verificationTokenSchema = new mongoose.Schema({
    restaurantId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Restaurant',
        required: true,
    },
    token: {
        type: String,
        required: true,
        unique: true,
    },
    expiresAt: {
        type: Date,
        required: true,
        default: () => new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
        index: { expires: 0 } // TTL index
    },
    used: {
        type: Boolean,
        default: false,
    },
    createdAt: {
        type: Date,
        default: Date.now,
    }
}, {
    timestamps: true,
});

// Method to generate a random token
verificationTokenSchema.statics.generateToken = function () {
    return crypto.randomBytes(32).toString('hex');
};

const VerificationToken = mongoose.model('VerificationToken', verificationTokenSchema);

export default VerificationToken;
