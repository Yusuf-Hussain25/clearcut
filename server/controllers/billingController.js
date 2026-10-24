import { query } from "../config/db.js";
import { findUser } from "../lib/users.js";
import { currency, findPlan, publicPlans } from "../lib/plans.js";
import {
    createRazorpayOrder,
    createStripeSession,
    getStripeSession,
    razorpayEnabled,
    stripeEnabled,
    verifyRazorpaySignature,
} from "../lib/payments.js";
import { appUrl } from "../config/env.js";

// Marks a pending purchase paid and adds its credits, exactly once, in one statement:
// the status flip only matches a pending row, so a double confirm (two tabs, a retry) adds nothing.
const fulfil = (txId, paymentId) =>
    query(
        `WITH paid AS (
             UPDATE transactions SET status = 'paid', paid_at = now(), payment_id = $2, updated_at = now()
             WHERE id = $1 AND status = 'pending'
             RETURNING owner, credits
         )
         UPDATE users u SET credits = u.credits + paid.credits, updated_at = now()
         FROM paid WHERE u.clerk_id = paid.owner`,
        [txId, paymentId || null]
    );

const serializeTx = (t) => ({
    id: t.id,
    plan: t.plan,
    credits: t.credits,
    amount: t.amount,
    currency: t.currency,
    provider: t.provider,
    status: t.status,
    createdAt: t.created_at,
    paidAt: t.paid_at,
});

// GET /api/billing/plans
export const getPlans = (req, res) => {
    res.json({
        currency: currency(),
        plans: publicPlans(),
        providers: { stripe: stripeEnabled(), razorpay: razorpayEnabled() },
    });
};

// GET /api/billing/transactions
export const listTransactions = async (req, res, next) => {
    try {
        const { rows } = await query(
            "SELECT * FROM transactions WHERE owner = $1 AND status <> 'pending' ORDER BY created_at DESC LIMIT 50",
            [req.user.clerkId]
        );
        res.json({ transactions: rows.map(serializeTx) });
    } catch (error) {
        next(error);
    }
};

// POST /api/billing/checkout  { planId, provider: "stripe" | "razorpay" }
export const startCheckout = async (req, res, next) => {
    try {
        if (req.isDemo) {
            return res.status(403).json({ error: "The demo account can't buy credits. Sign up to try checkout." });
        }
        const plan = findPlan(req.body?.planId);
        if (!plan) return res.status(400).json({ error: "Choose a plan" });

        const provider = req.body?.provider;
        const enabled = provider === "stripe" ? stripeEnabled() : provider === "razorpay" ? razorpayEnabled() : false;
        if (!enabled) return res.status(400).json({ error: "That payment method isn't available" });

        const cur = currency();
        const amount = plan.price[cur];
        const { rows: [tx] } = await query(
            "INSERT INTO transactions (owner, plan, credits, amount, currency, provider) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id",
            [req.user.clerkId, plan.name, plan.credits, amount, cur, provider]
        );
        const setRef = (ref) => query("UPDATE transactions SET provider_ref = $2, updated_at = now() WHERE id = $1", [tx.id, ref]);

        if (provider === "stripe") {
            const session = await createStripeSession({
                transactionId: tx.id,
                plan,
                amount,
                currency: cur,
                email: req.user.email,
                successUrl: `${appUrl()}/billing?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
                cancelUrl: `${appUrl()}/billing?checkout=cancelled`,
            });
            await setRef(session.id);
            return res.json({ provider, url: session.url });
        }

        const order = await createRazorpayOrder({ transactionId: tx.id, amount, currency: cur });
        await setRef(order.id);
        res.json({
            provider,
            keyId: process.env.RAZORPAY_KEY_ID, // public by design
            order: { id: order.id, amount: order.amount, currency: order.currency },
            plan: { name: plan.name, credits: plan.credits },
            prefill: { name: req.user.name, email: req.user.email },
        });
    } catch (error) {
        next(error);
    }
};

// POST /api/billing/confirm
//   Stripe:   { provider: "stripe", sessionId }
//   Razorpay: { provider: "razorpay", orderId, paymentId, signature }
// The original trusted a "success=true" flag in the return URL, so anyone could add credits
// without paying. Now the payment is checked with Stripe, or by Razorpay's signature.
export const confirmCheckout = async (req, res, next) => {
    try {
        const { provider, sessionId, orderId, paymentId, signature } = req.body || {};
        const ref = provider === "stripe" ? sessionId : provider === "razorpay" ? orderId : null;
        if (typeof ref !== "string" || !ref) return res.status(400).json({ error: "Missing payment reference" });

        const { rows: [tx] } = await query(
            "SELECT * FROM transactions WHERE provider = $1 AND provider_ref = $2 AND owner = $3",
            [provider, ref, req.user.clerkId]
        );
        if (!tx) return res.status(404).json({ error: "Payment not found" });

        if (tx.status !== "paid") {
            if (provider === "stripe") {
                const session = await getStripeSession(ref);
                const paid = session.payment_status === "paid" && session.metadata?.transactionId === tx.id;
                if (!paid) return res.status(402).json({ error: "This payment hasn't gone through" });
                await fulfil(tx.id, session.payment_intent);
            } else {
                if (!verifyRazorpaySignature(orderId, paymentId, signature)) {
                    return res.status(400).json({ error: "Payment verification failed" });
                }
                await fulfil(tx.id, paymentId);
            }
        }

        const user = await findUser(req.user.clerkId);
        res.json({ ok: true, credits: user.credits, added: tx.credits, plan: tx.plan });
    } catch (error) {
        next(error);
    }
};
