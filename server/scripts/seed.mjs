// Fills Clearcut with realistic demo data, through the real API (same auth, validation, credits).
// Database writes are used only to grant credits for the uploads and to backdate timestamps.
//
//   npm run seed                          demo account + 3 more customers with libraries
//   npm run seed -- --with you@email.com  also add sample cutouts to your own account
//
// Needs the API running (npm run dev) and CLERK_SECRET_KEY, DEMO_EMAIL, DEMO_PASSWORD and
// SEED_PASSWORD in server/.env. Safe to re-run: accounts and images are reused, never duplicated.
import "dotenv/config";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { createClerkClient } from "@clerk/express";
import { pool, query } from "../config/db.js";
import { FREE_CREDITS } from "../lib/users.js";
import { PLANS, currency } from "../lib/plans.js";

const API = process.env.API_URL || `http://localhost:${process.env.PORT || 4000}`;
const SAMPLES = path.join(path.dirname(fileURLToPath(import.meta.url)), "samples");
const DAY = 24 * 60 * 60 * 1000;

const missing = ["DATABASE_URL", "CLERK_SECRET_KEY", "DEMO_EMAIL", "DEMO_PASSWORD", "SEED_PASSWORD"].filter((k) => !process.env[k]);
if (missing.length) {
    console.error(`Add ${missing.join(", ")} to server/.env first (see .env.example).`);
    process.exit(1);
}

const withIndex = process.argv.indexOf("--with");
const withEmail = withIndex > -1 ? process.argv[withIndex + 1]?.toLowerCase() : null;

const clerk = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });

// [sample file, image name in the library, days ago, favourite]
const DEMO_LIBRARY = [
    ["black-convertible", "corvette-c5-listing", 13.4, false],
    ["porcelain-scent-bottle", "antique-scent-bottle", 12.6, true],
    ["diner-coffee", "menu-coffee-mug", 11.2, false],
    ["gold-chronograph", "gold-chronograph-front", 9.8, true],
    ["black-backpack", "backpack-product-shot", 8.5, false],
    ["portrait-studio", "headshot-final-v2", 7.1, true],
    ["wireless-headphones", "anc-headphones-case", 6.3, false],
    ["tabby-on-wall", "IMG_4821", 5.4, false],
    ["knit-runner", "knit-runner-side", 4.2, true],
    ["peace-lily", "peace-lily-catalog", 3.1, false],
    ["woman-with-terrier", "team-page-hana", 2.3, false],
    ["digital-watch", "f91w-hero", 1.6, true],
    ["studio-headphones", "studio-cans-black", 0.9, false],
    ["green-911", "911-carrera-green", 0.35, true],
    ["white-sneaker", "royal-glide-white", 0.08, false],
];

const PEOPLE = [
    { email: process.env.DEMO_EMAIL.toLowerCase(), password: process.env.DEMO_PASSWORD, first: "Sam", last: "Rivera", portrait: "women/44", demo: true },
    { email: "priya.nair@clearcut-demo.dev", first: "Priya", last: "Nair", portrait: "women/65", files: ["white-sneaker", "knit-runner", "black-backpack"], plan: "starter" },
    { email: "daniel.okafor@clearcut-demo.dev", first: "Daniel", last: "Okafor", portrait: "men/46", files: ["green-911", "black-convertible"] },
    { email: "lena.fischer@clearcut-demo.dev", first: "Lena", last: "Fischer", portrait: "women/12", files: ["peace-lily", "diner-coffee", "porcelain-scent-bottle", "gold-chronograph"], plan: "creator" },
];

const log = (...a) => console.log(" ", ...a);

const ensureClerkUser = async (p) => {
    const { data } = await clerk.users.getUserList({ emailAddress: [p.email] });
    let user = data[0];
    if (!user) {
        user = await clerk.users.createUser({
            emailAddress: [p.email],
            password: p.password || process.env.SEED_PASSWORD,
            firstName: p.first,
            lastName: p.last,
            skipPasswordChecks: true,
        });
        log(`created ${p.email}`);
    }
    if (!user.hasImage && p.portrait) {
        const res = await fetch(`https://randomuser.me/api/portraits/${p.portrait}.jpg`);
        if (res.ok) {
            const file = new Blob([await res.arrayBuffer()], { type: "image/jpeg" });
            user = await clerk.users.updateUserProfileImage(user.id, { file });
        }
    }
    return user;
};

// A fresh session token for the user (they expire after a minute)
const tokenFor = async (userId) => {
    const session = await clerk.sessions.createSession({ userId });
    return async () => (await clerk.sessions.getToken(session.id)).jwt;
};

const api = async (token, method, url, body) => {
    const res = await fetch(API + url, { method, headers: { Authorization: `Bearer ${await token()}` }, body });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(`${method} ${url} -> ${res.status} ${json.error || ""}`);
    return json;
};

