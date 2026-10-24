const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

// "just now", "5 min ago", "yesterday", "3 days ago", then a date
export const timeAgo = (date) => {
    const diff = (new Date(date).getTime() - Date.now()) / 1000;
    const abs = Math.abs(diff);
    if (abs < 45) return "just now";
    if (abs < 3600) return rtf.format(Math.round(diff / 60), "minute");
    if (abs < 86400) return rtf.format(Math.round(diff / 3600), "hour");
    if (abs < 7 * 86400) return rtf.format(Math.round(diff / 86400), "day");
    return formatDate(date);
};

export const formatDate = (date, opts = { day: "numeric", month: "short", year: "numeric" }) =>
    new Date(date).toLocaleDateString("en", opts);

export const formatBytes = (bytes = 0) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
};

// Minor units -> "$19" / "₹1,499"
export const formatMoney = (amount, currency = "USD") => {
    const digits = amount % 100 === 0 ? 0 : 2;
    return new Intl.NumberFormat(currency === "INR" ? "en-IN" : "en-US", {
        style: "currency",
        currency,
        minimumFractionDigits: digits,
        maximumFractionDigits: digits,
    }).format(amount / 100);
};

export const plural = (n, word, many = `${word}s`) => `${n.toLocaleString()} ${n === 1 ? word : many}`;
