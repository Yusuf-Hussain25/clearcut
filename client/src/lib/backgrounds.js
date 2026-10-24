// Backdrops for cutouts. Used by the studio editor (and its export) and the live previews.
export const SOLIDS = ["#ffffff", "#f4f1ea", "#0b1020", "#3b6cff", "#22d3ee", "#f97316", "#f43f5e", "#22c55e", "#facc15", "#a855f7"];

export const GRADIENTS = [
    { id: "sky", stops: ["#8fb0ff", "#22d3ee"], angle: 135 },
    { id: "sunset", stops: ["#f97316", "#f43f5e"], angle: 135 },
    { id: "peach", stops: ["#fde68a", "#fca5a5"], angle: 160 },
    { id: "mint", stops: ["#bbf7d0", "#99f6e4"], angle: 160 },
    { id: "grape", stops: ["#a855f7", "#3b6cff"], angle: 135 },
    { id: "night", stops: ["#0b1020", "#334155"], angle: 180 },
];

export const gradientCss = (g) => `linear-gradient(${g.angle}deg, ${g.stops[0]}, ${g.stops[1]})`;

// CSS background for a backdrop value: { type: "transparent" | "color" | "gradient" | "blur" | "image", ... }
export const backdropStyle = (bg) => {
    if (bg.type === "color") return { background: bg.color };
    if (bg.type === "gradient") return { background: gradientCss(bg.gradient) };
    return {};
};

// Rotation used by the animated previews
export const PREVIEW_BACKDROPS = [
    { type: "transparent" },
    { type: "color", color: "#ffffff" },
    { type: "gradient", gradient: GRADIENTS[0] },
    { type: "color", color: "#f4f1ea" },
    { type: "gradient", gradient: GRADIENTS[1] },
    { type: "gradient", gradient: GRADIENTS[3] },
];