const upload = async (token, clerkId, file, name) => {
    await query("UPDATE users SET credits = credits + 1 WHERE clerk_id = $1", [clerkId]); // the seeder pays for its own uploads
    const form = new FormData();
    form.append("image", new Blob([fs.readFileSync(path.join(SAMPLES, `${file}.jpg`))], { type: "image/jpeg" }), `${name}.jpg`);
    const { image } = await api(token, "POST", "/api/images", form);
    return image;
};

// Spread over the day at believable working hours
const at = (daysAgo) => {
    const d = new Date(Date.now() - daysAgo * DAY);
    if (daysAgo >= 1) d.setHours(9 + Math.floor((daysAgo * 7) % 10), Math.floor((daysAgo * 97) % 60));
    return d;
};

const seedLibrary = async (person, clerkId, token, items, { sample }) => {
    let added = 0;
    for (const [file, name, daysAgo, favorite] of items) {
        const { rows } = await query("SELECT 1 FROM images WHERE owner = $1 AND name = $2", [clerkId, name]);
        if (rows.length) continue;
        const image = await upload(token, clerkId, file, name);
        await query("UPDATE images SET created_at = $2, updated_at = $2, favorite = $3, sample = $4 WHERE id = $1", [image.id, at(daysAgo), Boolean(favorite), sample]);
        added += 1;
        process.stdout.write(".");
    }
    if (added) process.stdout.write("\n");
    log(`${person.email}: ${added} new cutouts, ${items.length - added} already there`);
};

// Paid credit packs in the history (recorded as already-verified purchases)
const seedPurchases = async (clerkId, purchases) => {
    for (const [planId, daysAgo, provider] of purchases) {
        const plan = PLANS.find((p) => p.id === planId);
        const ref = `seed_${clerkId}_${planId}_${daysAgo}`;
        const cur = currency();
        await query(
            `INSERT INTO transactions (owner, plan, credits, amount, currency, provider, status, provider_ref, payment_id, paid_at, created_at, updated_at)
             VALUES ($1, $2, $3, $4, $5, $6, 'paid', $7, $8, $9, $9, $9)
             ON CONFLICT (provider, provider_ref) DO NOTHING`,
            [clerkId, plan.name, plan.credits, plan.price[cur], cur, provider, ref, `${ref}_pay`, at(daysAgo)]
        );
    }
};

// Balance = free credits + purchases - cutouts, as if the account had been used normally
const settleCredits = async (clerkId) => {
    const { rows: [r] } = await query(
        `SELECT (SELECT coalesce(sum(credits), 0) FROM transactions WHERE owner = $1 AND status = 'paid') AS bought,
                (SELECT count(*) FROM images WHERE owner = $1) AS used`,
        [clerkId]
    );
    const credits = Math.max(FREE_CREDITS + r.bought - r.used, 3);
    await query("UPDATE users SET credits = $2 WHERE clerk_id = $1", [clerkId, credits]);
    return credits;
};

const main = async () => {
    try {
        await fetch(`${API}/api/health`);
    } catch {
        console.error(`Can't reach the API at ${API}. Start it with "npm run dev" first.`);
        process.exit(1);
    }
    console.log(`Seeding Clearcut through ${API}\n`);

    for (const person of PEOPLE) {
        const user = await ensureClerkUser(person);
        const token = await tokenFor(user.id);
        await api(token, "GET", "/api/me"); // creates the Clearcut record the normal way
        await query("UPDATE users SET photo = $2, created_at = $3 WHERE clerk_id = $1", [user.id, user.imageUrl, at(person.demo ? 21 : 16)]);

        if (person.demo) {
            await seedLibrary(person, user.id, token, DEMO_LIBRARY, { sample: true });
            await seedPurchases(user.id, [["starter", 12.9, "stripe"], ["creator", 4.4, "razorpay"]]);
        } else {
            const items = person.files.map((f, i) => [f, f, 10 - i * 2.7, i === 0]);
            await seedLibrary(person, user.id, token, items, { sample: true });
            if (person.plan) await seedPurchases(user.id, [[person.plan, 7.5, "stripe"]]);
        }
        log(`${person.email}: ${await settleCredits(user.id)} credits`);
    }

    if (withEmail) {
        const { data } = await clerk.users.getUserList({ emailAddress: [withEmail] });
        if (!data.length) {
            console.error(`\nNo Clearcut account for ${withEmail}. Sign up in the app first, then run this again.`);
        } else {
            const token = await tokenFor(data[0].id);
            await api(token, "GET", "/api/me");
            const items = DEMO_LIBRARY.slice(-5).map(([f, n, d, fav]) => [f, n, d, fav]);
            await seedLibrary({ email: withEmail }, data[0].id, token, items, { sample: false });
        }
    }

    console.log(`\nDone. Sign in with "Explore with a demo account" or ${process.env.DEMO_EMAIL} / DEMO_PASSWORD.`);
    await pool.end();
};

main().catch(async (err) => {
    console.error("\nSeeding failed:", err.message);
    await pool.end();
    process.exit(1);
});
