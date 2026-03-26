import mongoose from "mongoose";

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 10000,
    });
    console.log("MongoDB connected");
  } catch (error) {
    console.error("❌ MongoDB connection failed!");
    console.error("Error Message:", error.message);
    
    if (error.message.includes("ETIMEDOUT") || error.message.includes("IP")) {
      console.error("--------------------------------------------------");
      console.error("TIP: This usually means your IP is NOT whitelisted.");
      console.error("Please ensure your current public IP is added to the");
      console.error("MongoDB Atlas 'Network Access' settings.");
      console.error("--------------------------------------------------");
    }
    throw error;
  }
};

export default connectDB;
