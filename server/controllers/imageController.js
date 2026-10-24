import { query } from "../config/db.js";
import { addCredits } from "../lib/users.js";
import { removeBackground } from "../lib/providers.js";
import {
    cleanName, finishOutput, prepareInput, serializeImage, isImageId, IMAGE_COLUMNS, FILE_KINDS, verifyFileSignature,
} from "../lib/images.js";

const PAGE_SIZE = 24;

const findOwned = async (req) => {
    if (!isImageId(req.params.id)) return null;
    const { rows } = await query(`SELECT ${IMAGE_COLUMNS} FROM images WHERE id = $1 AND owner = $2`, [req.params.id, req.user.clerkId]);
    return rows[0] || null;
};

// Paging cursor: the exact Postgres timestamp (microseconds) plus the id, so ties never skip rows
const encodeCursor = (row) => Buffer.from(`${row.cursor_ts}|${row.id}`).toString("base64url");
const decodeCursor = (cursor) => {
    try {
        const [ts, id] = Buffer.from(String(cursor), "base64url").toString().split("|");
        return /^\d{4}-\d{2}-\d{2} [\d:.]+[+-]\d{2}(:\d{2})?$/.test(ts || "") && isImageId(id) ? { ts, id } : null;
    } catch {
        return null;
    }
};

// POST /api/images  (multipart, field "image")
// Reserves one credit atomically before the work starts and refunds it if anything fails,
// so two uploads at once can't push the balance below zero.
export const createImage = async (req, res, next) => {
    if (!req.file) return res.status(400).json({ error: "Choose an image to upload" });

    const owner = req.user.clerkId;
    const { rows } = await query(
        "UPDATE users SET credits = credits - 1, updated_at = now() WHERE clerk_id = $1 AND credits > 0 RETURNING credits",
        [owner]
    );
    if (!rows.length) {
        return res.status(402).json({ error: "You're out of credits. Top up to keep going.", code: "NO_CREDITS", credits: 0 });
    }
    const credits = rows[0].credits;

    try {
        const input = await prepareInput(req.file.buffer);
        const { png, provider, durationMs } = await removeBackground(input.buffer, input.mime);
        const { result, thumb } = await finishOutput(png, input.width, input.height);

        const { rows: [image] } = await query(
            `INSERT INTO images (owner, name, width, height, original, original_mime, result, thumb, original_bytes, result_bytes, provider, duration_ms)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
             RETURNING ${IMAGE_COLUMNS}`,
            [owner, cleanName(req.file.originalname), input.width, input.height, input.buffer, input.mime, result, thumb,
                input.buffer.length, result.length, provider, durationMs]
        );

        res.status(201).json({ image: serializeImage(image), credits });
    } catch (error) {
        error.credits = await addCredits(owner, 1).catch(() => undefined);
        next(error);
    }
};

// GET /api/images?cursor=<opaque>&q=<text>&favorites=1
export const listImages = async (req, res, next) => {
    try {
        const owner = req.user.clerkId;

        // Visitors share the demo account: their own uploads are cleared after a day, samples stay
        if (req.isDemo) {
            await query("DELETE FROM images WHERE owner = $1 AND NOT sample AND created_at < now() - interval '24 hours'", [owner]);
        }

        const where = ["owner = $1"];
        const params = [owner];
        const q = String(req.query.q || "").trim().slice(0, 60);
        if (q) {
            params.push(`%${q.replace(/[\\%_]/g, "\\$&")}%`);
            where.push(`name ILIKE $${params.length}`);
        }
        if (req.query.favorites === "1") where.push("favorite");

        const { rows: [{ total }] } = await query(`SELECT count(*) AS total FROM images WHERE ${where.join(" AND ")}`, params);

        const cursor = req.query.cursor ? decodeCursor(req.query.cursor) : null;
        if (cursor) {
            params.push(cursor.ts, cursor.id);
            where.push(`(created_at, id) < ($${params.length - 1}::timestamptz, $${params.length}::uuid)`);
        }
        params.push(PAGE_SIZE + 1);
        const { rows } = await query(
            `SELECT ${IMAGE_COLUMNS}, created_at::text AS cursor_ts FROM images
             WHERE ${where.join(" AND ")} ORDER BY created_at DESC, id DESC LIMIT $${params.length}`,
            params
        );

        const page = rows.slice(0, PAGE_SIZE);
        res.json({
            images: page.map(serializeImage),
            total,
            nextCursor: rows.length > PAGE_SIZE ? encodeCursor(page.at(-1)) : null,
        });
    } catch (error) {
        next(error);
    }
};

export const getImage = async (req, res, next) => {
    try {
        const image = await findOwned(req);
        if (!image) return res.status(404).json({ error: "Image not found" });
        res.json({ image: serializeImage(image) });
    } catch (error) {
        next(error);
    }
};

// PATCH /api/images/:id  { name?, favorite? }
export const updateImage = async (req, res, next) => {
    try {
        const image = await findOwned(req);
        if (!image) return res.status(404).json({ error: "Image not found" });

        const { name, favorite } = req.body || {};
        if (name !== undefined && (typeof name !== "string" || !name.trim())) {
            return res.status(400).json({ error: "Give the image a name" });
        }
        const { rows: [updated] } = await query(
            `UPDATE images SET name = $3, favorite = $4, updated_at = now() WHERE id = $1 AND owner = $2 RETURNING ${IMAGE_COLUMNS}`,
            [image.id, req.user.clerkId, name !== undefined ? cleanName(name) : image.name, favorite !== undefined ? Boolean(favorite) : image.favorite]
        );
        res.json({ image: serializeImage(updated) });
    } catch (error) {
        next(error);
    }
};

export const deleteImage = async (req, res, next) => {
    try {
        const image = await findOwned(req);
        if (!image) return res.status(404).json({ error: "Image not found" });
        if (req.isDemo && image.sample) {
            return res.status(403).json({ error: "Sample images in the demo account can't be deleted. Try it with your own upload." });
        }
        await query("DELETE FROM images WHERE id = $1 AND owner = $2", [image.id, req.user.clerkId]);
        res.json({ ok: true });
    } catch (error) {
        next(error);
    }
};

// GET /api/files/:id/:kind?exp&sig[&download=1]  (signed URL, no session needed)
export const serveFile = async (req, res, next) => {
    try {
        const { id, kind } = req.params;
        const { exp, sig } = req.query;
        if (!FILE_KINDS.includes(kind) || !isImageId(id) || !verifyFileSignature(id, kind, exp, sig)) {
            return res.status(403).json({ error: "This link has expired" });
        }
        // kind is one of the three whitelisted column names, so it's safe to interpolate
        const { rows: [image] } = await query(`SELECT ${kind} AS data, name, original_mime FROM images WHERE id = $1`, [id]);
        if (!image) return res.status(404).json({ error: "Image not found" });

        const type = kind === "original" ? image.original_mime : kind === "thumb" ? "image/webp" : "image/png";
        res.set("Content-Type", type);
        res.set("Cache-Control", `private, max-age=${Math.max(0, Number(exp) - Math.floor(Date.now() / 1000))}`);
        if (req.query.download === "1") {
            const ext = type.split("/")[1].replace("jpeg", "jpg");
            const filename = `${image.name}${kind === "result" ? "-clearcut" : ""}.${ext}`.replace(/["\\]/g, "");
            res.set("Content-Disposition", `attachment; filename="${encodeURIComponent(filename)}"; filename*=UTF-8''${encodeURIComponent(filename)}`);
        }
        res.send(image.data);
    } catch (error) {
        next(error);
    }
};
