#!/usr/bin/env node
/**
 * build-og-images.mjs — per-page social share cards for the LSC site.
 *
 * Generates a fixed set of 1200×630 cards into public/assets/og/ for the
 * pages with distinctive art or a distinct call to action (FIXLIST F5).
 * Each page wires its card via Layout's `ogImage` prop; the rest of the
 * site keeps the shared og-default.png.
 *
 * This is a ONE-SHOT tool, run by hand (`npm run build:og`) when a card's
 * text or art changes — it is deliberately NOT part of `astro build` or the
 * deploy pipeline (only four cards, they rarely change). Committing the
 * output PNGs is intentional.
 *
 * Design (house style, matching og-default.png): ink field, a green accent
 * bar, the page title in Fraunces (display cut, opsz 144), the org wordmark
 * in Inter, liberatingscripture.org bottom-right. The right third carries
 * art: the gold LSC emblem (support, companionship), the LIT Bible's own
 * green-disc logo in a green ring (lit-bible, echoing litbible.net's cards),
 * or the two podcast covers as rounded tiles (podcasts).
 *
 * Rendering: text is converted to SVG paths with opentype.js using the fonts
 * committed under scripts/og/fonts/ (see the README there), then sharp
 * rasterizes the SVG and composites the raster art — no system-font or
 * network dependency, so output is deterministic across machines.
 */

import { mkdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import opentype from "opentype.js";
import sharp from "sharp";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const OUT_DIR = path.join(ROOT, "public", "assets", "og");
const IMAGES = path.join(ROOT, "public", "assets", "images");

const WIDTH = 1200;
const HEIGHT = 630;

// INK is the exact corner color of lsc-logo.png, so the gold emblem, which
// ships on its own ink square, composites onto the field with no seam.
const INK = "#1D231C";
const GREEN = "#209D50";
const GREEN_LIGHT = "#3abf6a";
const CREAM_BRIGHT = "#F2F0E9";
const CREAM = "#E1DFD9";

const WORDMARK = "Liberating Scripture Collective";
const SITE = "liberatingscripture.org";

const MARGIN = 90;
const TEXT_MAX_W = 700; // left text column width (art occupies the right third)

function loadFont(file) {
  const buf = readFileSync(path.join(__dirname, "og", "fonts", file));
  return opentype.parse(
    buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength),
  );
}

const fraunces = loadFont("fraunces-opsz144-500.ttf");
const inter = loadFont("inter-400.ttf");

// Serialize an opentype Path to SVG `d` with explicit, space-separated,
// 2-decimal numbers. Do NOT use opentype's built-in toPathData(): its compact
// formatting (a leading "-" doubling as a token delimiter) makes librsvg abort
// mid-path for some glyph/size combinations, clipping the text (e.g. "Podcasts"
// rendered as "Po" at size 100). Explicit spacing avoids that entirely.
function pathToData(path) {
  const n = (v) => Number(v.toFixed(2));
  let d = "";
  for (const c of path.commands) {
    if (c.type === "M") d += `M${n(c.x)} ${n(c.y)} `;
    else if (c.type === "L") d += `L${n(c.x)} ${n(c.y)} `;
    else if (c.type === "C")
      d += `C${n(c.x1)} ${n(c.y1)} ${n(c.x2)} ${n(c.y2)} ${n(c.x)} ${n(c.y)} `;
    else if (c.type === "Q") d += `Q${n(c.x1)} ${n(c.y1)} ${n(c.x)} ${n(c.y)} `;
    else if (c.type === "Z") d += "Z ";
  }
  return d.trim();
}

function textPath(font, text, x, y, size, attrs = "") {
  const d = pathToData(font.getPath(text, x, y, size));
  return `<path d="${d}" ${attrs}/>`;
}

function width(font, text, size) {
  return font.getAdvanceWidth(text, size);
}

// Greedy word-wrap: pack words into lines no wider than maxW at `size`.
function wrap(font, text, size, maxW) {
  const words = text.split(" ");
  const lines = [];
  let line = "";
  for (const w of words) {
    const trial = line ? `${line} ${w}` : w;
    if (line && width(font, trial, size) > maxW) {
      lines.push(line);
      line = w;
    } else {
      line = trial;
    }
  }
  if (line) lines.push(line);
  return lines;
}

/**
 * The shared SVG: field, green bar, wordmark eyebrow, wrapped title, and the
 * site footer. Title auto-shrinks so the widest line fits the text column.
 */
