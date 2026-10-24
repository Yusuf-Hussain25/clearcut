import express from "express";
import { clerkClient } from "@clerk/express";
import { query } from "../config/db.js";
import { demoEmail } from "../config/env.js";

// "Explore with a demo account": issues a one-time Clerk sign-in ticket for the demo user only.
// The demo password never reaches the browser, and Clerk's new-device check doesn't apply to tickets.
const demoRouter = express.Router();

const WINDOW_MS = 60 * 1000;
const MAX_PER_WINDOW = 10;
const DEMO_MIN_CREDITS = 15; // visitors share the account, so keep it topped up
const hits = new Map(); // ip -> { count, resetAt }
let demoUserId = null;

const rateLimited = (ip) => {
    const now = Date.now();
    const entry = hits.get(ip);
    if (!entry || entry.resetAt < now) {
        hits.set(ip, { count: 1, resetAt: now + WINDOW_MS });
        return false;
    }
    entry.count += 1;
    return entry.count > MAX_PER_WINDOW;
};

demoRouter.post("/session", async (req, res) => {
    const email = demoEmail();
    if (!email) return res.status(404).json({ error: "The demo account is not enabled" });
    if (rateLimited(req.ip)) return res.status(429).json({ error: "Too many demo sign-ins. Try again in a minute." });

    try {
        if (!demoUserId) {
            const { data } = await clerkClient.users.getUserList({ emailAddress: [email] });
            if (!data.length) return res.status(404).json({ error: "Demo account not found. Run npm run seed first." });
            demoUserId = data[0].id;
        }
        await query("UPDATE users SET credits = $2 WHERE clerk_id = $1 AND credits < $2", [demoUserId, DEMO_MIN_CREDITS]);
        const token = await clerkClient.signInTokens.createSignInToken({ userId: demoUserId, expiresInSeconds: 60 });
        res.json({ ticket: token.token });
    } catch (error) {
        demoUserId = null;
        console.error("demo session failed:", error);
        res.status(500).json({ error: "Could not open the demo account" });
    }
});

export default demoRouter;
