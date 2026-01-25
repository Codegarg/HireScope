import dotenv from "dotenv";
import app from "./app.js";
import connectDB from "./config/db.js";
import passport from "passport";
import "./config/passport.js";

// Load environment variables
dotenv.config();

// Connect to MongoDB
connectDB();

// Initialize Passport (for OAuth)
app.use(passport.initialize());

// Start server
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
