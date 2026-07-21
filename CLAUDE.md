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
- **Fonts**: Self-hosted via `@fontsource`, Latin subsets only (Crimson Text,
  Inter, Fraunces)
- **Deploy**: GitHub Actions → GitHub Pages (see Deployment below)

## Commands

```bash
npm install      # Install dependencies
npm run dev      # Dev server at localhost:4321
npm run build    # Production build to dist/
npm run preview  # Preview the production build
npm run check    # astro check (type/diagnostics) — also runs in CI on every
                 #   push/PR, before the build
npm run build:og # Regenerate the per-page OG cards (one-shot; not in the build)
```

## Structure

```
src/
  components/
    SiteHeader.astro    # Sticky header with mobile menu
    SiteFooter.astro    # Dark footer + the Brevo newsletter form (see Privacy)
    AppsLaunchPopover.astro # LIT Bible app announcement modal (see Popover)
    AppIcons.astro      # The iOS + Android app icons as a matched pair
    PlatformIcon.astro  # Apple / Android marks for the store links
    apps/               # /apps page sections, ported verbatim from litbible
                        #   (see Apps Page): Hero, ExamplesSlider,
                        #   ReaderCallouts, ChurchYearCarousel, BigScreens,
                        #   HumaneByDesign, JoinBeta, AboutTranslation. These
                        #   import the top-level AppIcons/PlatformIcon above
                        #   rather than forking their own copies.
  content.config.ts     # Astro content collections backing /apps: callouts,
                        #   examples, seasons (see Apps Page) — ported from
                        #   litbible; no other collections exist here
  content/
    callouts/, examples/, seasons/ # /apps section copy as markdown
                        #   frontmatter + body, ported from litbible verbatim
  layouts/
    Layout.astro        # Base HTML shell (SEO/OG, fonts, favicons, header/footer,
                        #   and the one announcement popover)
  pages/                # One .astro per route (static):
    index.astro         #   Homepage
    about.astro         #   About LSC
    lit-bible.astro     #   Landing page for the LIT Bible
    apps.astro          #   The LIT Bible iOS/Android apps (see Apps Page)
    support.astro       #   Donate + get involved (Give Lively embed)
    podcasts.astro      #   Hub for both podcasts
    community.astro     #   Community & Courses
    spiritual-direction.astro #  "Spiritual Companionship" page (URL kept as
                        #     /spiritual-direction/; wording is the umbrella term)
    contact.astro       #   Contact form (posts to the contact Worker)
    contact/thanks.astro #  Native-POST success page (Worker 303s here as a
                        #     fallback when fetch fails/unavailable; noindex)
    privacy.astro       #   Privacy policy (covers this site AND the LIT Bible
                        #     apps; app sections mirror litbible — see Privacy)
    404.astro
  styles/
    global.css          # Full design system (see Design System below)
    pages/
      apps.css          # /apps's own stylesheet — litbible's apps.css ported
                        #   verbatim, plus an LSC bridge ahead of it (see
                        #   Apps Page). Imported ONLY by pages/apps.astro.
public/                 # Served as-is at the site root:
  assets/images/        # Logos, podcast art, hero images, and both app icons
                        #   (lit-app-icon.svg = Android, *-ios.webp = iOS)
  assets/screenshots/   # App screenshots for /apps, as WebP (converted from
                        #   litbible's PNGs — see Apps Page)
    carousel/           #   Hebrews 1 in each of the five liturgical seasons,
                        #     for ChurchYearCarousel
  assets/og/            # Open Graph share images: og-default.png (site-wide
                        #   fallback) + per-page cards from scripts/ (F5)
  CNAME                 # Custom domain for GitHub Pages
  favicon.svg, favicon.ico, favicon-96x96.png, apple-touch-icon.png,
  web-app-manifest-*.png, site.webmanifest, robots.txt
  llms.txt, llms-full.txt   # LLM-readable site description
  .well-known/
    apple-developer-merchantid-domain-association # Apple Pay domain
                        #   verification for the Give Lively donate widget —
                        #   don't delete
    security.txt        # RFC 9116 vulnerability-disclosure pointer (S16)
scripts/
  build-og-images.mjs   # One-shot per-page OG-card generator (sharp +
                        #   opentype.js). Run by hand: `npm run build:og`; NOT
                        #   part of the build. Commits PNGs to public/assets/og/
  og/                   # Card source assets: committed fonts (+ OFL) and
                        #   lit-logo.png (copied from litbible, not shipped)
workers/
  contact-form/         # Cloudflare Worker backing /contact/submit — NOT part
                        #   of the site build; deployed separately via wrangler
                        #   (see its README)
.github/workflows/
  deploy.yml            # Build + deploy to GitHub Pages on push to main
docs/
  security-headers.md   # Cloudflare header setup the owner applies (FIXLIST OW1)
DISASTER-RECOVERY.md    # Dashboards/secrets/redeploy path (repo root; not shipped)
SECURITY.md, CONTRIBUTING.md, CODE_OF_CONDUCT.md # Community-health files
                        #   (repo root; GitHub surfaces these automatically)
.editorconfig, .gitattributes # Editor/line-ending conventions (repo root)
```

