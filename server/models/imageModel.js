import mongoose from "mongoose";

// One processed photo. The binary versions are excluded from queries unless asked for.
const imageSchema = new mongoose.Schema(
    {
        owner: { type: String, required: true, index: true }, // Clerk user id
        name: { type: String, required: true, maxlength: 120 },
        width: { type: Number, required: true },
        height: { type: Number, required: true },
        original: { type: Buffer, required: true, select: false },
        originalMime: { type: String, required: true },
        result: { type: Buffer, required: true, select: false }, // transparent PNG
        thumb: { type: Buffer, required: true, select: false }, // small WebP of the cutout
        originalBytes: { type: Number, required: true },
        resultBytes: { type: Number, required: true },
        provider: { type: String, required: true },
        durationMs: { type: Number, required: true },
        favorite: { type: Boolean, default: false },
        sample: { type: Boolean, default: false }, // seeded demo content
    },
    { timestamps: true }
);

imageSchema.index({ owner: 1, createdAt: -1 });

const imageModel = mongoose.models.image || mongoose.model("image", imageSchema);

export default imageModel;
