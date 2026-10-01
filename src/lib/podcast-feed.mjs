// src/lib/podcast-feed.mjs
//
// The pure parsing core behind /table-were-building/: a podcast RSS feed, plus
// Apple's episode list and any hand-entered links, in; an Episode[] out.
//
// It imports nothing, and that is the point. The page reads the feed with a
// Vite `?raw` import that Node cannot resolve, so if the parsing lived there,
// `node --test` could never reach it. litbible.net learned this the hard way:
// its first feed parser matched `<itunes:episodeType>` when asked for
// `<itunes:episode>`, on every episode, and no test could see it. Its fix was
// the same split — a pure core plus a thin shell — and this file is that core,
// written fresh for a show with no chapter links but with trailers that must
// stay visible. It's plain .mjs (the lsc-mark.mjs precedent) so the build
// script and the tests load it with no TypeScript step at all.
//
// Show-specific facts (feed URL, Apple id, Spotify links) live in
// ./twb-show.mjs, not here.

/**
 * @typedef {"apple" | "spotify"} Platform
 * @typedef {{ platform: Platform, label: string, url: string }} EpisodeLink
 * @typedef {{ guid: string, title: string, url: string }} AppleEpisode
 * @typedef {Partial<Record<Platform, string>>} EpisodeLinkOverride
 * @typedef {{
 *   id: string,
 *   guid: string,
 *   title: string,
 *   type: "full" | "bonus" | "trailer",
 *   season?: string,
 *   episode?: string,
 *   published: Date | null,
 *   durationSeconds: number | null,
 *   summary: string,
 *   audioUrl?: string,
 *   links: EpisodeLink[],
 * }} Episode
 */

/** @type {Record<Platform, string>} */
export const PLATFORM_LABELS = {
  apple: "Apple Podcasts",
  spotify: "Spotify",
};

/** @type {Platform[]} */
const PLATFORM_ORDER = ["apple", "spotify"];

// The show's hosts are on the US West Coast, as are litbible.net's, whose
// podcast page uses the same zone. An episode published at 7pm Pacific is
// "that day" to its hosts, not the next day in UTC.
const DISPLAY_TIME_ZONE = "America/Los_Angeles";

const NAMED_ENTITIES = {
  nbsp: " ",
  lsquo: "‘",
  rsquo: "’",
  ldquo: "“",
  rdquo: "”",
  ndash: "–",
  mdash: "—",
  hellip: "…",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
};

/** Decode XML/HTML character references. `&amp;` goes last, so `&amp;lt;` stays `&lt;`. */
export function decodeEntities(str) {
  return str
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(Number(dec)))
    .replace(/&([a-z]+);/gi, (whole, name) =>
      name === "amp" ? whole : NAMED_ENTITIES[name.toLowerCase()] ?? whole,
    )
    .replace(/&amp;/g, "&");
}

function escapeForRegExp(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// `(?=[\s/>])` ends the tag NAME, so a tag can't match a longer tag it
// prefixes: without it `<itunes:episode[^>]*>` happily opens on
// `<itunes:episodeType>` (the litbible bug described in the header).
function openTagPattern(tag) {
  return `<${escapeForRegExp(tag)}(?=[\\s/>])[^>]*>`;
}

/**
 * The text of the first `<tag>` in `xml`. CDATA content comes back as written;
 * plain content has its character references decoded, since that is what the
 * XML means. Returns "" when the tag is absent.
 */
export function readTag(xml, tag) {
  const close = `<\\/${escapeForRegExp(tag)}>`;
  const cdata = new RegExp(`${openTagPattern(tag)}\\s*<!\\[CDATA\\[([\\s\\S]*?)\\]\\]>\\s*${close}`, "i").exec(xml);
  if (cdata) return cdata[1];
  const plain = new RegExp(`${openTagPattern(tag)}([\\s\\S]*?)${close}`, "i").exec(xml);
  return plain ? decodeEntities(plain[1]) : "";
}

/** The value of `attr` on the first `<tag …>` in `xml`, or "". */
export function readAttr(xml, tag, attr) {
  const open = new RegExp(openTagPattern(tag), "i").exec(xml);
  if (!open) return "";
  const value = new RegExp(`\\s${escapeForRegExp(attr)}=(["'])([\\s\\S]*?)\\1`, "i").exec(open[0]);
  return value ? decodeEntities(value[2]) : "";
}

/**
 * Show-notes HTML to plain-text paragraphs. The page never renders feed HTML
 * (the feed is a third-party document, and set:html on it would trust it
 * with the page), so this is the only form the notes reach the page in.
 */
export function htmlToParagraphs(html) {
  return decodeEntities(
    html
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/(p|div|li|h[1-6]|blockquote)>/gi, "\n\n")
      .replace(/<[^>]*>/g, ""),
  )
    .split(/\n\s*\n/)
    .map((p) => p.replace(/\s+/g, " ").trim())
    .filter(Boolean);
}

