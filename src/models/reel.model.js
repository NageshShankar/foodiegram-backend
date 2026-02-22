import mongoose from 'mongoose';

const reelSchema = new mongoose.Schema({
    videoUrl: {
        type: String,
        required: [true, 'Please add a video URL'],
    },
    caption: {
        type: String,
        trim: true,
    },
    foodName: {
        type: String,
        trim: true,
    },
    category: {
        type: String,
        trim: true,
    },
    food: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Food',
    },
    prices: {
        zomatoPrice: Number,
        swiggyPrice: Number,
    },
    priceSource: {
        type: String,
        enum: ['MANUAL', 'POS'],
        default: 'MANUAL',
    },
    priceStatus: {
        type: String,
        enum: ['AVAILABLE', 'PENDING'],
        default: 'PENDING',
    },
    creator: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    restaurant: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Restaurant',
    },
    likes: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
        }
    ],
    views: {
        type: Number,
        default: 0,
    },
    cartAdds: {
        type: Number,
        default: 0,
    },
    comments: [
        {
            user: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'User',
            },
            username: String,
            text: {
                type: String,
                required: true,
            },
            createdAt: {
                type: Date,
                default: Date.now,
            },
            replies: [
                {
                    user: {
                        type: mongoose.Schema.Types.ObjectId,
                        ref: 'User',
                    },
                    username: String,
                    displayName: String,
                    text: {
                        type: String,
                        required: true,
                    },
                    createdAt: {
                        type: Date,
                        default: Date.now,
                    },
                }
            ]
        },
    ],
}, {
    timestamps: true,
});

const Reel = mongoose.model('Reel', reelSchema);

export default Reel;
