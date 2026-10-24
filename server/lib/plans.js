// Credit packs. The server is the only source of prices: the browser sends a plan id, never an amount.
// Prices are in minor units for each supported currency (CURRENCY in server/.env).
export const PLANS = [
    {
        id: "starter",
        name: "Starter",
        credits: 50,
        price: { USD: 500, INR: 39900 },
        blurb: "For the occasional profile picture or listing photo.",
    },
    {
        id: "creator",
        name: "Creator",
        credits: 250,
        price: { USD: 1900, INR: 149900 },
        blurb: "For shops and creators who edit every week.",
        popular: true,
    },
    {
        id: "studio",
        name: "Studio",
        credits: 1000,
        price: { USD: 4900, INR: 399900 },
        blurb: "For teams processing whole catalogues.",
    },
];

export const currency = () => {
    const c = (process.env.CURRENCY || "USD").toUpperCase();
    return PLANS[0].price[c] ? c : "USD";
};

export const findPlan = (id) => PLANS.find((p) => p.id === id) || null;

export const publicPlans = () => {
    const cur = currency();
    return PLANS.map(({ price, ...plan }) => ({ ...plan, amount: price[cur], currency: cur }));
};
