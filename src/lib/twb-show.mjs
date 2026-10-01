// src/lib/twb-show.mjs
//
// Everything specific to The Table We're Building that the page
// (src/pages/table-were-building.astro) and the feed fetcher
// (scripts/fetch-podcast-feed.mjs) share. Change an id here and both follow.
//
// The show is hosted on Spotify for Creators (formerly Anchor), which
// publishes the RSS feed below and distributes it to Apple and Spotify. That
// feed's own <link> points at https://liberatingscripture.org/table-were-building/,
// so the page's URL is not ours to change without changing the feed too.

/** The RSS feed. Apple, Spotify and every other podcast app read this. */
export const FEED_URL = "https://anchor.fm/s/1073d93a4/podcast/rss";

/** Apple Podcasts show id; also the key for Apple's public lookup API. */
export const APPLE_ID = "6817089730";
export const APPLE_URL = `https://podcasts.apple.com/us/podcast/the-table-were-building/id${APPLE_ID}`;

/** Spotify show id: the show page, and the show embed on /table-were-building/. */
export const SPOTIFY_SHOW_ID = "2HRCvjrMHmJyIPjhAxAWUT";
export const SPOTIFY_URL = `https://open.spotify.com/show/${SPOTIFY_SHOW_ID}`;

/**
 * Per-episode links the feed can't supply, keyed by the episode's title as it
 * appears in the feed (smart quotes, dash style and trailing punctuation don't
 * need to match exactly).
 *
 * Apple links are NOT needed here: the fetcher pulls Apple's own episode list
 * and joins it to the feed automatically. Spotify's are, because nothing
 * public maps a feed episode to its open.spotify.com URL. When an episode
 * drops, add its Spotify link (Share → Copy link to episode in the Spotify
 * app) here; until you do, its card just shows Apple. An `apple` entry here
 * overrides the automatic one, for the rare case it is wrong.
 *
 * @type {Record<string, import("./podcast-feed.mjs").EpisodeLinkOverride>}
 */
export const EPISODE_LINKS = {
  "Teaser for The Table We're Building": {
    spotify: "https://open.spotify.com/episode/41pjtZmOjqUtJUoA4bZfZq",
  },
};
