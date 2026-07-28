#!/usr/bin/env node
/**
 * build-image-variants.mjs — right-sized WebP variants for on-page images.
 *
 * The source art in public/assets/images/ ships at full resolution
 * (twb-banner.png is 1536×1024) but is displayed at small sizes — a ≤240px
 * podcast cover. This script emits WebP variants sized for those real display
 * footprints (with 2–3× DPR headroom), which the templates reference in place
 * of the heavy PNGs (FIXLIST O3).
 *
 * This is a ONE-SHOT tool, run by hand (`npm run build:images`) when the
 * source art changes — like build-og-images.mjs, it is deliberately NOT part
 * of `astro build`. Committing the output WebP files is intentional.
 *
 * The original PNGs are kept in place: they back JSON-LD structured data
 * (PodcastSeries image), which crawlers fetch cold — not a visitor page-load
 * cost.
 *
 * The LSC mark used to be resized here too. It is now an inline SVG
 * (components/LscMark.astro), so it needs no raster variants at all; its
 * favicon/OG/JSON-LD forms come from build-brand-assets.mjs instead.
 */

import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const IMAGES = path.join(ROOT, "public", "assets", "images");

// One entry per generated variant. `width` is the output pixel width; height
// follows the source aspect ratio (3:2 banner → 3:2).
const VARIANTS = [
  { src: "twb-banner.png", out: "twb-banner-480.webp", width: 480 }, // podcasts cover
];

for (const { src, out, width } of VARIANTS) {
  const info = await sharp(path.join(IMAGES, src))
    .resize({ width })
    .webp({ quality: 82 })
    .toFile(path.join(IMAGES, out));
  const kb = (info.size / 1024).toFixed(1);
  console.log(`wrote ${out} — ${info.width}×${info.height}, ${kb} KB`);
}
