import mongoose from 'mongoose';

const restaurantSchema = new mongoose.Schema({
    restaurantName: {
        type: String,
        trim: true,
    },
    name: {
        type: String,
        trim: true,
    },
    description: {
        type: String,
    },
    ambienceImages: {
        type: [String],
        default: [],
    },
    menuImages: {
        type: [String],
        default: [],
    },
    isVerified: {
        type: Boolean,
        default: false,
    },
    rating: {
        type: Number,
        default: 0,
        min: 0,
        max: 5,
    },
    isSponsored: {
        type: Boolean,
        default: false,
    },
    platforms: [
        {
            platform: {
                type: String,
                enum: ['ZOMATO', 'SWIGGY'],
            },
            redirectUrl: {
                type: String,
            },
        }
    ],
    sponsoredFrom: {
        type: Date,
    },
    sponsoredTill: {
        type: Date,
    },
    totalViews: {
        type: Number,
        default: 0,
    },
    totalCartAdds: {
        type: Number,
        default: 0,
    },
    zomatoClicks: {
        type: Number,
        default: 0,
    },
    swiggyClicks: {
        type: Number,
        default: 0,
    },
    gstNumber: {
        type: String,
        unique: true,
        sparse: true,
        maxlength: 15,
    },
    restaurantPhoto: {
        type: String,
    },
    zomatoLink: {
        type: String,
    },
    swiggyLink: {
        type: String,
    },
    verificationStatus: {
        type: String,
        enum: ['PENDING', 'APPROVED', 'REJECTED', 'VERIFIED', 'VERIFIED_LIMITED'],
        default: 'PENDING',
    },
    verificationSubmittedAt: {
        type: Date,
    },
    verifiedAt: {
        type: Date,
    },
    verifiedBy: {
        type: String,
    },
    priceMode: {
        type: String,
        enum: ['POS', 'MANUAL'],
    },
    posProvider: {
        type: String, // Petpooja, Posist, Other
    },
    address: {
        type: String,
    },
    contactNumber: {
        type: String,
    },
    setupCompleted: {
        type: Boolean,
        default: false,
    },
    posConnected: {
        type: Boolean,
        default: false,
    },
}, {
    timestamps: true,
});

const Restaurant = mongoose.model('Restaurant', restaurantSchema);

export default Restaurant;
