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

- **Framework**: Astro 6 (static site generator, `output` is static).
  Requires **Node 22.12+** (enforced via `engines` in `package.json`; CI uses Node 22)
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
    contact.astro       #   Contact form (posts to the contact Worker)
    contact/thanks.astro #  No-JS success page (Worker 303s here; noindex)
    privacy.astro       #   Privacy policy (covers this site only; LIT Bible
                        #     site + apps are covered by litbible.net/privacy)
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
workers/
  contact-form/         # Cloudflare Worker backing /contact/submit — NOT part
                        #   of the site build; deployed separately via wrangler
                        #   (see its README)
.github/workflows/
  deploy.yml            # Build + deploy to GitHub Pages on push to main
```

> Everything that ships lives in `src/` and `public/`; the repo root holds only
> config and docs. Favicons, `CNAME`, the manifest, and the sitemap all come
> from `public/` (or are generated into `dist/`), not the repo root.

## Deployment

`.github/workflows/deploy.yml` runs on every push to `main` (and via manual
dispatch): it `npm ci`s, `npm run build`s, uploads `dist/` as a Pages artifact,
and deploys to GitHub Pages. The custom domain comes from `public/CNAME`
(liberatingscripture.org). Push to `main` is the site deploy.

One nuance: the domain's DNS is on **Cloudflare with the proxy enabled**, so
Cloudflare sits in front of GitHub Pages. That's what lets the contact-form
Worker (`workers/contact-form/`) own the `/contact/submit` path at the edge —
it deploys separately via `wrangler` (owner-run, see its README), not with the
site.

## Design System

A single source of truth in `src/styles/global.css`. **Do not change token
values** — they're shared with litbible.net for visual consistency.

Colors:
- `--cream: #E1DFD9` — page background
- `--green: #209D50` — brand primary
- `--green-deep: #0F6B33` — deep green (shared with litbible): the green that
  light text passes on. Green hero surfaces use it so cream text reaches
  WCAG AA (5.0:1); plain `--green` never carries cream/white text (2.6:1 /
  3.5:1). Theme-invariant — never redefined in the dark-mode blocks.
- `--ink: #1D231C` — text / dark CTA background
- `--white: #FFFFFF` — raised surface
- `--black: #000000` — strong text

Fonts: Crimson Text (headings) · Inter (body) · Fraunces (display / pull quotes)

## External Integrations

These are configured in-page; update the IDs/keys here if they ever change:

- **Contact form Worker** — the form posts to `/contact/submit`, a Cloudflare
  Worker in `workers/contact-form/` (Turnstile verified server-side, per-IP
  rate limit, delivery via Email Routing from `contact@liberatingscripture.org`).
  No-JS POSTs land on `/contact/thanks/`. Replaced Formspree (`xdkqvlkj`,
  retired).
- **Cloudflare Turnstile** — bot protection on the contact form. Sitekey
  `0x4AAAAAACJ446flkL7Rwf8i` in `src/pages/contact.astro`; the matching
  secret key lives in the Worker's `TURNSTILE_SECRET` secret.
- **Give Lively** — donations (live; slug `liberating-scripture-collective`).
  Widget embedded in `src/pages/support.astro`.
- **Apple Podcasts** — Found in Translation podcast ID `1586737797`.
- **Spotify** — Found in Translation podcast ID `6S2wWaM5oqknwncPfOEyZ6`.
- **YouTube** — `@foundintranslationpodcast`.

## AI & Crawler Policy (`public/robots.txt`)

The site's stance is **allow AI search & citation, disallow AI training** — we
want the LIT discoverable and citable by AI systems, but not used as training
data. AI vendors expose separate user-agents for these two purposes, so
`robots.txt` treats them separately rather than blanket-allowing a vendor:

- **Allowed (search/citation):** `OAI-SearchBot`, `ChatGPT-User`,
  `Claude-SearchBot`, `Claude-User`, `PerplexityBot`, plus regular `Googlebot`
  via the `User-agent: *` group.
- **Disallowed (training):** `GPTBot`, `ClaudeBot`, `anthropic-ai`, `CCBot`.
- **Disallowed (low-value):** `Bytespider`, `PetalBot`.
- **`Google-Extended` is allowed on purpose.** It governs Google's Gemini AI use,
  and Google does *not* separate citation from training in it — it's one toggle.
  We keep it allowed to preserve AI citation, accepting that it also permits some
  Gemini training. Don't "fix" this to `Disallow` without that tradeoff in mind.

This is mirrored by a `Content-Signal: search=yes, ai-input=yes, ai-train=no`
directive (contentsignals.org) in the same file. **Keep the per-bot rules and the
Content-Signal line in agreement** — if one changes, change the other. Note these
are all advisory; they bind only crawlers that choose to honor robots.txt.

Why not the rest of the "agent readiness" checklist (Link headers, DNS-AID,
markdown content negotiation, API catalog, OAuth/MCP discovery, WebMCP)? This is
a **static site with no APIs or auth** — those items would advertise endpoints
that don't exist. (Cloudflare does proxy the domain — that's how the contact
Worker runs — so edge headers are *possible*; there's just nothing API-shaped
to advertise. litbible.net is the repo with a real public API.) `llms.txt` / `llms-full.txt`
are the right agent-discovery surface for a content site like this.

## Open Items

Tracked work lives in **`FIXLIST.md`** (repo root) — a living checklist from
the 2026-07-18 comprehensive audit, organized by which model should execute
each item (Sonnet / Opus / Fable / Owner), in the same format as litbible's.
Work from it, mark items done there, and add new audit findings to it rather
than to this section.

## Key Relationships

- **litbible.net** — the LIT Bible product site (separate repo, Astro, same
  design system). This site's `lit-bible.astro` links there; litbible.net's
  `/liberating-scripture-collective` page links back here.
- This repo is the **organizational** site; litbible.net is the **product**.
