# liberatingscripture.org — Claude Code Instructions

> **Maintain this file.** It is the orientation doc for every future Claude Code
> session, so keep it accurate to how the repo *actually* works — not a changelog.
> When you change the tech stack, structure, pages, deploy setup, design tokens,
> or external integrations, update the relevant section here in the same change.
> Describe organizing principles and the "why," not one-off edits. If a section
> here contradicts the code, the code wins — fix the doc. Prune anything stale.
>
> **Update `README.md` too when appropriate.** It's the human-facing front door
> (lighter and friendlier; this file is the deep reference). When a change affects
> the overview, setup steps, commands, or high-level structure, update `README.md`
> in the same change, and keep it free of drift-prone specifics.

## Project Overview

The **Liberating Scripture Collective** (LSC) website — the organizational home of
the 501(c)(3) nonprofit behind the LIT Bible. The translation product itself lives
at **litbible.net** (a separate repo); this site is the org's front door: who LSC
is, its projects (podcasts, courses/community, spiritual direction), and ways to
support and get in touch. The site is **live** at liberatingscripture.org.

## Tech Stack

- **Framework**: Astro 5 (static site generator, `output` is static)
- **Language**: TypeScript (strict mode)
- **Styling**: Vanilla CSS — a single design system in `src/styles/global.css`,
  shared visually with litbible.net (no utility framework)
- **Fonts**: Self-hosted via `@fontsource` (Crimson Text, Inter, Fraunces)
- **Deploy**: GitHub Actions → GitHub Pages (see Deployment below)

## Commands

```bash
npm install      # Install dependencies
npm run dev      # Dev server at localhost:4321
npm run build    # Production build to dist/
npm run preview  # Preview the production build
npm run check    # astro check (type/diagnostics)
```

## Structure

```
src/
  components/
    SiteHeader.astro    # Sticky header with mobile menu
    SiteFooter.astro    # Dark footer
  layouts/
    Layout.astro        # Base HTML shell (SEO/OG, fonts, favicons, header/footer)
  pages/                # One .astro per route (static):
    index.astro         #   Homepage
    about.astro         #   About LSC
    lit-bible.astro     #   Landing page for the LIT Bible
    support.astro       #   Donate + get involved (Give Lively embed)
    podcasts.astro      #   Hub for both podcasts
    community.astro     #   Community & Courses
    spiritual-direction.astro
    contact.astro       #   Formspree + Turnstile contact form
    404.astro
  styles/
    global.css          # Full design system (see Design System below)
public/                 # Served as-is at the site root:
  assets/images/        # Logos, podcast art, hero images
  assets/og/            # Open Graph share images
  CNAME                 # Custom domain for GitHub Pages
  favicon.svg, favicon.ico, favicon-96x96.png, apple-touch-icon.png,
  web-app-manifest-*.png, site.webmanifest, robots.txt
  llms.txt, llms-full.txt   # LLM-readable site description
.github/workflows/
  deploy.yml            # Build + deploy to GitHub Pages on push to main
```

> **Stale root-level files (don't be fooled).** The repo root still tracks a few
> leftovers from an older "deploy from root" setup — `sitemap.xml`, `CNAME`,
> `site.webmanifest`, and an *outdated* favicon set (`favicon-16x16.png`,
> `favicon-32x32.png`, `android-chrome-*.png`). These are **not** what ships:
> deployment builds `dist/` via Actions, and `Layout.astro` references the
> favicons in `public/`. The current favicons live in `public/`. The empty
> `contact/`, `spiritual-direction/`, `table-were-building-podcast/`, and
> `partials/` directories at root are also leftovers. Safe to ignore; a cleanup
> commit removing them would be reasonable.

## Deployment

`.github/workflows/deploy.yml` runs on every push to `main` (and via manual
dispatch): it `npm ci`s, `npm run build`s, uploads `dist/` as a Pages artifact,
and deploys to GitHub Pages. The custom domain comes from `public/CNAME`
(liberatingscripture.org). There is no separate hosting config — push to `main`
is the deploy.

## Design System

A single source of truth in `src/styles/global.css`. **Do not change token
values** — they're shared with litbible.net for visual consistency.

Colors:
- `--cream: #E1DFD9` — page background
- `--green: #209D50` — brand primary
- `--ink: #1D231C` — text / dark CTA background
- `--white: #FFFFFF` — raised surface
- `--black: #000000` — strong text

Fonts: Crimson Text (headings) · Inter (body) · Fraunces (display / pull quotes)

## External Integrations

These are configured in-page; update the IDs/keys here if they ever change:

- **Formspree** — contact form submissions → email. Form action
  `https://formspree.io/f/xdkqvlkj` in `src/pages/contact.astro`.
- **Cloudflare Turnstile** — bot protection on the contact form. Sitekey
  `0x4AAAAAACJ446flkL7Rwf8i` in `src/pages/contact.astro`.
- **Give Lively** — donations (live; slug `liberating-scripture-collective`).
  Widget embedded in `src/pages/support.astro`.
- **Apple Podcasts** — Found in Translation podcast ID `1586737797`.
- **Spotify** — Found in Translation podcast ID `6S2wWaM5oqknwncPfOEyZ6`.
- **YouTube** — `@foundintranslationpodcast`.

## Open Items

- **Working values** — the placeholder values in the `values` array in
  `src/pages/index.astro` should be replaced with the finalized LSC values
  statement once drafted.

## Key Relationships

- **litbible.net** — the LIT Bible product site (separate repo, Astro, same
  design system). This site's `lit-bible.astro` links there; litbible.net's
  `/liberating-scripture-collective` page links back here.
- This repo is the **organizational** site; litbible.net is the **product**.