> Everything that ships lives in `src/` and `public/`; `scripts/` and the repo
> root hold build-time tooling, config, and docs that don't ship. Favicons,
> `CNAME`, the manifest, and the sitemap all come from `public/` (or are
> generated into `dist/`), not the repo root.

## Deployment

`.github/workflows/deploy.yml` runs on every push to `main`, on pull requests,
and via manual dispatch: it `npm ci`s, `npm run check`s, `npm run build`s,
uploads `dist/` as a Pages artifact, and deploys to GitHub Pages. The `deploy`
job is skipped on pull requests (`if: github.event_name != 'pull_request'`),
so PRs build and type-check but never publish. The custom domain comes from
`public/CNAME` (liberatingscripture.org). Push to `main` is the site deploy.

Dependency updates: this repo follows litbible's precedent of enabling
GitHub's native Dependabot security-alert toggle (Settings → Security →
Dependabot alerts) rather than committing a `dependabot.yml` — that toggle
surfaces vulnerabilities with zero recurring version-bump PRs to review,
which litbible's own audit judged the better tradeoff for a small team.

One nuance: the domain's DNS is on **Cloudflare with the proxy enabled**, so
Cloudflare sits in front of GitHub Pages. That's what lets the contact-form
Worker (`workers/contact-form/`) own the `/contact/submit` path at the edge —
it deploys separately via `wrangler` (owner-run, see its README), not with the
site. Security response headers (HSTS, CSP, etc.) are also Cloudflare edge
config, not in the repo — the setup checklist is `docs/security-headers.md`.

For the full picture of what lives only in third-party dashboards — every
account, secret (by name), and the from-zero redeploy path — see
`DISASTER-RECOVERY.md` in the repo root. Keep it current when a dashboard,
secret, or integration changes.

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

### Buttons must use the CTA tokens, never raw `--ink`

`--ink` is theme-invariant, and the dark page background (`#1a1e1a`) sits
almost exactly on top of it. Anything painted directly onto `var(--ink)` —
a fill, a border, or text — **disappears in dark mode**. That's what made the
site's buttons invisible there: `.btn` and `.btn--outline` hardcoded
`--ink`/`--green`, and the header CTA did the same with `!important`.

Four semantic tokens carry the flip; consume these rather than the raw colors:

| Token | Light | Dark |
|-------|-------|------|
| `--cta-bg` / `--cta-text` | `--ink` / `--green` | `#d4d2cc` / `#1a1e1a` |
| `--btn-outline-fg` | `--ink` | `--text` |
| `--btn-outline-fg-hover` | `--green` | `--page-bg` |

Because the flip lives in tokens rather than in `@media` blocks that re-declare
properties, per-page overrides keep working on specificity alone — the footer,
the index and support heroes, and 404 all set their own button colors for the
colored surfaces they sit on, and those still win. Add new button variants the
same way.

Two known-soft spots, both pre-existing and left as-is: the footer's solid CTA
is an ink pill on the ink footer (reads as green text, no visible shape) in
*both* themes, and hero `.btn--green` on a `--green-deep` hero has ~1.9:1 edge
contrast. Text contrast passes in both cases; only the button outline is faint.

