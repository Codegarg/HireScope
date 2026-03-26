import 'dotenv/config';
import mongoose from 'mongoose';
import User from './src/models/user.model.js';

async function checkUsers() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        const count = await User.countDocuments();
        console.log(`Total active users in DB: ${count}`);
        
        if (count > 0) {
            const users = await User.find({}, 'email username').limit(5);
            console.log("Recent users:");
            users.forEach(u => console.log(`- ${u.email} (${u.username})`));
        } else {
            console.log("No users found in the database. You might need to sign up first!");
        }
        
        process.exit(0);
    } catch (err) {
        console.error("Failed to check users:", err);
        process.exit(1);
    }
}

checkUsers();
