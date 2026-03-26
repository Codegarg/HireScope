import 'dotenv/config';
import mongoose from 'mongoose';

async function testConnection() {
  console.log("Attempting to connect to MongoDB...");
  console.log("URI:", process.env.MONGO_URI);
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 5000,
    });
    console.log("✅ MongoDB connection successful!");
    process.exit(0);
  } catch (error) {
    console.error("❌ MongoDB connection failed!");
    console.error("Error Name:", error.name);
    console.error("Error Message:", error.message);
    process.exit(1);
  }
}

testConnection();
