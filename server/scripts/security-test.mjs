// Security test for the Clearcut API with real Clerk sessions.
// Creates two throwaway users, checks who can see, change and pay for what, then deletes them.
// Usage: npm run test:security   (API running on API_URL, default http://localhost:4000)
import "dotenv/config";
import sharp from "sharp";
import { createClerkClient } from "@clerk/express";
import { pool, query } from "../config/db.js";

const API = process.env.API_URL || `http://localhost:${process.env.PORT || 4000}`;
const clerk = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });

let passed = 0;
let failed = 0;
const check = (name, ok, detail = "") => {
    if (ok) passed += 1;
    else failed += 1;
    console.log(`${ok ? "  ✓" : "  ✗"} ${name}${!ok && detail ? `  (${detail})` : ""}`);
};

const makeUser = async (tag) => {
    const email = `sec-${tag}-${Date.now()}@clearcut-demo.dev`;
    const u = await clerk.users.createUser({
        emailAddress: [email],
        password: `Sec!${Date.now()}xYz${tag}`,
        firstName: "Security",
        lastName: tag,
        skipPasswordChecks: true,
    });
    const s = await clerk.sessions.createSession({ userId: u.id });
    const token = async () => (await clerk.sessions.getToken(s.id)).jwt;
    return { id: u.id, token };
};

const call = async (user, method, url, body) => {
    const headers = {};
    if (user) headers.Authorization = `Bearer ${typeof user === "string" ? user : await user.token()}`;
    let payload = body;
    if (body && !(body instanceof FormData)) {
        headers["Content-Type"] = "application/json";
        payload = JSON.stringify(body);
    }
    const res = await fetch(API + url, { method, headers, body: payload });
    const json = await res.json().catch(() => ({}));
    return { status: res.status, body: json };
};

