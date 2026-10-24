import crypto from "crypto";
import sharp from "sharp";

export class ImageError extends Error {
    constructor(message, status = 400) {
        super(message);
        this.status = status;
    }
}

const MAX_SIDE = Number(process.env.MAX_IMAGE_SIDE || 2048);

// Decodes the upload, applies EXIF rotation and caps the size, so the original and the
// cutout always share the same pixel dimensions (the compare slider relies on it).
export const prepareInput = async (buffer) => {
    let meta;
    try {
        meta = await sharp(buffer).metadata();
    } catch {
        throw new ImageError("That file isn't an image Clearcut can read. Try a JPG, PNG or WebP.");
    }
    if (!meta.width || !meta.height) throw new ImageError("That image looks empty.");
    if (meta.width * meta.height > 60_000_000) throw new ImageError("That image is too large. Keep it under 60 megapixels.");

    const pipeline = sharp(buffer).rotate().resize({ width: MAX_SIDE, height: MAX_SIDE, fit: "inside", withoutEnlargement: true });
    const { data, info } = meta.hasAlpha
        ? await pipeline.png().toBuffer({ resolveWithObject: true })
        : await pipeline.jpeg({ quality: 90, mozjpeg: true }).toBuffer({ resolveWithObject: true });

    return { buffer: data, mime: meta.hasAlpha ? "image/png" : "image/jpeg", width: info.width, height: info.height };
};

// Normalises the engine's PNG to the input size and makes the gallery thumbnail.
export const finishOutput = async (png, width, height) => {
    const result = await sharp(png).resize(width, height, { fit: "fill" }).png({ compressionLevel: 8 }).toBuffer();
    const thumb = await sharp(result).resize(480, 480, { fit: "inside" }).webp({ quality: 78, alphaQuality: 90 }).toBuffer();
    return { result, thumb };
};

// "IMG_2041 (1).jpeg" -> "IMG_2041 (1)"
export const cleanName = (filename = "") => {
    const base = filename.replace(/\.[a-z0-9]{2,5}$/i, "").replace(/[\u0000-\u001f<>]/g, "").trim();
    return (base || "Untitled").slice(0, 120);
};

// Signed, expiring file URLs, so <img src> works without auth headers and links can't be guessed.
const secret = () =>
    process.env.FILE_SIGNING_SECRET ||
    crypto.createHash("sha256").update(`clearcut-files:${process.env.CLERK_SECRET_KEY}`).digest("hex");

const HOUR = 3600;
const sign = (id, kind, exp) => crypto.createHmac("sha256", secret()).update(`${id}:${kind}:${exp}`).digest("base64url");

export const FILE_KINDS = ["original", "result", "thumb"];

export const fileUrl = (id, kind) => {
    // Rounded up to the next hour + 6h, so the same URL is reused (and cached) for a while
    const exp = (Math.ceil(Date.now() / 1000 / HOUR) + 6) * HOUR;
    return `/api/files/${id}/${kind}?exp=${exp}&sig=${sign(id, kind, exp)}`;
};

export const verifyFileSignature = (id, kind, exp, sig) => {
    const expNum = Number(exp);
    if (!FILE_KINDS.includes(kind) || !Number.isFinite(expNum) || expNum * 1000 < Date.now() || typeof sig !== "string") return false;
    const expected = Buffer.from(sign(id, kind, expNum));
    const given = Buffer.from(sig);
    return expected.length === given.length && crypto.timingSafeEqual(expected, given);
};

export const serializeImage = (img) => ({
    id: img._id.toString(),
    name: img.name,
    width: img.width,
    height: img.height,
    originalBytes: img.originalBytes,
    resultBytes: img.resultBytes,
    provider: img.provider,
    durationMs: img.durationMs,
    favorite: img.favorite,
    sample: img.sample,
    createdAt: img.createdAt,
    urls: {
        original: fileUrl(img._id, "original"),
        result: fileUrl(img._id, "result"),
        thumb: fileUrl(img._id, "thumb"),
    },
});
