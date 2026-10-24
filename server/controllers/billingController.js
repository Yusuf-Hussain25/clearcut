import transactionModel from "../models/transactionModel.js";
import userModel from "../models/userModel.js";
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

// Marks a pending purchase paid and adds its credits, exactly once.
// The status flip is atomic, so a double confirm (two tabs, a retry) can't add credits twice.
const fulfil = async (tx, paymentId) => {
    const claimed = await transactionModel.findOneAndUpdate(
        { _id: tx._id, status: "pending" },
        { $set: { status: "paid", paidAt: new Date(), ...(paymentId && { paymentId }) } },
        { returnDocument: "after" }
    );
    if (claimed) await userModel.updateOne({ clerkId: tx.owner }, { $inc: { credits: tx.credits } });
    return userModel.findOne({ clerkId: tx.owner });
};

const serializeTx = (t) => ({
    id: t._id.toString(),
    plan: t.plan,
    credits: t.credits,
    amount: t.amount,
    currency: t.currency,
    provider: t.provider,
    status: t.status,
    createdAt: t.createdAt,
    paidAt: t.paidAt,
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
        const txs = await transactionModel
            .find({ owner: req.user.clerkId, status: { $ne: "pending" } })
            .sort({ createdAt: -1 })
            .limit(50);
        res.json({ transactions: txs.map(serializeTx) });
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
        const tx = await transactionModel.create({
            owner: req.user.clerkId,
            plan: plan.name,
            credits: plan.credits,
            amount: plan.price[cur],
            currency: cur,
            provider,
        });
        const transactionId = tx._id.toString();

        if (provider === "stripe") {
            const session = await createStripeSession({
                transactionId,
                plan,
                amount: tx.amount,
                currency: cur,
                email: req.user.email,
                successUrl: `${appUrl()}/billing?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
                cancelUrl: `${appUrl()}/billing?checkout=cancelled`,
            });
            tx.providerRef = session.id;
            await tx.save();
            return res.json({ provider, url: session.url });
        }

        const order = await createRazorpayOrder({ transactionId, amount: tx.amount, currency: cur });
        tx.providerRef = order.id;
        await tx.save();
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

        const tx = await transactionModel.findOne({ provider, providerRef: ref, owner: req.user.clerkId });
        if (!tx) return res.status(404).json({ error: "Payment not found" });

        if (tx.status !== "paid") {
            if (provider === "stripe") {
                const session = await getStripeSession(ref);
                const paid = session.payment_status === "paid" && session.metadata?.transactionId === tx._id.toString();
                if (!paid) return res.status(402).json({ error: "This payment hasn't gone through" });
                await fulfil(tx, session.payment_intent);
            } else {
                if (!verifyRazorpaySignature(orderId, paymentId, signature)) {
                    return res.status(400).json({ error: "Payment verification failed" });
                }
                await fulfil(tx, paymentId);
            }
        }

        const user = await userModel.findOne({ clerkId: req.user.clerkId });
        res.json({ ok: true, credits: user.credits, added: tx.credits, plan: tx.plan });
    } catch (error) {
        next(error);
    }
};