function baseSVG(title, footerAlign = "right") {
  let size = 100;
  const LH = () => Math.round(size * 1.06);
  let lines = wrap(fraunces, title, size, TEXT_MAX_W);
  // Shrink until every line fits and the block is at most two lines tall.
  while (
    size > 52 &&
    (lines.length > 2 ||
      lines.some((l) => width(fraunces, l, size) > TEXT_MAX_W))
  ) {
    size -= 3;
    lines = wrap(fraunces, title, size, TEXT_MAX_W);
  }

  const lh = LH();
  const blockH = lines.length * lh;
  // Vertically center the title block within the area below the wordmark and
  // above the footer (~210…545); baseline sits at ~0.74 of the line box.
  const centerY = 372;
  let baseline = Math.round(centerY - blockH / 2 + lh * 0.74);
  const titlePaths = lines
    .map((l) => {
      const p = textPath(
        fraunces,
        l,
        MARGIN,
        baseline,
        size,
        `fill="${CREAM_BRIGHT}"`,
      );
      baseline += lh;
      return p;
    })
    .join("\n");

  const siteW = width(inter, SITE, 38);
  const siteX = footerAlign === "left" ? MARGIN : WIDTH - MARGIN - siteW;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}">
<rect width="${WIDTH}" height="${HEIGHT}" fill="${INK}"/>
<rect x="${MARGIN}" y="114" width="160" height="10" fill="${GREEN}"/>
${textPath(inter, WORDMARK, MARGIN, 188, 40, `fill="${CREAM}" fill-opacity="0.78"`)}
${titlePaths}
${textPath(inter, SITE, siteX, 574, 38, `fill="${GREEN_LIGHT}"`)}
</svg>`;
}

// A rounded-corner square tile cropped (cover) from a source image.
async function roundedTile(src, sizePx, radius) {
  const base = await sharp(src)
    .resize(sizePx, sizePx, { fit: "cover", position: "centre" })
    .toBuffer();
  const mask = Buffer.from(
    `<svg width="${sizePx}" height="${sizePx}"><rect width="${sizePx}" height="${sizePx}" rx="${radius}" ry="${radius}"/></svg>`,
  );
  return sharp(base)
    .composite([{ input: mask, blend: "dest-in" }])
    .png()
    .toBuffer();
}

async function writeCard(slug, svg, composites) {
  await sharp(Buffer.from(svg))
    .composite(composites)
    .png({ compressionLevel: 9, palette: true })
    .toFile(path.join(OUT_DIR, `${slug}.png`));
}

// --- Cards ---------------------------------------------------------------

// Gold LSC emblem, right-of-center, on the seamless ink field.
async function emblemCard(slug, title) {
  const d = 340;
  const cx = 955;
  const cy = 345;
  const logo = await sharp(path.join(IMAGES, "lsc-logo.png"))
    .resize(d, d)
    .toBuffer();
  await writeCard(slug, baseSVG(title), [
    { input: logo, left: Math.round(cx - d / 2), top: Math.round(cy - d / 2) },
  ]);
}

// LIT Bible's own green-disc logo inside a brand-green ring.
async function litBibleCard() {
  const cx = 955;
  const cy = 345;
  const ringR = 172;
  const d = 300;
  const svg = baseSVG("The LIT Bible").replace(
    "</svg>",
    `<circle cx="${cx}" cy="${cy}" r="${ringR}" fill="none" stroke="${GREEN}" stroke-width="6"/></svg>`,
  );
  const logo = await sharp(path.join(__dirname, "og", "lit-logo.png"))
    .resize(d, d)
    .toBuffer();
  await writeCard("og-lit-bible", svg, [
    { input: logo, left: Math.round(cx - d / 2), top: Math.round(cy - d / 2) },
  ]);
}

// The two podcast covers as rounded tiles, stacked on the right. Both source
// images are already square show art, so no crop loses their titles. The
// footer URL moves left here so it clears the lower tile.
async function podcastsCard() {
  const tile = 224;
  const radius = 26;
  const x = WIDTH - MARGIN - tile; // right edge aligned with the footer margin
  const gap = 28;
  const totalH = tile * 2 + gap;
  const top = Math.round((HEIGHT - totalH) / 2);
  const fit = await roundedTile(path.join(IMAGES, "fit-cover.webp"), tile, radius);
  const twb = await roundedTile(path.join(IMAGES, "twb-square.png"), tile, radius);
  await writeCard("og-podcasts", baseSVG("Podcasts", "left"), [
    { input: fit, left: x, top },
    { input: twb, left: x, top: top + tile + gap },
  ]);
}

// --- Run -----------------------------------------------------------------

mkdirSync(OUT_DIR, { recursive: true });

await emblemCard("og-home", "Scripture that liberates rather than controls");
await emblemCard("og-support", "Support the Work");
await emblemCard("og-spiritual-direction", "Spiritual Companionship");
await litBibleCard();
await podcastsCard();

console.log("build-og-images: wrote 5 cards to public/assets/og/");
