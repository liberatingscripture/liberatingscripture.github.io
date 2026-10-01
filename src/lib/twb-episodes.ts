// src/lib/twb-episodes.ts
//
// The Table We're Building's episodes, parsed once from the committed feed
// snapshots, for every page that talks about the show: its own page, the
// /podcasts/ card, and the homepage project card.
//
// This is the thin shell around ./podcast-feed.mjs. The `?raw` import below
// is Vite-only, which is exactly why the parsing itself lives over there,
// where `node --test` can reach it.

import feedXml from "../data/twb-feed.xml?raw";
import appleEpisodes from "../data/twb-apple-episodes.json";
import { parseFeed } from "./podcast-feed.mjs";
import { EPISODE_LINKS } from "./twb-show.mjs";

export const episodes = parseFeed(feedXml, {
  appleEpisodes,
  overrides: EPISODE_LINKS,
});

/**
 * Whether the show has launched: true once the feed carries anything but a
 * trailer. Before that, every page presents it as coming soon, with the
 * trailer as the thing to hear. The first real episode flips all of them on
 * the next build (the daily scheduled one, at the latest), with no edits.
 */
export const launched = episodes.some((ep) => ep.type !== "trailer");
