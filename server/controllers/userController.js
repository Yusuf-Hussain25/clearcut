import imageModel from "../models/imageModel.js";
import transactionModel from "../models/transactionModel.js";
import { describeProvider } from "../lib/providers.js";

const DAY = 24 * 60 * 60 * 1000;

// GET /api/me: balance, profile and usage numbers for the dashboard and billing pages
export const getMe = async (req, res, next) => {
    try {
        const owner = req.user.clerkId;
        const since = new Date(Date.now() - 13 * DAY);
        since.setUTCHours(0, 0, 0, 0);

        const [totals, perDay, purchased] = await Promise.all([
            imageModel.aggregate([
                { $match: { owner } },
                { $group: { _id: null, count: { $sum: 1 }, avgMs: { $avg: "$durationMs" }, favorites: { $sum: { $cond: ["$favorite", 1, 0] } } } },
            ]),
            imageModel.aggregate([
                { $match: { owner, createdAt: { $gte: since } } },
                { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } }, count: { $sum: 1 } } },
            ]),
            transactionModel.aggregate([
                { $match: { owner, status: "paid" } },
                { $group: { _id: null, credits: { $sum: "$credits" }, orders: { $sum: 1 } } },
            ]),
        ]);

        // Fill in empty days so the chart always has 14 bars
        const counts = Object.fromEntries(perDay.map((d) => [d._id, d.count]));
        const last14 = Array.from({ length: 14 }, (_, i) => {
            const day = new Date(since.getTime() + i * DAY).toISOString().slice(0, 10);
            return { day, count: counts[day] || 0 };
        });

        const u = req.user;
        res.json({
            user: { id: u.clerkId, name: u.name, email: u.email, photo: u.photo, credits: u.credits, createdAt: u.createdAt },
            demo: req.isDemo,
            stats: {
                processed: totals[0]?.count || 0,
                favorites: totals[0]?.favorites || 0,
                avgSeconds: totals[0]?.avgMs ? Math.round(totals[0].avgMs / 100) / 10 : null,
                creditsPurchased: purchased[0]?.credits || 0,
                orders: purchased[0]?.orders || 0,
                last14,
            },
            engine: describeProvider(),
        });
    } catch (error) {
        next(error);
    }
};
