// test/podcast-feed.test.mjs
//
// Unit tests for src/lib/podcast-feed.mjs, the pure parsing core behind
// /table-were-building/. Run with `npm test` (node:test, no dependencies).
// Every fixture is a small inline <item> shaped like the real Spotify for
// Creators feed, which is why titles and notes come wrapped in CDATA.

import { test } from "node:test";
import assert from "node:assert/strict";

import {
  cleanUrl,
  decodeEntities,
  formatDuration,
  formatEpisodeDate,
  htmlToParagraphs,
  isoDuration,
  latestAppleEmbedUrl,
  parseDuration,
  parseFeed,
  readAttr,
  readTag,
  slugify,
  summarize,
  toAppleEmbedUrl,
} from "../src/lib/podcast-feed.mjs";

function item({
  title = "Episode One",
  guid = "guid-1",
  type = "full",
  pubDate = "Sun, 27 Sep 2026 02:57:25 GMT",
  duration = "00:42:10",
  notes = "<p>First paragraph.</p><p>Second paragraph.</p>",
  season = null,
  episode = null,
} = {}) {
  return [
    "<item>",
    `<title><![CDATA[${title}]]></title>`,
    `<description><![CDATA[${notes}]]></description>`,
    `<guid isPermaLink="false">${guid}</guid>`,
    `<pubDate>${pubDate}</pubDate>`,
    `<enclosure url="https://example.com/${guid}.mp3?a=1&amp;b=2" length="1" type="audio/mpeg"/>`,
    `<itunes:duration>${duration}</itunes:duration>`,
    `<itunes:episodeType>${type}</itunes:episodeType>`,
    season === null ? "" : `<itunes:season>${season}</itunes:season>`,
    episode === null ? "" : `<itunes:episode>${episode}</itunes:episode>`,
    "</item>",
  ].join("\n");
}

const feed = (...items) => `<rss><channel><title>Show</title>${items.join("\n")}</channel></rss>`;

// ---------------------------------------------------------------- readTag

test("readTag: a tag never matches a longer tag it prefixes", () => {
  // The litbible regression: <itunes:episode> must not open on <itunes:episodeType>.
  const xml = "<itunes:episodeType>full</itunes:episodeType><itunes:episode>7</itunes:episode>";
  assert.equal(readTag(xml, "itunes:episode"), "7");
  assert.equal(readTag(xml, "itunes:episodeType"), "full");
});

test("readTag: CDATA is returned as written; plain text is entity-decoded", () => {
  assert.equal(readTag("<t><![CDATA[a &amp; <b>]]></t>", "t"), "a &amp; <b>");
  assert.equal(readTag("<t>a &amp; b &#39;c&#39;</t>", "t"), "a & b 'c'");
  assert.equal(readTag("<x>1</x>", "t"), "");
});

test("readTag: the channel <title> isn't mistaken for <itunes:title>", () => {
  assert.equal(readTag("<itunes:title>A</itunes:title><title>B</title>", "title"), "B");
});

test("readAttr: reads and decodes an attribute on a self-closing tag", () => {
  assert.equal(
    readAttr('<enclosure url="https://x/a.mp3?a=1&amp;b=2" type="audio/mpeg"/>', "enclosure", "url"),
    "https://x/a.mp3?a=1&b=2",
  );
  assert.equal(readAttr("<item></item>", "enclosure", "url"), "");
});

test("decodeEntities: &amp; is decoded last, so a double-escape survives once", () => {
  assert.equal(decodeEntities("&amp;lt;"), "&lt;");
  assert.equal(decodeEntities("We&rsquo;re &#x2014; &bogus;"), "We’re — &bogus;");
});

// ---------------------------------------------------------------- notes

test("htmlToParagraphs / summarize: plain text from show-notes HTML", () => {
  const html = "<p>One <a href='x'>link</a>,<br>same para &amp; more.</p>\n<p>Two.</p>";
  assert.deepEqual(htmlToParagraphs(html), ["One link, same para & more.", "Two."]);
  assert.equal(summarize(html), "One link, same para & more.");
});

