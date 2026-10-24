import axios from "axios";

export const API_URL = (import.meta.env.VITE_API_URL || "").replace(/\/$/, "");

const api = axios.create({ baseURL: API_URL });

// Every request carries the current Clerk session token; the API verifies it.
api.interceptors.request.use(async (config) => {
    try {
        const token = await window.Clerk?.session?.getToken();
        if (token) config.headers.Authorization = `Bearer ${token}`;
    } catch (err) {
        console.error("Could not read the Clerk session token:", err);
    }
    return config;
});

// Signed file paths from the API ("/api/files/...") -> absolute URLs
export const fileUrl = (path, { download = false } = {}) => `${API_URL}${path}${download ? "&download=1" : ""}`;

// A readable message from any API or network error
export const errorMessage = (err, fallback = "Something went wrong") => {
    if (err?.response?.data?.error) return err.response.data.error;
    if (err?.code === "ERR_NETWORK") return "Can't reach the Clearcut API. Is the server running?";
    return err?.message || fallback;
};

export default api;
