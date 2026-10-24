import { clerkClient } from "@clerk/express";
import { query } from "../config/db.js";

export const FREE_CREDITS = Number(process.env.FREE_CREDITS ?? 5);

export const toUser = (row) =>
    row && {
        clerkId: row.clerk_id,
        email: row.email,
        name: row.name,
        photo: row.photo,
        credits: row.credits,
        createdAt: row.created_at,
    };

export const findUser = async (clerkId) => toUser((await query("SELECT * FROM users WHERE clerk_id = $1", [clerkId])).rows[0]);

const profileFromClerk = (u) => ({
    email: (u.primaryEmailAddress?.emailAddress || u.emailAddresses?.[0]?.emailAddress || "").toLowerCase(),
    name: [u.firstName, u.lastName].filter(Boolean).join(" ") || u.username || "",
    photo: u.imageUrl || "",
});

// Returns the user's record, creating it from their Clerk profile on the first request.
// The Clerk webhook is optional: it only keeps names and photos fresh.
export const ensureUser = async (clerkId) => {
    const existing = await findUser(clerkId);
    if (existing) return existing;

    const p = profileFromClerk(await clerkClient.users.getUser(clerkId));
    // ON CONFLICT so two first requests at once can't fail or create duplicates
    await query(
        `INSERT INTO users (clerk_id, email, name, photo, credits) VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (clerk_id) DO NOTHING`,
        [clerkId, p.email, p.name, p.photo, FREE_CREDITS]
    );
    return findUser(clerkId);
};

export const syncUserProfile = async (clerkUser) => {
    const p = profileFromClerk(clerkUser);
    await query("UPDATE users SET email = $2, name = $3, photo = $4, updated_at = now() WHERE clerk_id = $1", [clerkUser.id, p.email, p.name, p.photo]);
};

// Sets or adds credits and returns the new balance (null if the user doesn't exist)
export const addCredits = async (clerkId, delta) =>
    (await query("UPDATE users SET credits = credits + $2, updated_at = now() WHERE clerk_id = $1 RETURNING credits", [clerkId, delta])).rows[0]?.credits ?? null;
