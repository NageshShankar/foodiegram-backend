import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Please add a name'],
    },
    username: {
        type: String,
        unique: true,
        sparse: true, // Allow nulls while maintaining uniqueness for non-null values
    },
    email: {
        type: String,
        required: [true, 'Please add an email'],
    },
    password: {
        type: String,
        required: [true, 'Please add a password'],
        minlength: 6,
        select: false,
    },
    role: {
        type: String,
        enum: ['USER', 'CREATOR'],
        default: 'USER',
    },
    profileImage: {
        type: String,
    },
    bio: {
        type: String,
    },
    restaurant: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Restaurant',
    },
    followersCount: {
        type: Number,
        default: 0,
    },
    followingCount: {
        type: Number,
        default: 0,
    },
    otp: {
        type: String,
        select: false
    },
    otpExpiresAt: {
        type: Date,
        select: false
    },
    isEmailVerified: {
        type: Boolean,
        default: false
    },
    verificationStatus: {
        type: String,
        enum: ['PENDING', 'APPROVED', 'REJECTED'],
        default: 'PENDING'
    },
    isVerified: {
        type: Boolean,
        default: false
    },
    resetPasswordToken: String,
    resetPasswordExpire: Date,
}, {
    timestamps: true,
});

// Ensure email is unique per role
userSchema.index({ email: 1, role: 1 }, { unique: true });

const User = mongoose.model('User', userSchema);

export default User;
