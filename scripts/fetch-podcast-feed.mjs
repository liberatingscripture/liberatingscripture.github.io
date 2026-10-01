#!/usr/bin/env node
/**
 * fetch-podcast-feed.mjs — refresh the committed snapshots behind
 * /table-were-building/. It is the first step of `npm run build` (so every
 * deploy, including the scheduled daily one, lists the latest episodes) and
 * can be run alone as `npm run fetch:podcast`.
 *
 * Two sources, each with its own snapshot:
 *
 *   1. The show's RSS feed            → src/data/twb-feed.xml
 *   2. Apple's public iTunes lookup   → src/data/twb-apple-episodes.json
 *      for the show's episodes          ({ guid, title, url } per episode)
 *
 * The second is how each episode gets its Apple Podcasts link, and the page
 * its Apple player, without anyone pasting them in: Apple reports every
 * episode's RSS guid, so parseFeed joins the two on it.
 *
 * This script NEVER fails the build. If a source is unreachable or returns
 * something that doesn't look right, it warns and leaves that source's last
 * committed snapshot in place, so a Spotify or Apple outage can't break a
 * deploy. (Same contract as litbible.net's fetcher for Found in Translation.)
 *
 * Running it locally can change the snapshots; commit them with whatever else
 * you're shipping. They're snapshots, not caches: the build reads only them.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { cleanUrl } from "../src/lib/podcast-feed.mjs";
import { APPLE_ID, FEED_URL } from "../src/lib/twb-show.mjs";

const TIMEOUT_MS = 15_000;
// Apple's lookup returns at most 200 episodes. Snapshot entries are merged
// rather than replaced (below), so a show that outgrows it keeps the links it
// already has; only episodes past the 200 newest would go unlinked.
const APPLE_LOOKUP = `https://itunes.apple.com/lookup?id=${APPLE_ID}&entity=podcastEpisode&limit=200`;

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA = path.resolve(__dirname, "..", "src", "data");
const FEED_OUT = path.join(DATA, "twb-feed.xml");
const APPLE_OUT = path.join(DATA, "twb-apple-episodes.json");

function writeIfChanged(file, text, what) {
  const previous = existsSync(file) ? readFileSync(file, "utf-8") : null;
  if (previous === text) {
    console.log(`✅ ${what} unchanged.`);
  } else {
    mkdirSync(path.dirname(file), { recursive: true });
    writeFileSync(file, text, "utf-8");
    console.log(`✅ ${what} updated: ${path.relative(process.cwd(), file)}`);
  }
}

function warn(file, what, e) {
  if (existsSync(file)) {
    console.warn(`⚠ ${what} fetch failed (${e.message}) — building with the existing snapshot.`);
  } else {
    console.error(`✗ ${what} fetch failed (${e.message}) and no snapshot exists yet.`);
  }
}

async function get(url) {
  const res = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT_MS) });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res;
}

async function refreshFeed() {
  try {
    // LF only: the repo stores text as LF (.gitattributes), so a CRLF feed
    // would otherwise read as "changed" on every run.
    const xml = (await (await get(FEED_URL)).text()).replace(/\r\n?/g, "\n");
    // An error page or a captive portal must not overwrite a good snapshot.
    // (Zero <item>s is allowed: that's a valid feed, just an empty one.)
    if (!/<rss[\s>]/.test(xml) || !xml.includes("<channel>")) {
      throw new Error("response does not look like an RSS feed");
    }
    writeIfChanged(FEED_OUT, xml, "Podcast feed snapshot");
  } catch (e) {
    warn(FEED_OUT, "Podcast feed", e);
  }
}

async function refreshApple() {
  try {
    const data = await (await get(APPLE_LOOKUP)).json();
    const results = Array.isArray(data?.results) ? data.results : [];
    // The show's own record comes back first. Without it, this isn't a real
    // answer about this show (Apple returns an empty 200 for unknown ids).
    if (!results.some((r) => String(r.collectionId) === APPLE_ID && r.kind === "podcast")) {
      throw new Error("lookup did not return the show");
    }

    // Merge over the previous snapshot instead of replacing it. Apple's lookup
    // is occasionally partial, and an Apple episode URL never changes once
    // issued, so keeping an entry is always safe and dropping one never is.
    const byGuid = new Map();
    if (existsSync(APPLE_OUT)) {
      for (const e of JSON.parse(readFileSync(APPLE_OUT, "utf-8"))) byGuid.set(e.guid, e);
    }
    for (const r of results) {
      if (r.kind !== "podcast-episode" || !r.episodeGuid || !r.trackViewUrl) continue;
      byGuid.set(r.episodeGuid, {
        guid: r.episodeGuid,
        title: r.trackName,
        url: cleanUrl(r.trackViewUrl),
      });
    }

    // Newest first (Apple's episode ids only grow), so the file diffs cleanly.
    const episodeId = (e) => Number(new URL(e.url).searchParams.get("i")) || 0;
    const entries = [...byGuid.values()].sort((a, b) => episodeId(b) - episodeId(a));
    writeIfChanged(APPLE_OUT, `${JSON.stringify(entries, null, 2)}\n`, "Apple episode list");
  } catch (e) {
    warn(APPLE_OUT, "Apple episode list", e);
  }
}

await Promise.all([refreshFeed(), refreshApple()]);
