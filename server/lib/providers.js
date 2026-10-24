// Background removal engines. Pick one with BG_PROVIDER:
//   local    (default) IMG.LY's open-source model running inside this server. Free, no key, no limits.
//   clipdrop ClipDrop API (CLIPDROP_API_KEY). Best edges on hair and fur, paid credits after the trial.
//   removebg remove.bg API (REMOVE_BG_API_KEY). 50 free previews a month.
// Every engine takes an image buffer and resolves to a transparent PNG buffer.

export class ProviderError extends Error {
    constructor(message, status = 502) {
        super(message);
        this.status = status;
    }
}

const readError = async (res) => {
    try {
        const body = await res.json();
        return body.error || body.errors?.[0]?.title || `HTTP ${res.status}`;
    } catch {
        return `HTTP ${res.status}`;
    }
};

const local = {
    label: "Clearcut on-device model",
    configured: () => true,
    run: async (buffer, mime) => {
        const { removeBackground } = await import("@imgly/background-removal-node");
        const blob = await removeBackground(new Blob([buffer], { type: mime }), {
            model: process.env.LOCAL_MODEL === "small" ? "small" : "medium",
            output: { format: "image/png" },
        });
        return Buffer.from(await blob.arrayBuffer());
    },
};

const clipdrop = {
    label: "ClipDrop",
    configured: () => Boolean(process.env.CLIPDROP_API_KEY),
    run: async (buffer, mime) => {
        const form = new FormData();
        form.append("image_file", new Blob([buffer], { type: mime }), "image");
        const res = await fetch("https://clipdrop-api.co/remove-background/v1", {
            method: "POST",
            headers: { "x-api-key": process.env.CLIPDROP_API_KEY },
            body: form,
            signal: AbortSignal.timeout(60_000),
        });
        if (res.status === 402) throw new ProviderError("The ClipDrop account is out of credits", 503);
        if (!res.ok) throw new ProviderError(`ClipDrop: ${await readError(res)}`);
        return Buffer.from(await res.arrayBuffer());
    },
};

const removebg = {
    label: "remove.bg",
    configured: () => Boolean(process.env.REMOVE_BG_API_KEY),
    run: async (buffer, mime) => {
        const form = new FormData();
        form.append("image_file", new Blob([buffer], { type: mime }), "image");
        form.append("size", "auto");
        form.append("format", "png");
        const res = await fetch("https://api.remove.bg/v1.0/removebg", {
            method: "POST",
            headers: { "X-Api-Key": process.env.REMOVE_BG_API_KEY },
            body: form,
            signal: AbortSignal.timeout(60_000),
        });
        if (res.status === 402) throw new ProviderError("The remove.bg account is out of credits", 503);
        if (!res.ok) throw new ProviderError(`remove.bg: ${await readError(res)}`);
        return Buffer.from(await res.arrayBuffer());
    },
};

const PROVIDERS = { local, clipdrop, removebg };

export const providerName = () => {
    const name = (process.env.BG_PROVIDER || "local").trim().toLowerCase();
    return PROVIDERS[name] ? name : "local";
};

export const describeProvider = () => {
    const name = providerName();
    return { name, label: PROVIDERS[name].label, configured: PROVIDERS[name].configured() };
};

// Runs a few jobs at a time so a burst of uploads can't exhaust memory on the local model.
const MAX_ACTIVE = Number(process.env.BG_CONCURRENCY || 2);
const MAX_QUEUED = 25;
let active = 0;
const waiting = [];

const acquire = () => {
    if (active < MAX_ACTIVE) {
        active += 1;
        return Promise.resolve();
    }
    if (waiting.length >= MAX_QUEUED) {
        return Promise.reject(new ProviderError("Clearcut is busy right now. Try again in a moment.", 503));
    }
    return new Promise((resolve) => waiting.push(resolve));
};

const release = () => {
    const next = waiting.shift();
    if (next) next();
    else active -= 1;
};

export const removeBackground = async (buffer, mime) => {
    const name = providerName();
    const provider = PROVIDERS[name];
    if (!provider.configured()) {
        throw new ProviderError(`BG_PROVIDER is "${name}" but its API key is missing in server/.env`, 503);
    }
    await acquire();
    const started = Date.now();
    try {
        const png = await provider.run(buffer, mime);
        return { png, provider: name, durationMs: Date.now() - started };
    } finally {
        release();
    }
};

// Loads the local model ahead of the first upload so nobody waits for the cold start.
export const warmUp = async () => {
    if (providerName() !== "local") return;
    try {
        const sharp = (await import("sharp")).default;
        const dot = await sharp({ create: { width: 64, height: 64, channels: 3, background: "#888" } }).png().toBuffer();
        await local.run(dot, "image/png");
        console.log("Background model ready");
    } catch (err) {
        console.error("Background model warm-up failed:", err.message);
    }
};
