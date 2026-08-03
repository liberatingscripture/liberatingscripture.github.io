#!/usr/bin/env node
/**
 * check-apps-mirror — verify the /apps page's mirrored files still match
 * litbible's.
 *
 * The /apps page here is a mirror of litbible.net/apps. Every file in
 * MIRRORED below is meant to be byte-for-byte identical to the file at the
 * same path in the litbible repo. This script fetches litbible's `main`
 * copies and compares them.
 *
 * Deliberately NOT mirrored, and why:
 *   - src/pages/apps.astro          two sites cannot share a canonical URL,
 *                                   so its Layout props + JSON-LD are ours
 *   - src/styles/pages/apps-bridge.css  LSC-only; exists precisely so that
 *                                   apps.css can stay a pure mirror
 *
 * Absent for a different reason:
 *   - public/assets/screenshots/*   these ARE byte-identical to litbible's
 *                                   now, but this script reads every file as
 *                                   UTF-8 and folds CRLF (see lf() below),
 *                                   which corrupts binary comparison. Covering
 *                                   them means reading Buffers and comparing
 *                                   hashes for binary extensions. Until then
 *                                   they are mirrored by hand.
 *
 * Usage:
 *   node scripts/check-apps-mirror.mjs           compare against litbible main
 *   node scripts/check-apps-mirror.mjs --changed <files...>
 *       only check the given paths (CI passes a PR's changed files, so an
 *       unrelated PR doesn't fail just because litbible has moved ahead)
 *   node scripts/check-apps-mirror.mjs --local ../litbible
 *       compare against a litbible working copy instead of GitHub, for
 *       checking a pair of branches before either is pushed
 *
 * LITBIBLE_REF overrides the branch fetched from (default "main").
 *
 * Exit codes: 0 in sync, 1 drift found, 2 could not reach litbible.
 */

import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";

const UPSTREAM = "liberatingscripture/litbible";
const REF = process.env.LITBIBLE_REF || "main";

/** Files that must be byte-identical to litbible's copy at the same path. */
export const MIRRORED = [
  "src/components/apps/AboutTranslation.astro",
  "src/components/apps/AppIcons.astro",
  "src/components/apps/BigScreens.astro",
  "src/components/apps/ChurchYearCarousel.astro",
  "src/components/apps/ExamplesSlider.astro",
  "src/components/apps/Hero.astro",
  "src/components/apps/HumaneByDesign.astro",
  "src/components/apps/JoinBeta.astro",
  "src/components/apps/PlatformIcon.astro",
  "src/components/apps/ReaderCallouts.astro",
  "src/styles/pages/apps.css",
  "src/content/callouts/continuous-reading.md",
  "src/content/callouts/highlight-note-sync.md",
  "src/content/callouts/the-day-youre-in.md",
  "src/content/examples/john-1-1-5.md",
  "src/content/examples/matthew-5-beatitudes.md",
  "src/content/examples/romans-12.md",
  "src/content/examples/romans-3.md",
  "src/content/seasons/advent.md",
  "src/content/seasons/christmas.md",
  "src/content/seasons/easter.md",
  "src/content/seasons/lent.md",
  "src/content/seasons/ordinary-time.md",
];

/** Both repos normalize to LF via .gitattributes; fold anyway so a Windows
 *  working copy doesn't report drift the committed blobs don't have. */
const lf = (s) => s.replace(/\r\n/g, "\n");

async function fetchUpstream(file, localRoot) {
  if (localRoot) {
    const p = path.join(localRoot, file);
    return existsSync(p) ? lf(await readFile(p, "utf8")) : null;
  }
  const url = `https://raw.githubusercontent.com/${UPSTREAM}/${REF}/${file}`;
  const res = await fetch(url);
  if (res.status === 404) return null;
  if (!res.ok) {
    throw new Error(`${url} → HTTP ${res.status}`);
  }
  return lf(await res.text());
}

async function main() {
  const argv = process.argv.slice(2);
  const changedAt = argv.indexOf("--changed");
  const localAt = argv.indexOf("--local");
  const localRoot = localAt === -1 ? null : argv[localAt + 1];
  let files = MIRRORED;

  if (localAt !== -1 && !localRoot) {
    console.error("check-apps-mirror: --local needs a path to a litbible checkout");
    return 2;
  }

  if (changedAt !== -1) {
    const only = new Set(
      argv.slice(changedAt + 1).filter((a) => !a.startsWith("--") && a !== localRoot)
    );
    files = MIRRORED.filter((f) => only.has(f));
    if (files.length === 0) {
      console.log("check-apps-mirror: no mirrored files in this change — OK");
      return 0;
    }
  }

  const drift = [];
  const missing = [];

  for (const file of files) {
    let upstream;
    try {
      upstream = await fetchUpstream(file, localRoot);
    } catch (err) {
      console.error(`check-apps-mirror: could not reach litbible — ${err.message}`);
      return 2;
    }

    if (upstream === null) {
      missing.push(`${file} — no longer exists on litbible ${REF}`);
      continue;
    }
    if (!existsSync(file)) {
      missing.push(`${file} — exists on litbible but not here`);
      continue;
    }

    const local = lf(await readFile(file, "utf8"));
    if (local !== upstream) drift.push(file);
  }

  const source = localRoot ? localRoot : `litbible ${REF}`;

  if (drift.length === 0 && missing.length === 0) {
    console.log(
      `check-apps-mirror: OK — ${files.length} mirrored file(s) match ${source}.`
    );
    return 0;
  }

  console.error("check-apps-mirror: the /apps mirror has drifted.\n");
  for (const f of drift) console.error(`  differs from litbible: ${f}`);
  for (const m of missing) console.error(`  ${m}`);
  console.error(
    [
      "",
      "These files are meant to be byte-for-byte identical to litbible's.",
      "Fix by copying litbible's version across, not by editing it here:",
      "",
      ...drift.map(
        (f) =>
          `  curl -fsSL https://raw.githubusercontent.com/${UPSTREAM}/${REF}/${f} -o ${f}`
      ),
      "",
      "If the change is genuinely LSC-only, it belongs in",
      "src/styles/pages/apps-bridge.css (styling) or src/pages/apps.astro",
      "(page shell) instead — those two are not mirrored.",
    ].join("\n")
  );
  return 1;
}

main().then((code) => process.exit(code));
