import crypto from "crypto";

// Stripe Checkout and Razorpay Orders over their REST APIs (no SDKs needed).
// Each is enabled only when its keys are set in server/.env.

export const stripeEnabled = () => Boolean(process.env.STRIPE_SECRET_KEY);
export const razorpayEnabled = () => Boolean(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET);

class PaymentError extends Error {
    constructor(message, status = 502) {
        super(message);
        this.status = status;
    }
}

const stripe = async (path, { method = "GET", form } = {}) => {
    const res = await fetch(`https://api.stripe.com/v1${path}`, {
        method,
        headers: {
            Authorization: `Bearer ${process.env.STRIPE_SECRET_KEY}`,
            ...(form && { "Content-Type": "application/x-www-form-urlencoded" }),
        },
        body: form ? new URLSearchParams(form) : undefined,
        signal: AbortSignal.timeout(20_000),
    });
    const body = await res.json();
    if (!res.ok) throw new PaymentError(`Stripe: ${body.error?.message || res.status}`);
    return body;
};

export const createStripeSession = ({ transactionId, plan, amount, currency, email, successUrl, cancelUrl }) =>
    stripe("/checkout/sessions", {
        method: "POST",
        form: {
            mode: "payment",
            success_url: successUrl,
            cancel_url: cancelUrl,
            client_reference_id: transactionId,
            "metadata[transactionId]": transactionId,
            ...(email && { customer_email: email }),
            "line_items[0][quantity]": "1",
            "line_items[0][price_data][currency]": currency.toLowerCase(),
            "line_items[0][price_data][unit_amount]": String(amount),
            "line_items[0][price_data][product_data][name]": `Clearcut ${plan.name}: ${plan.credits} credits`,
        },
    });

export const getStripeSession = (id) => stripe(`/checkout/sessions/${encodeURIComponent(id)}`);

export const createRazorpayOrder = async ({ transactionId, amount, currency }) => {
    const auth = Buffer.from(`${process.env.RAZORPAY_KEY_ID}:${process.env.RAZORPAY_KEY_SECRET}`).toString("base64");
    const res = await fetch("https://api.razorpay.com/v1/orders", {
        method: "POST",
        headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/json" },
        body: JSON.stringify({ amount, currency, receipt: transactionId }),
        signal: AbortSignal.timeout(20_000),
    });
    const body = await res.json();
    if (!res.ok) throw new PaymentError(`Razorpay: ${body.error?.description || res.status}`);
    return body;
};

// Razorpay signs "<order_id>|<payment_id>" with the key secret; only a genuine checkout produces it.
export const verifyRazorpaySignature = (orderId, paymentId, signature) => {
    if (![orderId, paymentId, signature].every((v) => typeof v === "string" && v)) return false;
    const expected = crypto.createHmac("sha256", process.env.RAZORPAY_KEY_SECRET).update(`${orderId}|${paymentId}`).digest("hex");
    return expected.length === signature.length && crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
};
