// Clerk components (sign-in, user menu) styled with the Clearcut palette.
// Clerk needs concrete colours, so we pass the values for the theme currently showing.
const palettes = {
    dark: {
        colorBackground: "#11131a",
        colorForeground: "#f3f5f9",
        colorMutedForeground: "#a6adbd",
        colorMuted: "#171a22",
        colorInput: "#151821",
        colorInputForeground: "#f3f5f9",
        colorBorder: "#272b36",
        colorNeutral: "#f3f5f9",
        colorShadow: "#000000",
        colorModalBackdrop: "#000000",
    },
    light: {
        colorBackground: "#ffffff",
        colorForeground: "#0b1020",
        colorMutedForeground: "#4a5468",
        colorMuted: "#f4f6fa",
        colorInput: "#f8f9fc",
        colorInputForeground: "#0b1020",
        colorBorder: "#dde1ea",
        colorNeutral: "#0b1020",
        colorShadow: "#0f172a",
        colorModalBackdrop: "#0f172a",
    },
};

export const clerkAppearance = (theme = "dark") => ({
    variables: {
        ...palettes[theme],
        colorPrimary: "#3b6cff",
        colorPrimaryForeground: "#ffffff",
        colorDanger: "#f43f5e",
        colorSuccess: "#22c55e",
        colorWarning: "#f59e0b",
        colorRing: "#3b6cff",
        fontFamily: "'Geist Variable', 'Geist', system-ui, sans-serif",
        borderRadius: "12px",
    },
    elements: {
        // Embedded inside our own glass card on the auth page
        cardBox: { boxShadow: "none", width: "100%", maxWidth: "100%" },
        card: { boxShadow: "none", background: "transparent", border: "none", padding: "4px 0 0" },
        footer: { background: "transparent" },
        formButtonPrimary: {
            background: "linear-gradient(135deg, #8fb0ff 0%, #3b6cff 38%, #2f8cff 66%, #22d3ee 112%)",
            color: "#ffffff",
            fontWeight: 600,
            height: "44px",
            boxShadow: "0 6px 24px rgba(59,108,255,.32)",
        },
        socialButtonsBlockButton: { height: "44px", border: "1px solid var(--border-strong)", background: "var(--surface)", boxShadow: "none" },
        formFieldInput: { height: "44px", border: "1px solid var(--border-strong)", boxShadow: "none" },
        dividerLine: { background: "var(--border-strong)" },
        userButtonPopoverCard: { borderRadius: "18px" },
    },
});
