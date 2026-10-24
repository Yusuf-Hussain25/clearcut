// Fails fast with a readable message when server/.env is missing required values.
const REQUIRED = {
    MONGODB_URI: "MongoDB server, e.g. mongodb://127.0.0.1:27017",
    CLERK_PUBLISHABLE_KEY: "Clerk -> Configure -> API keys -> Publishable key",
    CLERK_SECRET_KEY: "Clerk -> Configure -> API keys -> Secret key",
};

export const checkEnv = () => {
    const missing = Object.keys(REQUIRED).filter((key) => !process.env[key]?.trim());
    if (!missing.length) return;
    console.error("\nClearcut API can't start. Add these to server/.env (see server/.env.example):\n");
    for (const key of missing) console.error(`  ${key.padEnd(24)} ${REQUIRED[key]}`);
    console.error("");
    process.exit(1);
};

export const origins = () =>
    (process.env.ORIGINS || "http://localhost:5173").split(",").map((o) => o.trim()).filter(Boolean);

// Where Stripe sends people back after checkout
export const appUrl = () => (process.env.APP_URL || origins()[0]).replace(/\/$/, "");

export const demoEmail = () => process.env.DEMO_EMAIL?.trim().toLowerCase() || null;
