// Loads Razorpay Checkout only when someone actually pays with it
let loading = null;

export const loadRazorpay = () => {
    if (window.Razorpay) return Promise.resolve(window.Razorpay);
    loading ??= new Promise((resolve, reject) => {
        const script = document.createElement("script");
        script.src = "https://checkout.razorpay.com/v1/checkout.js";
        script.onload = () => resolve(window.Razorpay);
        script.onerror = () => {
            loading = null;
            reject(new Error("Could not load Razorpay Checkout"));
        };
        document.body.appendChild(script);
    });
    return loading;
};
