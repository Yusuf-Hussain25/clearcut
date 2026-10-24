// Renders the edited result (backdrop + cutout + optional shadow) to an image file with a canvas,
// matching what the studio preview shows with CSS.

export const loadImage = (src) =>
    new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = "anonymous"; // file URLs are served with CORS, so the canvas stays exportable
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error("Could not load the image"));
        img.src = src;
    });

// Same numbers the CSS preview uses, relative to the image's longest side
export const blurRadius = (strength, longest) => (strength / 100) * longest;
export const shadowFor = (longest) => ({ offsetY: longest * 0.018, blur: longest * 0.035, color: "rgba(0, 0, 0, 0.38)" });

const drawCover = (ctx, img, w, h) => {
    const scale = Math.max(w / img.naturalWidth, h / img.naturalHeight);
    const dw = img.naturalWidth * scale;
    const dh = img.naturalHeight * scale;
    ctx.drawImage(img, (w - dw) / 2, (h - dh) / 2, dw, dh);
};

const fillGradient = (ctx, { stops, angle }, w, h) => {
    // CSS angles: 0deg points up, clockwise
    const rad = ((angle - 90) * Math.PI) / 180;
    const len = Math.abs(w * Math.cos(rad)) + Math.abs(h * Math.sin(rad));
    const cx = w / 2;
    const cy = h / 2;
    const dx = (Math.cos(rad) * len) / 2;
    const dy = (Math.sin(rad) * len) / 2;
    const g = ctx.createLinearGradient(cx - dx, cy - dy, cx + dx, cy + dy);
    g.addColorStop(0, stops[0]);
    g.addColorStop(1, stops[1]);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
};

/**
 * @param {object} o
 * @param {string} o.cutoutUrl  transparent PNG
 * @param {string} o.originalUrl original photo (for the blur backdrop)
 * @param {object} o.backdrop   { type: transparent|color|gradient|blur|image, color, gradient, strength, imageUrl }
 * @param {boolean} o.shadow
 * @param {number|null} o.maxSide  longest side in px, null for full size
 * @param {"png"|"jpeg"|"webp"} o.format
 * @returns {Promise<Blob>}
 */
export const composeImage = async ({ cutoutUrl, originalUrl, backdrop, shadow, maxSide, format }) => {
    const cutout = await loadImage(cutoutUrl);
    const scale = maxSide ? Math.min(1, maxSide / Math.max(cutout.naturalWidth, cutout.naturalHeight)) : 1;
    const w = Math.round(cutout.naturalWidth * scale);
    const h = Math.round(cutout.naturalHeight * scale);
    const longest = Math.max(w, h);

    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    ctx.imageSmoothingQuality = "high";

    // JPG has no transparency: a transparent result gets a white backdrop
    if (backdrop.type === "transparent" && format === "jpeg") {
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, w, h);
    }
    if (backdrop.type === "color") {
        ctx.fillStyle = backdrop.color;
        ctx.fillRect(0, 0, w, h);
    }
    if (backdrop.type === "gradient") fillGradient(ctx, backdrop.gradient, w, h);
    if (backdrop.type === "blur" && originalUrl) {
        const original = await loadImage(originalUrl);
        ctx.save();
        ctx.filter = `blur(${blurRadius(backdrop.strength, longest)}px)`;
        // Drawn slightly larger so the blur doesn't fade in from transparent edges
        const pad = blurRadius(backdrop.strength, longest) * 2;
        ctx.drawImage(original, -pad, -pad, w + pad * 2, h + pad * 2);
        ctx.restore();
    }
    if (backdrop.type === "image" && backdrop.imageUrl) {
        drawCover(ctx, await loadImage(backdrop.imageUrl), w, h);
    }

    if (shadow) {
        const s = shadowFor(longest);
        ctx.shadowColor = s.color;
        ctx.shadowBlur = s.blur;
        ctx.shadowOffsetY = s.offsetY;
    }
    ctx.drawImage(cutout, 0, 0, w, h);

    const type = `image/${format}`;
    return new Promise((resolve, reject) =>
        canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("Export failed"))), type, format === "png" ? undefined : 0.92)
    );
};

export const saveBlob = (blob, filename) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
};