## External Integrations

These are configured in-page; update the IDs/keys here if they ever change:

- **Contact form Worker** — the form posts to `/contact/submit`, a Cloudflare
  Worker in `workers/contact-form/` (Turnstile verified server-side, per-IP
  rate limit, delivery via Email Routing from `contact@liberatingscripture.org`).
  Native POSTs (the form's fallback when `fetch` is unavailable or fails) land
  on `/contact/thanks/` — Turnstile still requires JS to render, so this isn't
  a true no-JS path. Replaced Formspree (`xdkqvlkj`, retired).
- **Cloudflare Turnstile** — bot protection on the contact form. Sitekey
  `0x4AAAAAACJ446flkL7Rwf8i` in `src/pages/contact.astro`; the matching
  secret key lives in the Worker's `TURNSTILE_SECRET` secret. The footer
  newsletter renders a **second**, separate Turnstile widget of our own,
  dedicated to this domain (`0x4AAAAAAD6VVgt-e5g_YNul`) — which is why
  `/contact/` carries two. Two consequences, both already handled: the
  footer's loader skips injecting `turnstile/v0/api.js` when the page already
  has it, and `contact.astro` resets its widget by container
  (`turnstile.reset("#contact-turnstile")`) rather than with a bare `reset()`,
  which is ambiguous with two widgets.
- **Brevo** — the footer newsletter (`SiteFooter.astro`), posting to **LSC's
  own list/form**, in the same Brevo account as litbible.net but a dedicated
  list (not litbible's translation-update list). **We do not load Brevo's
  `main.js`** — see "The newsletter submits itself" below. Turnstile is
  lazy-loaded on first hover/focus of the form; the POST is our own `fetch`.
  **The enforced CSP's `form-action` must list `sibforms.com`** or the POST is
  silently blocked; see `docs/security-headers.md`.
- **Give Lively** — donations (live; slug `liberating-scripture-collective`).
  Widget embedded in `src/pages/support.astro`.
- **Apple Podcasts** — Found in Translation podcast ID `1586737797`.
- **Spotify** — Found in Translation podcast ID `6S2wWaM5oqknwncPfOEyZ6`.
- **YouTube** — `@foundintranslationpodcast`.
- **App Store** — LIT Bible app ID `6772577879`.
- **Google Play** — LIT Bible package `com.litbible.app`.

The store URLs appear in three places, mirroring litbible.net's own apps.astro
exactly: `apps.astro`'s `IOS_URL`/`ANDROID_URL` consts (used only by its
JSON-LD) and hardcoded literally inside `components/apps/Hero.astro` and
`components/apps/JoinBeta.astro` (the actual store buttons). Update all three
if a store URL ever changes. The apps themselves are built and shipped from
the litbible side; this site only links to them.

## Apps Page & Announcement Popover

`/apps` tells the LIT Bible app's story on this site, and
`AppsLaunchPopover.astro` announces it. `/apps` is a **verbatim port** of
litbible.net/apps — it should render identically to litbible's page except for
LSC's own header/footer. **When litbible's `/apps` changes, re-copy it here**
(see below for exactly what that means).

- **The page is a port, not a rewrite.** It used to retell the same content in
  LSC's own design system; that drifted visibly from litbible's actual page
  (a missing hero image, the wrong background) and was replaced with a real
  port: litbible's `src/pages/apps.astro` shell (with LSC's own SEO
  title/canonical/OG/JSON-LD kept), its `src/styles/pages/apps.css`, its 8
  `components/apps/` section components (`Hero`, `ExamplesSlider`,
  `ReaderCallouts`, `ChurchYearCarousel`, `BigScreens`, `HumaneByDesign`,
  `JoinBeta`, `AboutTranslation`), and its three content collections
  (`callouts`, `examples`, `seasons` — `src/content.config.ts` +
  `src/content/`, driving the callout cards and the season carousel from
  markdown `image:`/copy frontmatter). litbible's `ExampleSideBySide.astro`
  was **not** ported — it's unused dead code even in litbible's own repo
  (not imported by `ExamplesSlider.astro` or anything else there), so
  porting it would add a file with no rendering effect. The ported
  components import LSC's existing top-level `AppIcons.astro` /
  `PlatformIcon.astro` rather than forking their own copies — they already
  match litbible's byte-for-byte. Screenshots were converted from litbible's
  PNGs to WebP and live in `public/assets/screenshots/`.
