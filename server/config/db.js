import mongoose from "mongoose";

// MONGODB_URI is the server address without a database name; data lives in DB_NAME ("clearcut").
const connectDB = async () => {
    const uri = process.env.MONGODB_URI;
    mongoose.connection.on("connected", () => console.log("Database connected"));
    mongoose.connection.on("error", (err) => console.error("Database error:", err.message));
    await mongoose.connect(uri, { dbName: process.env.DB_NAME || "clearcut", serverSelectionTimeoutMS: 8000 });
};

export default connectDB;
