import { clerkClient } from "@clerk/express";
import userModel from "../models/userModel.js";

const profileFromClerk = (u) => ({
    email: (u.primaryEmailAddress?.emailAddress || u.emailAddresses?.[0]?.emailAddress || "").toLowerCase(),
    name: [u.firstName, u.lastName].filter(Boolean).join(" ") || u.username || "",
    photo: u.imageUrl || "",
});

// Returns the user's record, creating it from their Clerk profile on the first request.
// The Clerk webhook is optional: it only keeps names and photos fresh.
export const ensureUser = async (clerkId) => {
    const existing = await userModel.findOne({ clerkId });
    if (existing) return existing;

    const clerkUser = await clerkClient.users.getUser(clerkId);
    // Upsert so two first requests at once can't create duplicates
    return userModel.findOneAndUpdate(
        { clerkId },
        { $setOnInsert: { clerkId, ...profileFromClerk(clerkUser) } },
        { upsert: true, returnDocument: "after" }
    );
};

export const syncUserProfile = async (clerkUser) => {
    await userModel.updateOne({ clerkId: clerkUser.id }, { $set: profileFromClerk(clerkUser) });
};