- **`apps.css` carries an "LSC bridge" ahead of litbible's verbatim CSS,
  in a specific order that matters.** litbible's `apps.css` intentionally
  inherits several tokens (`--serif`, `--text`, `--text-strong`,
  `--surface-raised`, `--green`, `--green-text`) from litbible's *own*
  `global.css` rather than redefining them. LSC's `global.css` either doesn't
  define those tokens at all or defines different values for the same names,
  so the bridge redeclares litbible's actual values, scoped inside `.apps`
  only — **this never changes an LSC global token** (see Design System: "do
  not change token values"); every page outside `/apps` is unaffected. The
  bridge also resets the handful of properties LSC's site-wide `.btn` class
  would otherwise leak into these promo buttons (litbible has no global
  `.btn` to cancel), and reproduces one line from litbible's global
  `.container` (`padding-bottom: 80px`) that genuinely is part of
  litbible.net's rendering. The bridge's `.btn` reset **must stay physically
  before** litbible's verbatim `.btn-primary`/`.btn-secondary` rules in the
  file: both selectors are the same specificity (two classes), so within one
  stylesheet the later rule wins ties on shared properties. Bridge-first lets
  litbible's own rules (later, in the verbatim section) win back what they
  actually set — background, border, hover colors — while the bridge's
  resets only stick where litbible is silent (LSC's uppercase text, its
  swipe-fill `::before`, the `position`/`overflow`/`isolation` trick behind
  it, `nowrap`). Getting this backwards is a real, easy-to-miss bug: it
  silently produced a transparent primary button and a borderless secondary
  button here, caught only by diffing computed styles against the live
  litbible.net page in both themes — a visual glance didn't catch it. If you
  touch this file, re-verify computed styles (`getComputedStyle`, not just
  eyeballing) against litbible.net before trusting a change.
- **The body background is set by `apps.css`, not a Layout prop.** litbible's
  `apps.astro` passes `Layout bg="white"`, which litbible's `global.css`
  resolves to `body { background: var(--surface-raised) }` (`#FAFAF8` light /
  `#1d1d1f` dark). LSC's `Layout.astro` has no such prop, so `apps.css`
  (imported *only* by `apps.astro`) sets a literal `body` background instead
  — page-scoped by construction, since Astro only ships a page's imported CSS
  to that page. Don't import `apps.css` from anywhere else, or this leaks
  site-wide.
- **The season colors live in `apps.css` now**, ported verbatim with the rest
  of the file — they're litbible's own liturgical palette
  (`--season-advent`, etc.), not LSC design tokens. Keep the two in agreement
  if litbible's palette changes. Auto-advance pauses on hover and focus, and
  doesn't start at all under `prefers-reduced-motion`.
- **The popover is the site's single announcement slot.** `Layout.astro`
  renders exactly one. It shows once per visitor (cookie `lsc_apps_launch_v1`,
  30 days) and only from the **2nd pageview of a session**, never on a session
  entrance — a modal on a search-landing page is what Google's
  intrusive-interstitial penalty targets. It's also suppressed on `/apps` (its
  own CTA destination), `/lit-bible` (which carries the announcement in-page),
  `/privacy`, and `/contact/thanks`.

### The two app icons

The platforms ship **different art**, and both are shown wherever the app is
announced (popover, the `/lit-bible` band, the `/apps` closing CTA, and the OG
card) — `AppIcons.astro` renders the pair at a given `size`:

- **iOS** — `lit-app-icon-ios.webp`, the full leather-book artwork. Pulled from
  the App Store listing's artwork CDN (via the public iTunes lookup for id
  `6772577879`) at 1024px and re-encoded to 512px WebP. It carries its own
  background, so it only needs the corner radius. If the store icon is ever
  redesigned, re-pull it from the same place.
