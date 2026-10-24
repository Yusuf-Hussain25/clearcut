import { query } from "../config/db.js";
import { describeProvider } from "../lib/providers.js";

// GET /api/me: balance, profile and usage numbers for the dashboard and billing pages
export const getMe = async (req, res, next) => {
    try {
        const owner = req.user.clerkId;

        const [totals, perDay, purchased] = await Promise.all([
            query(
                `SELECT count(*) AS count, avg(duration_ms) AS avg_ms, count(*) FILTER (WHERE favorite) AS favorites
                 FROM images WHERE owner = $1`,
                [owner]
            ),
            // 14 UTC days ending today, including days with no cutouts
            query(
                `SELECT to_char(d, 'YYYY-MM-DD') AS day, count(i.id) AS count
                 FROM generate_series((now() AT TIME ZONE 'UTC')::date - 13, (now() AT TIME ZONE 'UTC')::date, interval '1 day') AS d
                 LEFT JOIN images i ON i.owner = $1 AND (i.created_at AT TIME ZONE 'UTC')::date = d::date
                 GROUP BY d ORDER BY d`,
                [owner]
            ),
            query(
                "SELECT coalesce(sum(credits), 0) AS credits, count(*) AS orders FROM transactions WHERE owner = $1 AND status = 'paid'",
                [owner]
            ),
        ]);

        const t = totals.rows[0];
        const u = req.user;
        res.json({
            user: { id: u.clerkId, name: u.name, email: u.email, photo: u.photo, credits: u.credits, createdAt: u.createdAt },
            demo: req.isDemo,
            stats: {
                processed: t.count,
                favorites: t.favorites,
                avgSeconds: t.avg_ms ? Math.round(Number(t.avg_ms) / 100) / 10 : null,
                creditsPurchased: purchased.rows[0].credits,
                orders: purchased.rows[0].orders,
                last14: perDay.rows,
            },
            engine: describeProvider(),
        });
    } catch (error) {
        next(error);
    }
};
