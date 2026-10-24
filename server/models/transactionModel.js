import mongoose from "mongoose";

// A credit pack purchase. Credits are added once, when the payment is verified with the provider.
const transactionSchema = new mongoose.Schema(
    {
        owner: { type: String, required: true, index: true }, // Clerk user id
        plan: { type: String, required: true },
        credits: { type: Number, required: true },
        amount: { type: Number, required: true }, // minor units (cents, paise)
        currency: { type: String, required: true },
        provider: { type: String, enum: ["stripe", "razorpay", "seed"], required: true },
        status: { type: String, enum: ["pending", "paid", "failed"], default: "pending" },
        providerRef: { type: String, index: true }, // Stripe session id / Razorpay order id
        paymentId: { type: String },
        paidAt: { type: Date },
    },
    { timestamps: true }
);

const transactionModel = mongoose.models.transaction || mongoose.model("transaction", transactionSchema);

export default transactionModel;