test("summarize: cuts a long first paragraph at a word boundary", () => {
  const long = `<p>${"word ".repeat(100)}</p>`;
  const out = summarize(long, 40);
  assert.ok(out.length <= 41, out);
  assert.ok(out.endsWith("word…"), out);
  assert.equal(summarize(""), "");
});

// ---------------------------------------------------------------- durations & dates

test("parseDuration accepts HH:MM:SS, MM:SS and seconds", () => {
  assert.equal(parseDuration("00:05:55"), 355);
  assert.equal(parseDuration("42:10"), 2530);
  assert.equal(parseDuration("355"), 355);
  assert.equal(parseDuration(""), null);
  assert.equal(parseDuration("about an hour"), null);
});

test("formatDuration / isoDuration", () => {
  assert.equal(formatDuration(355), "6 min");
  assert.equal(formatDuration(20), "1 min");
  assert.equal(formatDuration(3600), "1 hr");
  assert.equal(formatDuration(4350), "1 hr 13 min");
  assert.equal(isoDuration(355), "PT5M55S");
  assert.equal(isoDuration(3600), "PT1H");
  assert.equal(isoDuration(0), "PT0S");
});

test("formatEpisodeDate uses the hosts' Pacific date, not UTC's", () => {
  // 02:57 UTC on the 27th is the evening of the 26th in Los Angeles.
  const d = formatEpisodeDate(new Date("2026-09-27T02:57:25Z"));
  assert.deepEqual(d, { iso: "2026-09-26", display: "September 26, 2026" });
});

// ---------------------------------------------------------------- links

test("cleanUrl strips share-tracking params and nothing else", () => {
  assert.equal(
    cleanUrl("https://open.spotify.com/episode/41pj?si=abc&utm_source=generator"),
    "https://open.spotify.com/episode/41pj",
  );
  assert.equal(
    cleanUrl("https://podcasts.apple.com/us/podcast/x/id1?i=1000&uo=4"),
    "https://podcasts.apple.com/us/podcast/x/id1?i=1000",
  );
  assert.equal(cleanUrl("not a url"), "not a url");
});

test("toAppleEmbedUrl: episodes only", () => {
  assert.equal(
    toAppleEmbedUrl("https://podcasts.apple.com/us/podcast/teaser/id6817089730?i=1000792076900"),
    "https://embed.podcasts.apple.com/us/podcast/teaser/id6817089730?i=1000792076900&itsct=podcast_box_player&itscg=30200&ls=1&theme=auto",
  );
  assert.equal(toAppleEmbedUrl("https://podcasts.apple.com/us/podcast/show/id6817089730"), null);
  assert.equal(toAppleEmbedUrl("https://example.com/?i=1"), null);
  assert.equal(toAppleEmbedUrl("garbage"), null);
});

test("slugify makes fragment ids", () => {
  assert.equal(slugify("Teaser for The Table We're Building"), "teaser-for-the-table-were-building");
  assert.equal(slugify("Vélez & Smith: Part 2!"), "velez-smith-part-2");
  assert.equal(slugify("!!!"), "episode");
});

// ---------------------------------------------------------------- parseFeed

test("parseFeed keeps trailers and types them", () => {
  const [ep] = parseFeed(feed(item({ type: "trailer", title: "Teaser" })));
  assert.equal(ep.type, "trailer");
  assert.equal(ep.title, "Teaser");
});

test("parseFeed reads the fields the page renders", () => {
  const [ep] = parseFeed(feed(item({ season: "1", episode: "3" })));
  assert.equal(ep.id, "episode-episode-one");
  assert.equal(ep.guid, "guid-1");
  assert.equal(ep.type, "full");
  assert.equal(ep.season, "1");
  assert.equal(ep.episode, "3");
  assert.equal(ep.durationSeconds, 2530);
  assert.equal(ep.summary, "First paragraph.");
  assert.equal(ep.audioUrl, "https://example.com/guid-1.mp3?a=1&b=2");
  assert.equal(ep.published?.toISOString(), "2026-09-27T02:57:25.000Z");
  assert.deepEqual(ep.links, []);
});

