import mongoose from 'mongoose';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import User from '../src/models/user.model.js';
import Restaurant from '../src/models/restaurant.model.js';
import Reel from '../src/models/reel.model.js';
import Food from '../src/models/food.model.js';

dotenv.config();

const createTempCreator = async () => {
    try {
        if (!process.env.MONGODB_URI) {
            console.error('MONGODB_URI is not defined in .env');
            process.exit(1);
        }

        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB...');

        const email = 'temp_creator@foodiegram.com';
        const password = 'password123';
        const username = 'temp_creator';

        // 1. Clear existing temp creator if any
        await User.findOneAndDelete({ email });
        console.log('Cleared existing temp creator if any');

        // 2. Hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // 3. Find or create a restaurant that is fully approved
        let restaurant = await Restaurant.findOne({ restaurantName: 'Super Kitchen' });
        if (restaurant) {
            await Reel.deleteMany({ restaurant: restaurant._id });
            await Restaurant.findByIdAndDelete(restaurant._id);
        }

        restaurant = await Restaurant.create({
            restaurantName: 'Super Kitchen',
            name: 'Super Kitchen',
            description: 'A kitchen with all routes accessible.',
            isVerified: true,
            verificationStatus: 'APPROVED',
            setupCompleted: true,
            priceMode: 'MANUAL',
            zomatoLink: 'https://zomato.com',
            swiggyLink: 'https://swiggy.com',
            address: '999 Super Street, Access City',
            contactNumber: '9999999999'
        });
        console.log('Created approved restaurant');

        // 4. Create Creator with all access
        const creator = await User.create({
            name: 'Temp Super Creator',
            username: username,
            email: email,
            password: hashedPassword,
            role: 'CREATOR',
            isEmailVerified: true,
            isVerified: true,
            isAdminVerified: true, // This allows bypassing upload restrictions
            verificationStatus: 'APPROVED',
            restaurant: restaurant._id,
            bio: 'I have access to every route! 🚀'
        });
        console.log('Created super creator with full access');

        // 5. Upload 3 reels for this creator
        const reelsData = [
            {
                foodName: "Spiced Shawarma Wrap",
                category: "Fast Food",
                caption: "Access all routes with this spicy wrap! 🌯 #access #shawarma",
                videoUrl: "/uploads/reels/1770700511614-shawrmavdieo.mp4"
            },
            {
                foodName: "Aromatic Hyderabadi Biryani",
                category: "Main Course",
                caption: "King of Biryanis for the King of Creators! 🍛 #biryani #royal",
                videoUrl: "/uploads/reels/1770685331430-biryani video.mp4"
            },
            {
                foodName: "Healthy Veggie Roll",
                category: "Healthy",
                caption: "Stay fit while creating! 🥗 #healthy #roll",
                videoUrl: "/uploads/reels/1770885704161-bottlewrap vdieo.mp4"
            }
        ];

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
                    zomatoPrice: 150,
                    swiggyPrice: 140
                },
                priceSource: 'MANUAL',
                priceStatus: 'AVAILABLE',
                creator: creator._id,
                restaurant: restaurant._id
            });
            console.log(`Uploaded reel: ${data.foodName}`);
        }

        console.log('-----------------------------------------');
        console.log('TEMP CREATOR CREDENTIALS:');
        console.log(`Email: ${email}`);
        console.log(`Username: ${username}`);
        console.log(`Password: ${password}`);
        console.log('-----------------------------------------');

        process.exit(0);
    } catch (error) {
        console.error('Error setting up temp creator:', error);
        process.exit(1);
    }
};

createTempCreator();
