# liberatingscripture.org

Site for the **Liberating Scripture Collective** — the organization behind the LIT Bible.

Built with [Astro 5](https://astro.build). Deployed via GitHub Pages (CNAME → liberatingscripture.org).

## Stack

- **Framework**: Astro 5 (static)
- **Language**: TypeScript (strict)
- **Styling**: Vanilla CSS — shared design system with litbible.net
- **Fonts**: Crimson Text, Inter, Fraunces (self-hosted via @fontsource)
- **Forms**: Formspree + Cloudflare Turnstile
- **Donations**: Give Lively (embed in `/support/`)

## Commands

```bash
npm install       # Install dependencies
npm run dev       # Start dev server at localhost:4321
npm run build     # Build to ./dist/
npm run preview   # Preview build locally
```

## Structure

```
src/
  components/     # SiteHeader, SiteFooter
  layouts/        # Layout.astro (base HTML shell)
  pages/          # index, about, support, podcasts,
                  # community, spiritual-direction,
                  # contact, 404
  styles/         # global.css (full design system)
public/
  assets/
    images/       # ← Drop all images here
    og/           # ← OG images here
  CNAME
  robots.txt
  site.webmanifest
  favicon*.png / favicon.ico / apple-touch-icon.png
```

## Image assets needed

Place these in `public/assets/images/`:

| File | Used on |
|------|---------|
| `lsc-logo.png` | Header, footer, homepage hero, about hero |
| `fit-cover.webp` | Podcasts page (Found in Translation) |
| `twb-banner.png` | Podcasts page (The Table We're Building) |

Place OG images in `public/assets/og/`:

| File | Used on |
|------|---------|
| `og-default.png` | All pages (1200×630) |
| `og-square.png` | Square OG variant (1200×1200) |

Place favicon files directly in `public/`:

- `favicon.ico`
- `favicon-16x16.png`
- `favicon-32x32.png`
- `apple-touch-icon.png`
- `android-chrome-192x192.png`
- `android-chrome-512x512.png`

## Before going live

- [ ] Drop all image assets into `public/assets/images/` and `public/assets/og/`
- [ ] Drop favicon files into `public/`
- [ ] Replace Give Lively placeholder in `src/pages/support.astro` with live embed
- [ ] Update Formspree ID in `src/pages/contact.astro` if it changed
- [ ] Update Cloudflare Turnstile sitekey if it changed
- [ ] Update 501(c)(3) language in `src/pages/support.astro` and `src/pages/about.astro` when confirmed
- [ ] Replace working values in `src/pages/index.astro` with finalized list
- [ ] Verify social handles and external links

## Design system

Shared with litbible.net. See `src/styles/global.css`.

| Token | Value |
|-------|-------|
| `--cream` | `#E1DFD9` |
| `--green` | `#209D50` |
| `--ink` | `#1D231C` |
| `--white` | `#FFFFFF` |
| `--black` | `#000000` |

Fonts: Crimson Text (headings) · Inter (body) · Fraunces (display/pull quotes)

## Deployment

Deploys from `main` branch to GitHub Pages. The `public/CNAME` file sets the custom domain.
