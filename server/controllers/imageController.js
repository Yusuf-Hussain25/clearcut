import mongoose from "mongoose";
import imageModel from "../models/imageModel.js";
import userModel from "../models/userModel.js";
import { removeBackground } from "../lib/providers.js";
import { cleanName, finishOutput, prepareInput, serializeImage, FILE_KINDS, verifyFileSignature } from "../lib/images.js";

const PAGE_SIZE = 24;
const DEMO_UPLOAD_TTL_MS = 24 * 60 * 60 * 1000;

const findOwned = (req) => {
    if (!mongoose.isValidObjectId(req.params.id)) return null;
    return imageModel.findOne({ _id: req.params.id, owner: req.user.clerkId });
};

// POST /api/images  (multipart, field "image")
// Reserves one credit atomically before the work starts and refunds it if anything fails,
// so two uploads at once can't push the balance below zero.
export const createImage = async (req, res, next) => {
    if (!req.file) return res.status(400).json({ error: "Choose an image to upload" });

    const owner = req.user.clerkId;
    const reserved = await userModel.findOneAndUpdate(
        { clerkId: owner, credits: { $gt: 0 } },
        { $inc: { credits: -1 } },
        { returnDocument: "after" }
    );
    if (!reserved) {
        return res.status(402).json({ error: "You're out of credits. Top up to keep going.", code: "NO_CREDITS", credits: 0 });
    }

    try {
        const input = await prepareInput(req.file.buffer);
        const { png, provider, durationMs } = await removeBackground(input.buffer, input.mime);
        const { result, thumb } = await finishOutput(png, input.width, input.height);

        const image = await imageModel.create({
            owner,
            name: cleanName(req.file.originalname),
            width: input.width,
            height: input.height,
            original: input.buffer,
            originalMime: input.mime,
            result,
            thumb,
            originalBytes: input.buffer.length,
            resultBytes: result.length,
            provider,
            durationMs,
        });

        res.status(201).json({ image: serializeImage(image), credits: reserved.credits });
    } catch (error) {
        const refunded = await userModel.findOneAndUpdate({ clerkId: owner }, { $inc: { credits: 1 } }, { returnDocument: "after" });
        error.credits = refunded?.credits;
        next(error);
    }
};

// GET /api/images?cursor=<iso date>&q=<text>&favorites=1
export const listImages = async (req, res, next) => {
    try {
        const owner = req.user.clerkId;

        // Visitors share the demo account: their own uploads are cleared after a day, samples stay
        if (req.isDemo) {
            await imageModel.deleteMany({ owner, sample: false, createdAt: { $lt: new Date(Date.now() - DEMO_UPLOAD_TTL_MS) } });
        }

        const filter = { owner };
        const q = String(req.query.q || "").trim().slice(0, 60);
        if (q) filter.name = { $regex: q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), $options: "i" };
        if (req.query.favorites === "1") filter.favorite = true;

        const total = await imageModel.countDocuments(filter);
        const cursor = req.query.cursor ? new Date(req.query.cursor) : null;
        if (cursor && !Number.isNaN(cursor.getTime())) filter.createdAt = { $lt: cursor };

        const docs = await imageModel.find(filter).sort({ createdAt: -1 }).limit(PAGE_SIZE + 1);
        const page = docs.slice(0, PAGE_SIZE);
        res.json({
            images: page.map(serializeImage),
            total,
            nextCursor: docs.length > PAGE_SIZE ? page.at(-1).createdAt.toISOString() : null,
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
        if (name !== undefined) {
            if (typeof name !== "string" || !name.trim()) return res.status(400).json({ error: "Give the image a name" });
            image.name = cleanName(name);
        }
        if (favorite !== undefined) image.favorite = Boolean(favorite);
        await image.save();
        res.json({ image: serializeImage(image) });
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
        await image.deleteOne();
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
        if (!FILE_KINDS.includes(kind) || !mongoose.isValidObjectId(id) || !verifyFileSignature(id, kind, exp, sig)) {
            return res.status(403).json({ error: "This link has expired" });
        }
        const image = await imageModel.findById(id).select(`+${kind} name originalMime`);
        if (!image) return res.status(404).json({ error: "Image not found" });

        const type = kind === "original" ? image.originalMime : kind === "thumb" ? "image/webp" : "image/png";
        res.set("Content-Type", type);
        res.set("Cache-Control", `private, max-age=${Math.max(0, Number(exp) - Math.floor(Date.now() / 1000))}`);
        if (req.query.download === "1") {
            const ext = type.split("/")[1].replace("jpeg", "jpg");
            const filename = `${image.name}${kind === "result" ? "-clearcut" : ""}.${ext}`.replace(/["\\]/g, "");
            res.set("Content-Disposition", `attachment; filename="${encodeURIComponent(filename)}"; filename*=UTF-8''${encodeURIComponent(filename)}`);
        }
        res.send(image[kind]);
    } catch (error) {
        next(error);
    }
};
