#!/usr/bin/env node
/**
 * build-brand-assets.mjs — every raster and standalone-SVG form of the LSC mark.
 *
 * The geometry comes from src/lib/lsc-mark.mjs, which is the same module
 * components/LscMark.astro inlines, so the mark a visitor sees on the page and
 * the mark in the favicon/OG/JSON-LD are provably the same drawing.
 *
 * Two shapes, for two different jobs (see the module for the full rationale):
 *   coin — disc, transparent outside. On-page, the favicon SVG, OG composites.
 *   tile — full-bleed square. The apple-touch icon and the manifest icons are
 *          declared `purpose: maskable`, so the platform applies its own crop;
 *          a circle on transparency would get clipped into a lens. The tile also
 *          survives 16px, where a coin's rim turns to mush.
 *
 * This is a ONE-SHOT tool, run by hand (`npm run build:brand`) when the art
 * changes — like build-og-images.mjs and build-image-variants.mjs, it is
 * deliberately NOT part of `astro build`. Committing the output is intentional.
 *
 * Run this BEFORE `npm run build:og`: the OG cards composite
 * lsc-mark-inverse.png, which this script writes.
 */

import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { INK, LIGHT, markSvg } from "../src/lib/lsc-mark.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const PUBLIC = path.join(ROOT, "public");
const IMAGES = path.join(PUBLIC, "assets", "images");
const OG_DIR = path.join(PUBLIC, "assets", "og");

mkdirSync(IMAGES, { recursive: true });
mkdirSync(OG_DIR, { recursive: true });

/** Rasterize one of the mark's forms to PNG at `size`. */
async function png(size, { disc, bird, shape }) {
  const svg = markSvg({ disc, bird, shape, size });
  return sharp(Buffer.from(svg)).png({ compressionLevel: 9 }).toBuffer();
}

async function write(file, buf) {
  writeFileSync(file, buf);
  const kb = (buf.length / 1024).toFixed(1);
  console.log(`wrote ${path.relative(ROOT, file)} — ${kb} KB`);
}

const COIN = { disc: INK, bird: LIGHT, shape: "coin" };
const COIN_INVERSE = { disc: LIGHT, bird: INK, shape: "coin" };
const TILE = { disc: INK, bird: LIGHT, shape: "tile" };

/**
 * ICO container. sharp has no ICO encoder, so write one: a 6-byte ICONDIR, a
 * 16-byte ICONDIRENTRY per image, then the PNG payloads. PNG-in-ICO (rather
 * than a BMP payload) is understood by every browser in scope.
 */
function ico(images) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // type: 1 = icon
  header.writeUInt16LE(images.length, 4);

  let offset = 6 + images.length * 16;
  const entries = images.map(({ size, buf }) => {
    const e = Buffer.alloc(16);
    e.writeUInt8(size >= 256 ? 0 : size, 0); // width (0 means 256)
    e.writeUInt8(size >= 256 ? 0 : size, 1); // height
    e.writeUInt8(0, 2); // palette size: 0 = no palette
    e.writeUInt8(0, 3); // reserved
    e.writeUInt16LE(1, 4); // color planes
    e.writeUInt16LE(32, 6); // bits per pixel
    e.writeUInt32LE(buf.length, 8);
    e.writeUInt32LE(offset, 12);
    offset += buf.length;
    return e;
  });

  return Buffer.concat([header, ...entries, ...images.map((i) => i.buf)]);
}

// --- The favicon SVG carries its own theme switch ----------------------------
// An externally-referenced SVG can't read the page's CSS variables, but it CAN
// carry a prefers-color-scheme block of its own — and browsers honor it for
// favicons. So this one file follows the browser's scheme, which the old opaque
// gold square never did.
const faviconStyle =
  `<style>` +
  `.disc{fill:${INK}}.bird{fill:${LIGHT};stroke:${LIGHT}}` +
  `@media (prefers-color-scheme:dark){` +
  `.disc{fill:${LIGHT}}.bird{fill:${INK};stroke:${INK}}}` +
  `</style>`;

const faviconSvg = markSvg({ disc: INK, bird: LIGHT, shape: "coin", extra: faviconStyle })
  // Hand the fills over to the classes the <style> above drives. The literal
  // colors stay as the no-CSS fallback (SVG presentation attributes lose to the
  // stylesheet wherever it applies).
  .replace(`<circle`, `<circle class="disc"`)
  .replaceAll(`<path `, `<path class="bird" `);

await write(path.join(PUBLIC, "favicon.svg"), Buffer.from(faviconSvg));

// --- On-page / structured-data / OG sources ---------------------------------
await write(path.join(IMAGES, "lsc-mark.png"), await png(1024, COIN));
await write(path.join(IMAGES, "lsc-mark-inverse.png"), await png(1024, COIN_INVERSE));

// --- Favicons and app icons (tile form) -------------------------------------
await write(path.join(PUBLIC, "favicon-96x96.png"), await png(96, TILE));
await write(path.join(PUBLIC, "apple-touch-icon.png"), await png(180, TILE));
await write(path.join(PUBLIC, "web-app-manifest-192x192.png"), await png(192, TILE));
await write(path.join(PUBLIC, "web-app-manifest-512x512.png"), await png(512, TILE));

await write(
  path.join(PUBLIC, "favicon.ico"),
  ico(
    await Promise.all(
      [16, 32, 48].map(async (size) => ({ size, buf: await png(size, TILE) })),
    ),
  ),
);

// --- The kept square brand asset (CLAUDE.md / FIXLIST OW4) ------------------
await write(path.join(OG_DIR, "og-square.png"), await png(2200, TILE));