// A small test picture: an orange circle on a grey background
const small = await sharp(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="320" height="240"><rect width="320" height="240" fill="#9aa3b2"/><circle cx="160" cy="120" r="70" fill="#f97316"/></svg>')).jpeg().toBuffer();
const form = (buffer = small, type = "image/jpeg", name = "sneaker.jpg") => {
    const f = new FormData();
    f.append("image", new Blob([buffer], { type }), name);
    return f;
};

const alice = await makeUser("alice");
const bob = await makeUser("bob");

try {
    console.log("\nAuthentication");
    check("GET /api/me without a token -> 401", (await call(null, "GET", "/api/me")).status === 401);
    // A JWT with a chosen user id but no valid signature: the original API accepted these
    const forged = ["eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9", Buffer.from(JSON.stringify({ sub: alice.id, clerkId: alice.id })).toString("base64url"), "c2ln"].join(".");
    check("forged JWT is rejected -> 401", (await call(forged, "GET", "/api/me")).status === 401);
    check("upload without a token -> 401", (await call(null, "POST", "/api/images", form())).status === 401);

    const me = await call(alice, "GET", "/api/me");
    check("signed-in user gets their profile", me.status === 200 && me.body.user.id === alice.id);
    const startCredits = me.body.user.credits;

    console.log("\nImages and ownership");
    const up = await call(alice, "POST", "/api/images", form());
    check("upload succeeds -> 201", up.status === 201, up.body.error);
    check("one credit is spent", up.body.credits === startCredits - 1);
    const id = up.body.image?.id;

    check("owner can read their image", (await call(alice, "GET", `/api/images/${id}`)).status === 200);
    check("another user can't read it -> 404", (await call(bob, "GET", `/api/images/${id}`)).status === 404);
    check("another user can't rename it -> 404", (await call(bob, "PATCH", `/api/images/${id}`, { name: "mine now" })).status === 404);
    check("another user can't delete it -> 404", (await call(bob, "DELETE", `/api/images/${id}`)).status === 404);
    const bobList = await call(bob, "GET", "/api/images");
    check("it isn't in another user's list", bobList.status === 200 && !bobList.body.images.some((i) => i.id === id));

    console.log("\nSigned file URLs");
    const fileUrl = up.body.image.urls.result;
    check("signed result URL works", (await fetch(API + fileUrl)).status === 200);
    check("URL signed for another image is refused", (await fetch(API + fileUrl.replace(id, bobList.body.images[0]?.id || "00000000-0000-4000-8000-000000000000"))).status === 403);
    check("tampered signature is refused", (await fetch(API + fileUrl.replace(/sig=.{4}/, "sig=AAAA"))).status === 403);
    check("switching file kind is refused", (await fetch(API + fileUrl.replace("/result?", "/original?"))).status === 403);
    const past = Math.floor(Date.now() / 1000) - 60;
    check("expired URL is refused", (await fetch(API + fileUrl.replace(/exp=\d+/, `exp=${past}`))).status === 403);

    console.log("\nCredits");
    const bad = await call(alice, "POST", "/api/images", form(Buffer.from("definitely not a picture"), "image/png", "fake.png"));
    check("non-image upload -> 400", bad.status === 400);
    check("credit is refunded after a failed upload", bad.body.credits === startCredits - 1);

    const setCredits = (n) => query("UPDATE users SET credits = $2 WHERE clerk_id = $1", [alice.id, n]);
    const creditsOf = async () => (await query("SELECT credits FROM users WHERE clerk_id = $1", [alice.id])).rows[0].credits;
    await setCredits(1);
    const burst = await Promise.all([1, 2, 3].map(() => call(alice, "POST", "/api/images", form())));
    const ok = burst.filter((r) => r.status === 201).length;
    const after = { credits: await creditsOf() };
    check("3 parallel uploads with 1 credit: exactly one succeeds", ok === 1, `${ok} succeeded`);
    check("balance never goes below zero", after.credits === 0, `credits=${after.credits}`);
    const broke = await call(alice, "POST", "/api/images", form());
    check("upload with 0 credits -> 402 NO_CREDITS", broke.status === 402 && broke.body.code === "NO_CREDITS");

    console.log("\nPayments");
    check("checkout with an unknown plan -> 400", (await call(alice, "POST", "/api/billing/checkout", { planId: "free-lunch", provider: "stripe" })).status === 400);
    check("checkout with an unknown provider -> 400", (await call(alice, "POST", "/api/billing/checkout", { planId: "starter", provider: "paypal" })).status === 400);
    // A pending purchase that was never paid: the original credited it from a URL flag
    const { rows: [tx] } = await query(
        "INSERT INTO transactions (owner, plan, credits, amount, currency, provider, provider_ref) VALUES ($1, 'Studio', 1000, 4900, 'USD', 'razorpay', $2) RETURNING *",
        [alice.id, `order_test_${Date.now()}`]
    );
    tx.providerRef = tx.provider_ref;
    const fake = await call(alice, "POST", "/api/billing/confirm", { provider: "razorpay", orderId: tx.providerRef, paymentId: "pay_fake", signature: "0".repeat(64) });
    check("Razorpay confirm with a forged signature is refused", fake.status === 400 || fake.status === 404, `status ${fake.status}`);
    const bobClaim = await call(bob, "POST", "/api/billing/confirm", { provider: "razorpay", orderId: tx.providerRef, paymentId: "pay_fake", signature: "0".repeat(64) });
    check("another user can't confirm someone else's order -> 404", bobClaim.status === 404);
    const stripeFake = await call(alice, "POST", "/api/billing/confirm", { provider: "stripe", sessionId: "cs_test_made_up" });
    check("Stripe confirm for an unknown session -> 404", stripeFake.status === 404);
    const final = { credits: await creditsOf() };
    check("no credits were added without a payment", final.credits === 0, `credits=${final.credits}`);
    check("purchase stays pending", (await query("SELECT status FROM transactions WHERE id = $1", [tx.id])).rows[0].status === "pending");

    console.log("\nOther endpoints");
    const hook = await fetch(`${API}/api/webhooks/clerk`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ type: "user.deleted", data: { id: bob.id } }) });
    check("unsigned Clerk webhook is refused", hook.status === 400 || hook.status === 404, `status ${hook.status}`);
    check("unknown image id -> 404", (await call(alice, "GET", "/api/images/00000000-0000-4000-8000-000000000000")).status === 404);
    check("malformed image id -> 404", (await call(alice, "GET", "/api/images/not-an-id")).status === 404);
} finally {
    for (const u of [alice, bob]) {
        // Images and purchases are removed with the user (ON DELETE CASCADE)
        await Promise.all([clerk.users.deleteUser(u.id).catch(() => {}), query("DELETE FROM users WHERE clerk_id = $1", [u.id])]);
    }
    await pool.end();
}

console.log(`\n${passed} passed, ${failed} failed\n`);
process.exit(failed ? 1 : 0);
