import mongoose from 'mongoose';

const foodSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Please add a food name'],
        trim: true,
    },
    category: {
        type: String,
        trim: true,
    },
    price: {
        type: Number,
    },
    restaurant: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Restaurant',
        required: true,
    },
}, {
    timestamps: true,
});

const Food = mongoose.model('Food', foodSchema);

export default Food;
