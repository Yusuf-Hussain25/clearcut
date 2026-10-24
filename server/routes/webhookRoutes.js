import express from "express";
import { verifyWebhook } from "@clerk/express/webhooks";
import userModel from "../models/userModel.js";
import imageModel from "../models/imageModel.js";
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
        if (evt.type === "user.updated") await syncUserProfile(evt.data);
        if (evt.type === "user.deleted" && evt.data.id) {
            await Promise.all([
                userModel.deleteOne({ clerkId: evt.data.id }),
                imageModel.deleteMany({ owner: evt.data.id }),
            ]);
        }
        res.json({ ok: true });
    } catch (error) {
        console.error("Clerk webhook failed:", error);
        res.status(500).json({ error: "Webhook failed" });
    }
});

export default webhookRouter;