/** The first paragraph of the notes, cut at a word boundary if it runs long. */
export function summarize(html, maxChars = 320) {
  const first = htmlToParagraphs(html)[0] ?? "";
  if (first.length <= maxChars) return first;
  const cut = first.slice(0, maxChars + 1);
  const lastSpace = cut.lastIndexOf(" ");
  return `${cut.slice(0, lastSpace > 0 ? lastSpace : maxChars).replace(/[\s,;:.–—-]+$/, "")}…`;
}

/** `itunes:duration` ("HH:MM:SS", "MM:SS", or plain seconds) to seconds, or null. */
export function parseDuration(value) {
  const v = String(value ?? "").trim();
  if (!/^\d+(:\d{1,2}){0,2}$/.test(v)) return null;
  return v.split(":").reduce((total, part) => total * 60 + Number(part), 0) || null;
}

/** "6 min", "1 hr", "1 hr 12 min" — how podcast apps label a length. */
export function formatDuration(seconds) {
  const minutes = Math.max(1, Math.round(seconds / 60));
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (!h) return `${m} min`;
  return m ? `${h} hr ${m} min` : `${h} hr`;
}

/** ISO 8601 duration for `<time datetime>` and JSON-LD: 355 → "PT5M55S". */
export function isoDuration(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return `PT${h ? `${h}H` : ""}${m ? `${m}M` : ""}${s || (!h && !m) ? `${s}S` : ""}`;
}

/** An episode's calendar date in the hosts' zone, as `<time>` wants it. */
export function formatEpisodeDate(date) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", {
      timeZone: DISPLAY_TIME_ZONE,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    })
      .formatToParts(date)
      .map((p) => [p.type, p.value]),
  );
  return {
    iso: `${parts.year}-${parts.month}-${parts.day}`,
    display: date.toLocaleDateString("en-US", {
      timeZone: DISPLAY_TIME_ZONE,
      year: "numeric",
      month: "long",
      day: "numeric",
    }),
  };
}

