import mongoose from "mongoose";

export const FREE_CREDITS = Number(process.env.FREE_CREDITS ?? 5);

const userSchema = new mongoose.Schema(
    {
        clerkId: { type: String, required: true, unique: true },
        email: { type: String, default: "", index: true },
        name: { type: String, default: "" },
        photo: { type: String, default: "" },
        credits: { type: Number, default: FREE_CREDITS, min: 0 },
    },
    { timestamps: true }
);

const userModel = mongoose.models.user || mongoose.model("user", userSchema);

export default userModel;
