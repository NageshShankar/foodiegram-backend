import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../src/models/user.model.js';
import Restaurant from '../src/models/restaurant.model.js';
import Follow from '../src/models/follow.model.js';

dotenv.config();

const seedFollows = async () => {
    try {
        if (!process.env.MONGODB_URI) {
            console.error('MONGODB_URI is not defined in .env');
            process.exit(1);
        }

        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB...');

        // 1. Find the target creator (the one we created earlier)
        const creator = await User.findOne({ email: 'temp_creator@foodiegram.com' });
        if (!creator || !creator.restaurant) {
            console.error('Temp creator or restaurant not found. Please run setup_temp_creator.js first.');
            process.exit(1);
        }

        const restaurantId = creator.restaurant;

        // 2. Create some dummy users to follow this creator's restaurant
        const dummyUserEmails = [
            'user1@example.com', 'user2@example.com', 'user3@example.com',
            'user4@example.com', 'user5@example.com'
        ];

        console.log('Generating followers...');
        for (const email of dummyUserEmails) {
            let user = await User.findOne({ email });
            if (!user) {
                user = await User.create({
                    name: email.split('@')[0],
                    username: email.split('@')[0],
                    email: email,
                    password: 'password123',
                    role: 'USER',
                    isEmailVerified: true
                });
            }

            // Make them follow the restaurant
            try {
                await Follow.create({
                    userId: user._id,
                    restaurantId: restaurantId
                });
            } catch (err) {
                // Skip if already following
            }
        }

        // 3. Update the followersCount on the User model for the creator
        const count = await Follow.countDocuments({ restaurantId });
        creator.followersCount = count;
        await creator.save();

        // 4. Make the creator follow a few other restaurants (if any exist)
        const otherRestaurants = await Restaurant.find({ _id: { $ne: restaurantId } }).limit(3);
        console.log(`Making creator follow ${otherRestaurants.length} other restaurants...`);

        for (const rest of otherRestaurants) {
            try {
                await Follow.create({
                    userId: creator._id,
                    restaurantId: rest._id
                });
            } catch (err) {
                // Skip
            }
        }

        // Update following count (count how many restaurants THIS creator is following)
        const followingCount = await Follow.countDocuments({ userId: creator._id });
        creator.followingCount = followingCount;
        await creator.save();

        console.log('Followers and Following seeded successfully!');
        console.log(`Creator: ${creator.username}`);
        console.log(`Followers: ${creator.followersCount}`);
        console.log(`Following: ${creator.followingCount}`);

        process.exit(0);
    } catch (error) {
        console.error('Error seeding follows:', error);
        process.exit(1);
    }
};

seedFollows();
