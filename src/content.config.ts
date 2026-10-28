import { appsCollections } from "./components/apps/collections";

// The /apps page's collections (callouts, examples, seasons, appsSections) are
// defined in the mirrored src/components/apps/collections.ts, so the schemas
// are litbible's own rather than a pasted copy. See CLAUDE.md "Apps Page".
export const collections = {
  ...appsCollections,
};
