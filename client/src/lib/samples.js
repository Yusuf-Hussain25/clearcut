// Sample photos bundled in public/samples, with cutouts made by Clearcut's own engine.
// Photo credits: README -> Credits (all from Wikimedia Commons under free licences).
export const SAMPLES = [
    { slug: "portrait-studio", label: "Portrait", ratio: "800 / 1200" },
    { slug: "white-sneaker", label: "Sneaker", ratio: "1200 / 873" },
    { slug: "green-911", label: "Car", ratio: "1200 / 800" },
    { slug: "studio-headphones", label: "Headphones", ratio: "1158 / 1200" },
    { slug: "digital-watch", label: "Watch", ratio: "1003 / 1200" },
    { slug: "peace-lily", label: "Plant", ratio: "1200 / 971" },
].map((s) => ({ ...s, original: `/samples/${s.slug}.jpg`, cutout: `/samples/${s.slug}-cutout.webp` }));
