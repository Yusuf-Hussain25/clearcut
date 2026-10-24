// Theme preference: "system" (default, follows prefers-color-scheme), "light" or "dark".
// Applied as data-theme on <html>. index.html runs the same logic before first paint, so there is no flash.
const KEY = "clearcut-theme";
const listeners = new Set();
const media = typeof window !== "undefined" ? window.matchMedia("(prefers-color-scheme: light)") : null;

export const getThemePreference = () => {
    try {
        const saved = localStorage.getItem(KEY);
        return saved === "light" || saved === "dark" ? saved : "system";
    } catch {
        return "system";
    }
};

export const resolveTheme = (pref = getThemePreference()) => {
    if (pref === "light" || pref === "dark") return pref;
    return media?.matches ? "light" : "dark";
};

export const applyTheme = (pref = getThemePreference()) => {
    const theme = resolveTheme(pref);
    document.documentElement.setAttribute("data-theme", theme);
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", theme === "light" ? "#f4f6fa" : "#07080b");
    listeners.forEach((fn) => fn(theme));
};

export const setThemePreference = (pref) => {
    try {
        if (pref === "system") localStorage.removeItem(KEY);
        else localStorage.setItem(KEY, pref);
    } catch {
        // storage unavailable (private mode): the theme still applies for this visit
    }
    applyTheme(pref);
};

// Flips between light and dark (an explicit choice overrides the system setting)
export const toggleTheme = () => {
    const next = resolveTheme() === "light" ? "dark" : "light";
    setThemePreference(next);
    return next;
};

export const onThemeChange = (fn) => {
    listeners.add(fn);
    return () => listeners.delete(fn);
};

// Follow the OS setting live while the preference is "system"
media?.addEventListener("change", () => {
    if (getThemePreference() === "system") applyTheme("system");
});