- **Android** — `lit-app-icon.svg`, the bare gradient mark on transparency. Its
  lime end washes out on light surfaces, so it wears an ink tile (`#1b2318`)
  that's fixed rather than tokenised, so it can't invert in dark mode.

Two traps, both already handled inside `AppIcons.astro` — reproduce them if you
ever render an icon outside it:

- **Padding must be fixed, not a percentage.** Percentage padding resolves
  against the *containing block*, not the icon, so `padding: 9%` inside the
  full-width `/lit-bible` band became 88px and collapsed the mark to nothing.
- **The Android tile needs lifting on the OG card.** `#1b2318` is all but
  identical to the card's `INK` field, so the tile vanishes and the mark looks
  like it floats next to a properly-tiled iOS icon. `build-og-images.mjs` uses
  `#2A3227` there for that reason only.

## The newsletter submits itself — don't reintroduce Brevo's `main.js`

The footer newsletter in `SiteFooter.astro` posts with its **own `fetch`**, not
with `https://sibforms.com/forms/end-form/build/main.js`. This is deliberate and
was arrived at by debugging a silent failure, so don't "restore" the script.

**Why.** Brevo's `main.js` binds to the structural markup its generated snippet
ships with: `.sib-form`, `#sib-form-container`, `#sib-container`,
`.form__entry.entry_block` / `.entry__field` wrappers, `.sib-form-block__button`
on the button, and `id="EMAIL"` on the input. Restyling the form into this
site's design system drops all of it. The script then loads **without any
error**, never attaches a submit handler, and pressing Subscribe does
*nothing* — no request, no message, no console output. It was verified live in
2026-07-21 on both this site and litbible.net (which carries the same ported
markup and fails identically) by instrumenting the page and confirming zero XHR
or fetch on submit.

**What replaced it.** The submit handler validates the email, reads the
Turnstile token from the hidden `cf-turnstile-response` input the widget
injects, and POSTs `EMAIL` + `email_address_check` (honeypot, empty) + `locale`
+ `cf-turnstile-response` as form-urlencoded. The sibforms endpoint supports
CORS and returns a readable status, so success/failure drive the two status
panels. On failure the widget is reset — Turnstile tokens are single-use.

Consequences worth knowing:

- **The button no longer ships `disabled`.** It used to be disabled until
  `main.js` loaded and re-enabled it, which meant a JS failure left a dead
  button. Now it's live immediately, and with JS off it falls through to a
  native POST (Turnstile still needs JS, so that isn't a true no-JS path —
  same caveat as the contact form).
- **The fixed Brevo ids no longer matter functionally.** `sib-form`,
  `sib-captcha`, `error-message`, `success-message` are kept for continuity
  with litbible, but nothing external depends on them now.
- **Keep the honeypot and `locale` hidden fields** — Brevo still expects both
  in the POST body.

## Privacy Policy (`/privacy`)

The policy covers **this site and the LIT Bible apps**, and is deliberately
kept in step with `litbible.net/privacy`. Like `/apps`, treat it as mirrored
content: **when either site's policy changes, change both.**

- **The app sections are shared text.** *Your reading data*, *Content updates*,
  *The home screen widget*, *Sharing*, *Third-party software*, and *Children*
  are the same copy on both sites. litbible.net/privacy is the **policy of
  record** — it's the URL the App Store and Play listings point at — and the
  Scope section says so, so the two can't silently contradict each other.
- **The site sections are not shared, and shouldn't be.** Each site describes
  its own data flows: LSC *embeds* the Give Lively widget on `/support/` (a
  first-party flow needing a real disclosure), where litbible only links out.
  LSC has one contact form; litbible has contact + app-support. Don't flatten
  these toward litbible's wording.
- **Cookies must match the code.** The policy names `lsc_apps_launch_v1` and
  the `lsc_pv` session counter because `AppsLaunchPopover.astro` sets them. If
  the popover's storage changes, or a component starts setting anything new,
  update the Cookies paragraph in the same change — a privacy policy that
  under-reports storage is worse than one that says nothing.
- Bump the effective date **and** the JSON-LD `dateModified` together.

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
