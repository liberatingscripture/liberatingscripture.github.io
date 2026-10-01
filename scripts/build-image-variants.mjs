#!/usr/bin/env node
/**
 * build-image-variants.mjs — right-sized WebP variants for on-page images.
 *
 * The source art in public/assets/images/ ships at full resolution
 * (twb-cover.png is 2000×2000) but is displayed at small sizes — a ≤240px
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
 * Sources that nothing needs at full size live in scripts/image-sources/
 * instead, so they never ship: the TWB hero photo is only ever shown through
 * its WebP widths (a srcset on /table-were-building/), so the 1920px JPEG
 * stays out of public/.
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
const SOURCES = path.join(__dirname, "image-sources");

// One entry per generated variant. `width` is the output pixel width; height
// follows the source aspect ratio (square cover → square). `src` is an
// absolute path; outputs always land in public/assets/images/.
//
// The hero photo takes a lower quality than the cover art: it is shallow
// depth-of-field (mostly blur, which WebP compresses well) and always sits
// under an ink scrim, so q82's extra detail would be paid for and not seen.
const VARIANTS = [
  { src: path.join(IMAGES, "twb-cover.png"), out: "twb-cover-480.webp", width: 480 }, // podcasts cover
  // /table-were-building/'s cover renders at up to 320 CSS px, past what the
  // 480 can cover at 2x, and the art is mostly lettering, which shows softness.
  { src: path.join(IMAGES, "twb-cover.png"), out: "twb-cover-720.webp", width: 720 },
  ...[640, 1280, 1920].map((width) => ({
    src: path.join(SOURCES, "twb-hero.jpg"),
    out: `twb-hero-${width}.webp`,
    width,
    quality: 72,
  })), // /table-were-building/ hero (full-bleed srcset)
];

for (const { src, out, width, quality = 82 } of VARIANTS) {
  const info = await sharp(src)
    .resize({ width })
    .webp({ quality })
    .toFile(path.join(IMAGES, out));
  const kb = (info.size / 1024).toFixed(1);
  console.log(`wrote ${out} — ${info.width}×${info.height}, ${kb} KB`);
}
