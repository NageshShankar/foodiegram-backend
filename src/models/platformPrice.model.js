import mongoose from 'mongoose';

const platformPriceSchema = new mongoose.Schema({
    food: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Food',
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
    redirectUrl: {
        type: String,
        required: true,
    },
    source: {
        type: String,
        enum: ['MANUAL', 'POS'],
        default: 'MANUAL',
    },
}, {
    timestamps: true,
});

const PlatformPrice = mongoose.model('PlatformPrice', platformPriceSchema);

export default PlatformPrice;