/** Title comparison that survives smart quotes, dash style and stray punctuation. */
export function normalizeTitle(title) {
  return title
    .toLowerCase()
    .replace(/[–—]/g, "-")
    .replace(/[‘’‚]/g, "'")
    .replace(/[“”„]/g, '"')
    .replace(/[!?:.]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** A fragment id for an episode's card: "Teaser for The Table We're Building" → "teaser-for-the-table-were-building". */
export function slugify(title) {
  return (
    title
      .normalize("NFKD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .replace(/['’]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "episode"
  );
}

// Share/attribution params that platforms append to copied links. `si` on a
// Spotify link ties the share back to the account that copied it; `uo` and
// `utm_*` are referral tags. None change what the link opens.
const TRACKING_PARAMS = /^(si|uo|utm_[a-z]+)$/i;

/** A link with its share-tracking params removed. Unparseable input is returned as-is. */
export function cleanUrl(url) {
  try {
    const u = new URL(url);
    for (const key of [...u.searchParams.keys()]) {
      if (TRACKING_PARAMS.test(key)) u.searchParams.delete(key);
    }
    return u.toString();
  } catch {
    return url;
  }
}

/**
 * An Apple Podcasts EPISODE URL to the URL its embed player is served from, or
 * null for anything else (a show URL, another host, garbage).
 *
 * Episode, not show, on purpose. Apple's show embed no longer lists recent
 * episodes: it renders one card whose only play button is the show's trailer,
 * which litbible.net found after its "Latest episodes" section spent months
 * offering a 2021 teaser. An episode embed still plays that episode. The query
 * params are the ones Apple's own embed generator emits.
 */
export function toAppleEmbedUrl(url) {
  try {
    const u = new URL(url);
    if (u.hostname !== "podcasts.apple.com" && u.hostname !== "embed.podcasts.apple.com") {
      return null;
    }
    const episodeId = u.searchParams.get("i");
    if (!episodeId) return null;
    const embed = new URL(`https://embed.podcasts.apple.com${u.pathname}`);
    embed.searchParams.set("i", episodeId);
    embed.searchParams.set("itsct", "podcast_box_player");
    embed.searchParams.set("itscg", "30200");
    embed.searchParams.set("ls", "1");
    embed.searchParams.set("theme", "auto");
    return embed.toString();
  } catch {
    return null;
  }
}

/**
 * The Apple embed URL for the newest episode that has an Apple link, or null.
 * It skips past episodes without one rather than giving up: Apple ingests a
 * new episode minutes to hours after the feed carries it, and the previous
 * episode is a better player than none.
 *
 * @param {Episode[]} episodes newest first, as parseFeed returns them
 */
export function latestAppleEmbedUrl(episodes) {
  for (const ep of episodes) {
    const apple = ep.links.find((l) => l.platform === "apple");
    const embed = apple && toAppleEmbedUrl(apple.url);
    if (embed) return embed;
  }
  return null;
}

/**
 * Parse a podcast RSS feed into the episodes the page lists, newest first.
 *
 * Trailers are KEPT and typed as such. litbible.net's parser drops them, which
 * is right for a 100-episode archive and wrong here: a new show's trailer is
 * its first and, for a while, only episode.
 *
 * Each episode's Apple link comes from `appleEpisodes` (Apple's own episode
 * list, joined on the RSS guid, falling back to the title); `overrides`, keyed
 * by episode title, supplies what the feed can't (Spotify's episode URLs) and
 * wins over the Apple join where both exist, since a hand-entered link is a
 * deliberate correction.
 *
 * @param {string} xml
 * @param {{ appleEpisodes?: AppleEpisode[], overrides?: Record<string, EpisodeLinkOverride> }} [sources]
 * @returns {Episode[]}
 */
export function parseFeed(xml, { appleEpisodes = [], overrides = {} } = {}) {
  const appleByGuid = new Map();
  const appleByTitle = new Map();
  for (const a of appleEpisodes) {
    if (a.guid) appleByGuid.set(a.guid, a.url);
    if (a.title) appleByTitle.set(normalizeTitle(a.title), a.url);
  }
  const overrideByTitle = new Map(
    Object.entries(overrides).map(([title, links]) => [normalizeTitle(title), links]),
  );

  /** @type {Episode[]} */
  const episodes = [];

  for (const [, item] of xml.matchAll(/<item(?=[\s>])[^>]*>([\s\S]*?)<\/item>/g)) {
    const title = readTag(item, "title").trim();
    if (!title) continue;

    const guid = readTag(item, "guid").trim();
    const rawType = readTag(item, "itunes:episodeType").trim().toLowerCase();
    const type = rawType === "trailer" || rawType === "bonus" ? rawType : "full";
    const published = new Date(readTag(item, "pubDate").trim());
    const notes = readTag(item, "content:encoded") || readTag(item, "description");

    const key = normalizeTitle(title);
    const override = overrideByTitle.get(key) ?? {};
    /** @type {Partial<Record<Platform, string>>} */
    const found = {
      apple: appleByGuid.get(guid) ?? appleByTitle.get(key),
      ...override,
    };
    const links = PLATFORM_ORDER.filter((p) => found[p]).map((platform) => ({
      platform,
      label: PLATFORM_LABELS[platform],
      url: cleanUrl(/** @type {string} */ (found[platform])),
    }));

    episodes.push({
      id: "", // assigned below, once the order is known
      guid,
      title,
      type,
      season: readTag(item, "itunes:season").trim() || undefined,
      episode: readTag(item, "itunes:episode").trim() || undefined,
      published: Number.isNaN(published.getTime()) ? null : published,
      durationSeconds: parseDuration(readTag(item, "itunes:duration")),
      summary: summarize(notes),
      audioUrl: readAttr(item, "enclosure", "url") || undefined,
      links,
    });
  }

  // Hosts ship newest-first, but nothing in RSS promises it. Undated last.
  episodes.sort(
    (a, b) => (b.published?.getTime() ?? -Infinity) - (a.published?.getTime() ?? -Infinity),
  );

  // Fragment ids are handed out OLDEST first, so an episode's #id is fixed
  // the day it's published: a later episode reusing a title gets the "-2",
  // rather than taking the bare id and breaking every link to the original.
  const usedIds = new Set();
  for (const ep of [...episodes].reverse()) {
    const base = `episode-${slugify(ep.title)}`;
    let id = base;
    for (let n = 2; usedIds.has(id); n++) id = `${base}-${n}`;
    usedIds.add(id);
    ep.id = id;
  }
  return episodes;
}
