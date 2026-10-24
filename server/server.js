import "dotenv/config";
import express from "express";
import cors from "cors";
import { clerkMiddleware } from "@clerk/express";
import { checkEnv, origins } from "./config/env.js";
import connectDB from "./config/db.js";
import { describeProvider, warmUp } from "./lib/providers.js";
import { serveFile } from "./controllers/imageController.js";
import userRouter from "./routes/userRoutes.js";
import imageRouter from "./routes/imageRoutes.js";
import { MAX_UPLOAD_MB } from "./middleware/upload.js";

checkEnv();

const PORT = process.env.PORT || 4000;
const app = express();
app.set("trust proxy", 1);

app.use(cors({ origin: origins(), credentials: true }));
app.use(express.json({ limit: "100kb" }));
app.use(clerkMiddleware());

app.get("/", (req, res) => res.send("Clearcut API"));
app.get("/api/health", (req, res) => res.json({ ok: true, engine: describeProvider(), maxUploadMb: MAX_UPLOAD_MB }));

app.get("/api/files/:id/:kind", serveFile);
app.use("/api/me", userRouter);
app.use("/api/images", imageRouter);

app.use((req, res) => res.status(404).json({ error: "Not found" }));

// Expected errors (bad upload, engine busy) carry a status and a message meant for people
app.use((err, req, res, next) => { // eslint-disable-line no-unused-vars
    const status = err.code === "LIMIT_FILE_SIZE" ? 413 : err.status || 500;
    const message =
        err.code === "LIMIT_FILE_SIZE" ? `That image is over ${MAX_UPLOAD_MB} MB` :
        status < 500 || err.status ? err.message : "Something went wrong on our side";
    if (status >= 500) console.error(err);
    res.status(status).json({ error: message, ...(err.credits !== undefined && { credits: err.credits }) });
});

await connectDB();
app.listen(PORT, () => {
    console.log(`Clearcut API on http://localhost:${PORT} (engine: ${describeProvider().name})`);
    warmUp();
});