test("parseFeed joins Apple links on guid, then on title", () => {
  const xml = feed(item({ title: "A", guid: "g-a" }), item({ title: "B: Part Two", guid: "g-b" }));
  const eps = parseFeed(xml, {
    appleEpisodes: [
      { guid: "g-a", title: "Renamed on Apple", url: "https://podcasts.apple.com/us/podcast/a/id1?i=1&uo=4" },
      { guid: "other", title: "B – Part Two", url: "https://podcasts.apple.com/us/podcast/b/id1?i=2" },
    ],
  });
  const apple = (t) => eps.find((e) => e.title === t).links.find((l) => l.platform === "apple")?.url;
  assert.equal(apple("A"), "https://podcasts.apple.com/us/podcast/a/id1?i=1");
  assert.equal(apple("B: Part Two"), undefined, "title fallback needs a matching title, not a near one");
});

test("parseFeed: overrides add Spotify, win over Apple, and match loosely", () => {
  const xml = feed(item({ title: "We’re Here!", guid: "g" }));
  const [ep] = parseFeed(xml, {
    appleEpisodes: [{ guid: "g", title: "x", url: "https://podcasts.apple.com/us/podcast/x/id1?i=1" }],
    overrides: {
      "We're Here": {
        spotify: "https://open.spotify.com/episode/abc?si=zzz",
        apple: "https://podcasts.apple.com/us/podcast/fixed/id1?i=9",
      },
    },
  });
  assert.deepEqual(
    ep.links.map((l) => [l.platform, l.label, l.url]),
    [
      ["apple", "Apple Podcasts", "https://podcasts.apple.com/us/podcast/fixed/id1?i=9"],
      ["spotify", "Spotify", "https://open.spotify.com/episode/abc"],
    ],
  );
});

test("parseFeed sorts newest first; duplicate titles keep the OLDER one's id", () => {
  // Newest first, as real feeds ship: the order that would hand the bare id
  // to the newcomer if ids followed feed order.
  const xml = feed(
    item({ title: "Undated", guid: "u", pubDate: "" }),
    item({ title: "Same", guid: "new", pubDate: "Mon, 01 Jun 2026 00:00:00 GMT" }),
    item({ title: "Same", guid: "old", pubDate: "Mon, 01 Jan 2026 00:00:00 GMT" }),
  );
  const eps = parseFeed(xml);
  assert.deepEqual(eps.map((e) => e.guid), ["new", "old", "u"]);
  // The older "Same" was published first, so it owns the bare id for good.
  assert.deepEqual(eps.map((e) => e.id), ["episode-same-2", "episode-same", "episode-undated"]);
  assert.equal(eps.find((e) => e.guid === "old").id, "episode-same");
  assert.equal(eps[2].published, null);
});

test("parseFeed: an empty feed is an empty list, not an error", () => {
  assert.deepEqual(parseFeed(feed()), []);
});

test("latestAppleEmbedUrl skips the newest episode while Apple hasn't listed it", () => {
  const xml = feed(
    item({ title: "New", guid: "new", pubDate: "Mon, 01 Jun 2026 00:00:00 GMT" }),
    item({ title: "Old", guid: "old", pubDate: "Mon, 01 Jan 2026 00:00:00 GMT" }),
  );
  const eps = parseFeed(xml, {
    appleEpisodes: [{ guid: "old", title: "Old", url: "https://podcasts.apple.com/us/podcast/old/id1?i=5" }],
  });
  assert.match(latestAppleEmbedUrl(eps), /^https:\/\/embed\.podcasts\.apple\.com\/us\/podcast\/old\/id1\?i=5&/);
  assert.equal(latestAppleEmbedUrl(parseFeed(feed(item()))), null);
});
