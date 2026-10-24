import express from "express";
import { clerkClient } from "@clerk/express";
import { verifyWebhook } from "@clerk/express/webhooks";
import { query } from "../config/db.js";
import { ensureUser, syncUserProfile } from "../lib/users.js";

// Optional Clerk webhook (CLERK_WEBHOOK_SIGNING_SECRET). Users are also created on their first
// API request, so this only keeps profiles fresh and removes data for deleted accounts.
// The original verified a re-serialised JSON body, which breaks Svix signatures; this uses the raw body.
const webhookRouter = express.Router();

webhookRouter.post("/clerk", express.raw({ type: "application/json" }), async (req, res) => {
    if (!process.env.CLERK_WEBHOOK_SIGNING_SECRET) return res.status(404).json({ error: "Webhook not configured" });

    let evt;
    try {
        evt = await verifyWebhook(req);
    } catch {
        return res.status(400).json({ error: "Invalid signature" });
    }

    try {
        if (evt.type === "user.created") await ensureUser(evt.data.id);
        // The payload is raw snake_case JSON; fetch the user so the profile mapping is the same everywhere
        if (evt.type === "user.updated") await syncUserProfile(await clerkClient.users.getUser(evt.data.id));
        // Images and purchases go with the user (ON DELETE CASCADE)
        if (evt.type === "user.deleted" && evt.data.id) await query("DELETE FROM users WHERE clerk_id = $1", [evt.data.id]);
        res.json({ ok: true });
    } catch (error) {
        console.error("Clerk webhook failed:", error);
        res.status(500).json({ error: "Webhook failed" });
    }
});

export default webhookRouter;
