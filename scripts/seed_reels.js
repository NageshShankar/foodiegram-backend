import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../src/models/user.model.js';
import Restaurant from '../src/models/restaurant.model.js';
import Reel from '../src/models/reel.model.js';
import Food from '../src/models/food.model.js';

dotenv.config();

const seedReels = async () => {
    try {
        if (!process.env.MONGODB_URI) {
            console.error('MONGODB_URI is not defined in .env');
            process.exit(1);
        }

        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB for seeding...');

        // 1. Find or create a creator
        let creator = await User.findOne({ role: 'CREATOR' });
        if (!creator) {
            creator = await User.create({
                name: 'Foodie Creator',
                username: 'foodie_creator',
                email: 'creator@foodiegram.com',
                password: 'password123',
                role: 'CREATOR',
                isEmailVerified: true,
                verificationStatus: 'APPROVED',
                bio: 'Food enthusiast and digital creator 📸'
            });
            console.log('Created seed creator');
        }

        // 2. Find or create a restaurant
        let restaurant = await Restaurant.findOne();
        if (!restaurant) {
            restaurant = await Restaurant.create({
                restaurantName: 'Gourmet Kitchen',
                name: 'Gourmet Kitchen',
                description: 'The best gourmet food in the city.',
                isVerified: true,
                verificationStatus: 'APPROVED',
                setupCompleted: true,
                priceMode: 'MANUAL',
                zomatoLink: 'https://zomato.com',
                swiggyLink: 'https://swiggy.com',
                address: '123 Food Street, Tasty City',
                contactNumber: '1234567890'
            });
            console.log('Created seed restaurant');
        }

        // Link creator to restaurant if not already
        if (!creator.restaurant) {
            creator.restaurant = restaurant._id;
            await creator.save();
        }

        // Clear existing reels to avoid broken links
        await Reel.deleteMany({});
        console.log('Cleared existing reels');

        const reelsData = [
            {
                foodName: "Special Chicken Biryani",
                category: "Main Course",
                caption: "Aromatic and flavorful chicken biryani! 🍛 #biryani #indianfood",
                videoUrl: "/uploads/reels/1770685331430-biryani video.mp4",
                zomatoPrice: 249,
                swiggyPrice: 229
            },
            {
                foodName: "Classic Chicken Shawarma",
                category: "Fast Food",
                caption: "Deliciously wrapped chicken shawarma. 🌯 #shawarma #streetfood",
                videoUrl: "/uploads/reels/1770700511614-shawrmavdieo.mp4",
                zomatoPrice: 120,
                swiggyPrice: 110
            },
            {
                foodName: "Grilled Bottle Wrap",
                category: "Healthy",
                caption: "Fresh and healthy grilled vegetable wrap. 🥗 #wrap #healthy",
                videoUrl: "/uploads/reels/1770885704161-bottlewrap vdieo.mp4",
                zomatoPrice: 180,
                swiggyPrice: 170
            },
            {
                foodName: "Mutton Biryani",
                category: "Main Course",
                caption: "Rich and spicy mutton biryani. 🍛 #mutton #biryani",
                videoUrl: "/uploads/reels/1771533214784-biryani video.mp4",
                zomatoPrice: 349,
                swiggyPrice: 329
            }
        ];
        console.log('Adding reels...');
        for (const data of reelsData) {
            // Find or create food
            let food = await Food.findOne({ name: data.foodName, restaurant: restaurant._id });
            if (!food) {
                food = await Food.create({
                    name: data.foodName,
                    category: data.category,
                    restaurant: restaurant._id
                });
            }

            await Reel.create({
                videoUrl: data.videoUrl,
                caption: data.caption,
                foodName: data.foodName,
                category: data.category,
                food: food._id,
                prices: {
                    zomatoPrice: data.zomatoPrice,
                    swiggyPrice: data.swiggyPrice
                },
                priceSource: 'MANUAL',
                priceStatus: 'AVAILABLE',
                creator: creator._id,
                restaurant: restaurant._id
            });
            console.log(`Seeded reel: ${data.foodName}`);
        }

        console.log('Seeding completed successfully!');
        process.exit(0);
    } catch (error) {
        console.error('Error seeding reels:', error);
        process.exit(1);
    }
};

seedReels();
