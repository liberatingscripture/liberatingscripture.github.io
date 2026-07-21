# liberatingscripture.org

The website for the **Liberating Scripture Collective** — the 501(c)(3) nonprofit
behind the LIT Bible. This is the organization's home; the translation itself
lives at **[litbible.net](https://litbible.net)**.

Live at **[liberatingscripture.org](https://liberatingscripture.org)**.

## Stack

- **Framework**: [Astro](https://astro.build) 6 (static site)
- **Language**: TypeScript (strict)
- **Styling**: Vanilla CSS — a single design system, shared visually with litbible.net
- **Fonts**: Crimson Text, Inter, Fraunces (self-hosted via `@fontsource`)
- **Forms**: self-hosted Cloudflare Worker + Turnstile (contact page; see `workers/contact-form/`)
- **Donations**: Give Lively (embed on the support page)
- **Newsletter**: Brevo (footer form; posts to the shared LIT Bible list)
- **Hosting**: GitHub Pages, deployed by GitHub Actions

## Getting started

You'll need [Node.js](https://nodejs.org) **v22.12 or newer** (required by Astro 6).

```sh
npm install      # Install dependencies
npm run dev      # Start the dev server at http://localhost:4321
```

## Commands

| Command | What it does |
| :------ | :----------- |
| `npm run dev` | Start the local dev server at `localhost:4321` |
| `npm run build` | Build the production site to `dist/` |
| `npm run preview` | Preview the production build locally |
| `npm run check` | Run `astro check` (type checking / diagnostics) — also runs in CI |
| `npm run build:og` | Regenerate the per-page Open Graph share cards (one-shot; not part of the build) |

## Structure

```
src/
  components/   # SiteHeader, SiteFooter, AppsLaunchPopover, AppIcons,
                #   PlatformIcon
  layouts/      # Layout.astro (base HTML shell)
  pages/        # One file per route: index, about, lit-bible, apps, support,
                #   podcasts, community, spiritual-direction, contact,
                #   privacy, 404
  styles/       # global.css (the full design system)
public/         # Served at the site root: images, app screenshots, OG images,
                #   favicons, CNAME, robots.txt, site.webmanifest, .well-known/
scripts/        # Build-time tooling (the one-shot OG-card generator)
workers/        # Cloudflare Worker for the contact form (deployed separately)
.github/workflows/deploy.yml   # Builds and deploys to GitHub Pages
```

## Deployment

Pushing to the `main` branch triggers `.github/workflows/deploy.yml`, which
builds the site and deploys `dist/` to GitHub Pages. The custom domain is set by
`public/CNAME`. There's nothing to deploy by hand — merging to `main` ships it.

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
