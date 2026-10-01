# liberatingscripture.org

The website for the **Liberating Scripture Collective** — the 501(c)(3) nonprofit
behind the LIT Bible. This is the organization's home; the translation itself
lives at **[litbible.net](https://litbible.net)**.

Live at **[liberatingscripture.org](https://liberatingscripture.org)**.

## Stack

- **Framework**: [Astro](https://astro.build) 7 (static site)
- **Language**: TypeScript (strict)
- **Styling**: Vanilla CSS — a single design system, shared visually with litbible.net
- **Fonts**: Crimson Text, Inter, Fraunces (self-hosted via `@fontsource`)
- **Forms**: self-hosted Cloudflare Worker + Turnstile (contact page; see `workers/contact-form/`)
- **Donations**: Give Lively (embed on the support page)
- **Podcast**: The Table We're Building's page is built from its RSS feed,
  fetched at build time (Apple Podcasts and Spotify players embedded)
- **Newsletter**: Brevo (footer form; posts to the shared LIT Bible list)
- **Hosting**: GitHub Pages, deployed by GitHub Actions

## Getting started

You'll need [Node.js](https://nodejs.org) **v22.12 or newer** (required by Astro 7).

```sh
npm install      # Install dependencies
npm run dev      # Start the dev server at http://localhost:4321
```

## Commands

| Command | What it does |
| :------ | :----------- |
| `npm run dev` | Start the local dev server at `localhost:4321` |
| `npm run build` | Fetch the podcast feed, then build the production site to `dist/` |
| `npm run preview` | Preview the production build locally |
| `npm run check` | Run `astro check` (type checking / diagnostics) — also runs in CI |
| `npm test` | Run the unit tests in `test/` — also runs in CI |
| `npm run fetch:podcast` | Refresh just the podcast feed snapshots in `src/data/` |
| `npm run check:links` | Verify internal links in `dist/` resolve (run after `build`) — also runs in CI |
| `npm run build:brand` | Regenerate the favicons, app icons and logo rasters from the dove mark (one-shot; not part of the build — run before `build:og`) |
| `npm run build:og` | Regenerate the Open Graph share cards (one-shot; not part of the build) |
| `npm run build:images` | Regenerate the resized WebP images (one-shot; not part of the build) |

## Structure

```
src/
  components/   # SiteHeader, SiteFooter, AppsLaunchPopover, AppIcons,
                #   PlatformIcon, LscMark, apps/ (the /apps page sections,
                #   ported verbatim from litbible.net)
  content.config.ts, content/   # Content collections backing /apps
  lib/          # lsc-mark.mjs — the dove mark's geometry, shared by the
                #   LscMark component and the brand-asset generator; the
                #   podcast feed parser and The Table We're Building's ids
  data/         # Committed podcast feed snapshots (written by the build)
  layouts/      # Layout.astro (base HTML shell)
  pages/        # One file per route: index, about, lit-bible, apps, support,
                #   podcasts, table-were-building, community,
                #   spiritual-direction, contact, privacy, 404
  styles/       # global.css (the full design system) + pages/apps.css
public/         # Served at the site root: images, app screenshots, OG images,
                #   favicons, CNAME, robots.txt, site.webmanifest, .well-known/
scripts/        # Build-time tooling: the podcast feed fetcher, plus one-shot
                #   brand-asset, OG-card and image generators
test/           # Unit tests (node:test)
workers/        # Cloudflare Worker for the contact form (deployed separately)
.github/workflows/deploy.yml   # Builds and deploys to GitHub Pages
.github/dependabot.yml         # Grouped weekly/monthly dependency updates
```

## Deployment

Pushing to the `main` branch triggers `.github/workflows/deploy.yml`, which
builds the site and deploys `dist/` to GitHub Pages. The custom domain is set by
`public/CNAME`. There's nothing to deploy by hand — merging to `main` ships it.
The same workflow also rebuilds once a day, so new podcast episodes appear on
their own.

## Design system

A single design system in `src/styles/global.css`, kept visually consistent with
litbible.net. **Token values shouldn't be changed** without coordinating across
both sites.

| Token | Value |
|-------|-------|
| `--cream` | `#E1DFD9` |
| `--green` | `#209D50` |
| `--ink` | `#1D231C` |
| `--white` | `#FFFFFF` |
| `--black` | `#000000` |

Fonts: Crimson Text (headings) · Inter (body) · Fraunces (display / pull quotes)

## Working with Claude Code

This repo includes a `CLAUDE.md` file with deeper operational guidance for the
[Claude Code](https://claude.com/claude-code) AI assistant — deploy details,
external integrations, design tokens, and known leftover files. It's a useful
reference for humans too.

Open work is tracked in `FIXLIST.md` (repo root) — a living checklist from the
2026-07-18 site audit, grouped by which model (or the owner) should execute
each item.
