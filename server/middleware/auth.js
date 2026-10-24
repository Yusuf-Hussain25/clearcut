import { getAuth } from "@clerk/express";
import { ensureUser } from "../lib/users.js";
import { demoEmail } from "../config/env.js";

// Requires a valid Clerk session (verified by clerkMiddleware) and loads the user's record.
// The original API only decoded the JWT without checking its signature, so anyone could
// pick a clerkId and spend another person's credits.
const requireUser = async (req, res, next) => {
    try {
        const { userId } = getAuth(req);
        if (!userId) return res.status(401).json({ error: "Please sign in to continue" });

        req.user = await ensureUser(userId);
        req.isDemo = Boolean(demoEmail()) && req.user.email === demoEmail();
        next();
    } catch (error) {
        next(error);
    }
};

export default requireUser;
