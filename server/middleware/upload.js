import multer from "multer";

export const MAX_UPLOAD_MB = Number(process.env.MAX_UPLOAD_MB || 12);

// Kept in memory: the original stored uploads in temp files that were never deleted.
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: MAX_UPLOAD_MB * 1024 * 1024, files: 1 },
    fileFilter: (req, file, cb) => {
        if (/^image\/(jpeg|png|webp|avif|gif|tiff)$/.test(file.mimetype)) return cb(null, true);
        const err = new Error("Upload a JPG, PNG or WebP image");
        err.status = 400;
        cb(err);
    },
});

export default upload;
