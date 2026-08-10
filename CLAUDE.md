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

- **Framework**: Astro 7 (static site generator, `output` is static).
  Requires **Node 22.12+** (enforced via `engines` in `package.json`; CI uses Node 22)
- **Language**: TypeScript (strict mode)
- **Styling**: Vanilla CSS — a single design system in `src/styles/global.css`,
  shared visually with litbible.net (no utility framework). **`astro.config.mjs`
  pins `vite.build.cssTarget` — don't remove it**; see "Why cssTarget is pinned"
  below.
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
npm run check:links # Verify every internal href/#fragment in dist/ resolves
                 #   (reads dist/ only, no network — run AFTER build; also runs
                 #   in CI right after the build). See scripts/check-links.mjs
npm run build:brand # Regenerate every raster/SVG form of the LSC dove mark —
                 #   favicons, app icons, og-square, and the two lsc-mark PNGs
                 #   (one-shot; not in the build). Run BEFORE build:og.
npm run build:og # Regenerate the OG cards (one-shot; not in the build)
npm run build:images # Regenerate the right-sized WebP variants of the on-page
                 #   podcast art (one-shot; not in the build)
```

The contact-form Worker has its own test suite (`cd workers/contact-form &&
npm test`, vitest in real `workerd`); CI runs it as a separate `worker-tests`
job — see Deployment.

## Structure

```
src/
  components/
    SiteHeader.astro    # Sticky header with mobile menu
    SiteFooter.astro    # Dark footer + the Brevo newsletter form (see Privacy)
    AppsLaunchPopover.astro # LIT Bible app announcement modal (see Popover)
    LscMark.astro       # The LSC dove mark, inline (see The Brand Mark)
    apps/               # /apps sections, a byte-for-byte MIRROR of litbible's
                        #   (see Apps Page; enforced by apps-mirror.yml): Hero,
                        #   ExamplesSlider, ReaderCallouts, ChurchYearCarousel,
                        #   BigScreens, HumaneByDesign, JoinBeta,
                        #   AboutTranslation, plus AppIcons + PlatformIcon
                        #   (which live here, not top-level, so the imports
                        #   match litbible's). Edit these on litbible, not here.
                        #   rather than forking their own copies.
  content.config.ts     # Astro content collections backing /apps: callouts,
                        #   examples, seasons (see Apps Page) — ported from
                        #   litbible; no other collections exist here
  content/
    callouts/, examples/, seasons/ # /apps section copy as markdown
                        #   frontmatter + body, ported from litbible verbatim
  lib/
    lsc-mark.mjs        # The dove mark's path data + SVG builders — the single
                        #   source of truth, imported by BOTH LscMark.astro and
                        #   scripts/build-brand-assets.mjs (see The Brand Mark)
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
    unsubscribe.astro   #   Self-serve newsletter opt-out (noindex; hides the
                        #     footer newsletter — see The newsletter submits
                        #     itself). Reached from email footers, not nav.
    privacy.astro       #   Privacy policy (covers this site AND the LIT Bible
                        #     apps; app sections mirror litbible — see Privacy)
    404.astro
  styles/
    global.css          # Full design system (see Design System below)
    pages/
      unsubscribe.css   # /unsubscribe's own stylesheet (ported from litbible)
      apps-bridge.css   # LSC-only half of /apps styling. Imported by
                        #   pages/apps.astro BEFORE apps.css — that order is
                        #   load-bearing (see Apps Page).
      apps.css          # Byte-for-byte MIRROR of litbible's apps.css. Never
                        #   hand-edit here; change it on litbible and copy the
                        #   whole file across. Imported ONLY by pages/apps.astro.
public/                 # Served as-is at the site root:
  assets/images/        # Podcast art, hero images, and both app icons
                        #   (lit-app-icon.svg = Android, *-ios.webp = iOS), plus
                        #   lsc-mark.png / lsc-mark-inverse.png from
                        #   `build:brand` — raster forms of the dove mark, for
                        #   JSON-LD and the OG composite only (pages inline the
                        #   mark instead; see The Brand Mark). The full-res
                        #   twb-banner.png stays for JSON-LD/crawlers; the
                        #   podcasts page loads twb-banner-480.webp from
                        #   `build:images` (O3)
  assets/screenshots/   # App screenshots for /apps, as WebP — copied byte-for-
                        #   byte from litbible, but by hand, not CI (see Apps Page)
    carousel/           #   Hebrews 1 in each of the five liturgical seasons,
                        #     for ChurchYearCarousel
  assets/og/            # Open Graph share images: og-default.png (site-wide
                        #   fallback) + per-page cards, all from `build:og` (F5).
                        #   og-square.png is unreferenced in-repo but kept
                        #   intentionally (OW4) as a ready square brand asset
                        #   for possible future use — don't delete it in an
                        #   unused-assets sweep; `build:brand` regenerates it.
  CNAME                 # Custom domain for GitHub Pages
  favicon.svg, favicon.ico, favicon-96x96.png, apple-touch-icon.png,
  web-app-manifest-*.png # All from `build:brand` — don't hand-edit
  site.webmanifest, robots.txt
  llms.txt, llms-full.txt   # LLM-readable site description
  .well-known/
    apple-developer-merchantid-domain-association # Apple Pay domain
                        #   verification for the Give Lively donate widget —
                        #   don't delete
    security.txt        # RFC 9116 vulnerability-disclosure pointer (S16)
scripts/
  build-brand-assets.mjs # One-shot generator (sharp) for every raster/SVG form
                        #   of the dove mark: favicons, app icons, og-square,
                        #   and the two lsc-mark PNGs. Run by hand:
                        #   `npm run build:brand`, BEFORE build:og; NOT part of
                        #   the build. Draws from src/lib/lsc-mark.mjs.
  build-og-images.mjs   # One-shot OG-card generator (sharp + opentype.js). Run
                        #   by hand: `npm run build:og`; NOT part of the build.
                        #   Commits PNGs to public/assets/og/
  build-image-variants.mjs # One-shot WebP resizer (sharp) for the on-page
                        #   podcast art. Run by hand: `npm run build:images`;
                        #   NOT part of the build. Commits WebP to
                        #   public/assets/images/ (see O3)
  check-links.mjs       # Post-build internal link checker (`npm run check:links`,
                        #   dependency-free, reads dist/ only). Ported from
                        #   litbible; runs in CI after the build (O4)
  check-apps-mirror.mjs # Authoritative list of the /apps files mirrored from
                        #   litbible, + the comparison against litbible's main
                        #   (`npm run check:mirror`; --local <path> compares a
                        #   working copy). See Apps Page
  og/                   # Card source assets: committed fonts (+ OFL) and
                        #   lit-logo.png (copied from litbible, not shipped)
workers/
  contact-form/         # Cloudflare Worker backing /contact/submit — NOT part
                        #   of the site build; deployed separately via wrangler
                        #   (see its README)
    test/index.test.js  #   vitest suite (real workerd via
                        #     @cloudflare/vitest-pool-workers) + vitest.config.js;
                        #     `npm test` here, and CI's worker-tests job (O5)
.github/
  workflows/
    deploy.yml          # Build + deploy to GitHub Pages on push to main; also
                        #   runs check:links and the worker-tests job on PRs
    apps-mirror.yml     # Fails a PR that edits a mirrored /apps file into a
                        #   state that doesn't match litbible's main. Scoped to
                        #   the PR's own changed files, so being behind litbible
                        #   never reddens an unrelated PR (see Apps Page)
  dependabot.yml        # Scheduled version updates, three streams: root npm,
                        #   workers/contact-form npm, and github-actions.
                        #   Minor+patch grouped per stream; majors ungrouped
                        #   (see Deployment)
docs/
  security-headers.md   # Cloudflare header setup the owner applies (FIXLIST OW1)
DISASTER-RECOVERY.md    # Dashboards/secrets/redeploy path (repo root; not shipped)
SECURITY.md, CONTRIBUTING.md, CODE_OF_CONDUCT.md # Community-health files
                        #   (repo root; GitHub surfaces these automatically)
LICENSE                 # Dual: MIT for the code, all-rights-reserved for the
                        #   org's own written copy and brand/creative assets
                        #   (no CC license, unlike litbible's translation
                        #   content — owner decision; see the file for the
                        #   code/content split, which isn't a clean directory
                        #   split since page prose lives inline in .astro files)
.editorconfig, .gitattributes # Editor/line-ending conventions (repo root)
```

> Everything that ships lives in `src/` and `public/`; `scripts/` and the repo
> root hold build-time tooling, config, and docs that don't ship. Favicons,
> `CNAME`, the manifest, and the sitemap all come from `public/` (or are
> generated into `dist/`), not the repo root.

## Deployment

`.github/workflows/deploy.yml` runs on every push to `main`, on pull requests,
and via manual dispatch: the `build` job `npm ci`s, `npm run check`s,
`npm run build`s, `npm run check:links` (validates internal links in `dist/`),
uploads `dist/` as a Pages artifact, and then the `deploy` job publishes to
GitHub Pages. A separate `worker-tests` job runs the contact-form Worker's
vitest suite (its own dependency tree, so its own `npm ci` in
`workers/contact-form/`); it gates neither `build` nor `deploy`. The `deploy`
job is skipped on pull requests (`if: github.event_name != 'pull_request'`),
so PRs build, type-check, link-check, and run the Worker tests but never
publish. The custom domain comes from `public/CNAME` (liberatingscripture.org).
Push to `main` is the site deploy.

Two things in that workflow are load-bearing and easy to "clean up" by mistake:

- **`upload-pages-artifact` must keep `include-hidden-files: true`.** From v4 on,
  that action excludes dotfiles and dot-directories by default, and `dist/`
  contains `.well-known/` — the Apple Pay domain-verification file the Give
  Lively widget depends on, plus `security.txt`. Dropping the input ships a site
  silently missing `/.well-known/`, and **no CI job catches it**: `check:links`
  reads `dist/` *before* the upload, and `deploy` never runs on a PR. The only
  signal is the live site 404ing.
- **The `pages` concurrency group lives on the `deploy` job, not the workflow.**
  Pages only needs real deployments serialized. At workflow level, every PR
  contended for one global slot, so PRs opened together cancelled each other's
  builds before they ran — three of five Dependabot PRs got zero checks that way
  on 2026-07-28. Grouped Dependabot delivers PRs in batches by design, so this
  has to stay job-scoped.

Dependency updates run on **both** of Dependabot's halves, and the distinction
between them is the thing to keep straight:

- **Security updates** come from GitHub's native toggles (Settings → Code
  security), enabled 2026-07-28 (FIXLIST OW8). Verified live on 2026-07-28:
  alerts on, `automated-security-fixes` reports
  `{"enabled":true,"paused":false}`, and the repo stands at **0 open / 13 fixed**
  advisories.

  Two separate mechanisms decide how these arrive, and conflating them is the
  easy mistake: **`dependabot.yml`'s `groups:` do NOT batch security PRs** —
  those default to `applies-to: version-updates`. What batches them is the
  distinct **"Grouped security updates"** toggle on the same settings page,
  turned on 2026-07-28: one PR per package manager + directory instead of one
  per advisory. That toggle is the actual fix for the day-one pile of eight
  PRs, three of which were all "bump astro". To drive security grouping from
  the yml instead, a group would need an explicit `applies-to: security-updates`
  — none does today, so the toggle governs unopposed.
- **Scheduled version updates** come from `.github/dependabot.yml`, added
  2026-07-28. Three streams: root npm and `workers/contact-form` npm (weekly),
  and github-actions (monthly).

The config **reverses** the earlier decision recorded in FIXLIST S15/OW8 to
follow litbible's precedent of toggles-only and no committed yml. That
precedent was adopted to avoid weekly PR overhead — but the day-one behavior
disproved the premise it rested on. UI defaults are not low-volume: they open
one PR per dependency and watch only the repo root, which is what produced a
scattered pile of four single-package PRs, all stale within the hour when the
Astro 7 upgrade swept the same versions in. Grouping minor+patch into one PR
per stream is strictly *fewer* PRs than the default, not more.

Two things the config buys that the toggles could not:

- **`workers/contact-form/` is now watched at all.** It has its own
  `package.json` and lockfile that the root `npm ci` never touches, so
  root-only UI defaults saw none of it — wrangler, vitest, and
  `@cloudflare/vitest-pool-workers` included.
- **Majors are deliberately ungrouped** in every stream, so each arrives in its
  own PR. Anything outside a group's `update-types` falls out on its own. The
  Astro 6 → 7 bump is the standing argument for this: it silently rewrote every
  CSS breakpoint into range syntax and needed `vite.build.cssTarget` pinned (see
  "Why `cssTarget` is pinned"). That is not something to discover inside a
  bundle of patch bumps.
- **0.x dependencies are `exclude-patterns`'d out of both npm groups, because
  the ungrouped-majors rule above does not otherwise reach them.** Under npm
  caret rules a 0.x minor *is* breaking — `^0.19.0` means `>=0.19.0 <0.20.0`,
  so 0.19 → 0.20 rewrites the range — but Dependabot's semver classifier grades
  it `minor`, it matches `update-types`, and it rides into the group. Today that
  means `@astrojs/check` + `sharp` (root) and `@cloudflare/vitest-pool-workers`
  (worker); **keep the lists in step with the 0.x entries in each
  `package.json`.** The proof was PR #41 on 2026-08-03: pool-workers 0.19.0 →
  0.20.1 arrived as a grouped "minor" carrying release notes headed *"Breaking
  change"*, an **alpha** miniflare 5, and a transitive zod 3 → 4 — in the one
  package that boots the workerd runtime the Worker tests run inside. It was
  closed rather than merged, because checking its lockfile showed it left
  `undici` on the vulnerable 7.28.0 anyway, so it bought no security fix for
  that risk. The exclusion kept doing its job: pool-workers 0.20.3 arrived on
  2026-08-10 as its own PR (#46) rather than inside the group — and that one
  *does* carry patched `undici`, which is a genuinely different call from #41's.
  It was still held, on the alpha-runtime grounds in "The `undici` advisories
  in the Worker tree are knowingly open" below.

Three details in that file were settled on 2026-07-28/29 after watching its first
real runs, and each is a trap worth not re-entering:

- **`commit-message.prefix` is bare `chore`, never `chore(deps)`.**
  `include: scope` makes Dependabot append the scope itself (`(deps)` /
  `(deps-dev)`), so writing it into the prefix too emits
  `chore(deps)(deps): bump …`. Set one or the other. The actions stream does the
  opposite — prefix `chore(actions)` with **no** `include: scope`.
- **`open-pull-requests-limit` must exceed the number of things in the stream.**
  The actions stream sat at 3 against four actions in `deploy.yml`; with majors
  ungrouped, checkout/deploy-pages/upload-pages-artifact took every slot and
  `setup-node` got no PR at all. A starved stream fails silently — nothing
  reports the suppressed update. The npm limits were raised (root 5 → 8 against
  9 deps, worker 3 → 5 against 4) when the 0.x `exclude-patterns` landed: every
  exclusion moves a package out of the shared group PR and into one of its own,
  so anything that raises the exclusion count has to re-check these.
- **A failing TypeScript 7 PR is expected, and there is deliberately NO `ignore`
  entry for it.** `@astrojs/check` (0.9.10, its latest) peers on
  `typescript@"^5.0.0 || ^6.0.0"`, so TS 7 fails `npm ci` with ERESOLVE — that
  was PR #32, closed 2026-07-28. An `ignore` was briefly added and then removed
  the same day, because suppressing the PR suppresses the only thing that would
  ever tell you the block had lifted: **the PR turning green IS the
  notification.** Hidden, it degrades to a code comment nobody re-reads. An
  `ignore` also applies to **security updates**, so it would mute a real
  typescript advisory whose only remedy is 7.x.

  Do not "fix" the red by re-adding one. Leave the PR open or close it —
  closing suppresses that specific version, and a new one arrives only when a
  new stable 7.x ships (as of 2026-07-29, 7.0.2 is the only stable 7.x; the rest
  are `7.1.0-dev.*` nightlies). To check whether it is finally mergeable:
  `npm view @astrojs/check peerDependencies`. When that range admits `^7`, merge
  it. **litbible.net's repo made the same call independently — keep the two in
  agreement.**

With grouped security updates on, Dependabot now does most of that batching
itself. The manual technique still matters when the real remedy is a major
upgrade the grouped PR can't reach on its own: resolve the batch in one branch
rather than merging PRs individually, since several advisories usually share a
root (three of the first eight were all "bump astro") and a single
`npm audit fix` plus one deliberate major closed all eight, where merging each
PR would have meant eight lockfile conflicts. Close any superseded Dependabot
PRs afterward — `@dependabot close` as a comment is unreliable, so verify with
`gh pr list --author "app/dependabot" --state open` and fall back to
`gh pr close <n> --delete-branch`. That fallback is also the one to reach for in
a worktree, where `--delete-branch` skips the *local* branch but still deletes
the remote one correctly.

### The `undici` advisories in the Worker tree are knowingly open

`npm audit` in `workers/contact-form/` reports five `undici` advisories (three
moderate, two high) and **they are deliberately not fixed.** The decision was
re-taken on 2026-08-10 after its own revisit trigger fired, so re-read this
before "fixing" them — the reasoning changed, the conclusion did not:

- **A patched `undici` now exists upstream, but only behind an alpha.** This is
  the part that moved. `undici` is pulled in by `miniflare`, and the fixed
  7.29.0 has landed — but only in **miniflare 5, which is still alpha-only**
  (`miniflare@latest` was `5.20260804.0-alpha` on 2026-08-10). Stable miniflare
  4 stays on the affected 7.28.0. So the trade is no longer "no fix exists," it
  is "the fix costs an alpha runtime under the test suite."
- **`npm audit fix --force` now proposes an *upgrade*, not the old downgrade.**
  It offers `@cloudflare/vitest-pool-workers@0.21.0 — a breaking change`, which
  pulls miniflare 5 alpha and zod 3 → 4. (It used to propose *downgrading* to
  0.8.71; that is no longer what it does. Read the current output rather than
  trusting either description.)
- **Plain `npm audit fix` — no `--force` — also overreaches here.** It cannot
  reach `undici` at all, but it bumps top-level `wrangler` out of step with the
  lockfile and leaves a *duplicated nested* wrangler under
  `@cloudflare/vitest-pool-workers`. For a transitive fix in this tree, scope it
  (`npm update <package> --package-lock-only`) and read the diff.
- **An `overrides` pin was considered and rejected.** Forcing `undici` ^7.29.0
  would override a vendor's *exact* pin, and a stale override is the classic way
  to silently hold a package back long after the advisory is moot.
- **Nothing shipped is affected.** `undici` reaches only the local
  simulator/test harness — the deployed Worker runs on Cloudflare's runtime and
  bundles none of it, and the site build never touches this tree. This is still
  the load-bearing reason: a dev-only advisory does not justify booting the
  tests on an alpha.

One nuance that is easy to misread as a contradiction: **an alpha miniflare 5 is
already in the tree**, at `node_modules/wrangler/node_modules/miniflare`
(`5.20260730.0-alpha`, vendored by stable wrangler 4.118.0 since PR #44). That
does *not* make the pool-workers move a no-op — that nested copy is wrangler's
own business and still pins `undici` 7.28.0, whereas moving
`@cloudflare/vitest-pool-workers` to ≥ 0.20.x makes miniflare 5 alpha the
runtime **the tests themselves boot inside**. Different blast radius.

Revisit when a **stable** miniflare 5 ships, or when stable miniflare 4 picks up
`undici` ≥ 7.29.0 — check with `npm view miniflare@latest dependencies.undici`
and `npm view @cloudflare/vitest-pool-workers@latest dependencies.miniflare`.
PR #46 (pool-workers 0.19.1 → 0.20.3, which *does* carry the patched undici) was
left open on 2026-08-10 rather than merged, for exactly the alpha reason above.

**`npm audit` and GitHub's alerts page disagree in both directions — run both.**
On 2026-08-03 the Dependabot alerts API reported 0 open while `npm audit`
reported the undici findings. By 2026-08-10 it had caught up and reported all
five, but was simultaneously silent on two **high** advisories `npm audit` did
find (`js-yaml` in the root tree, `nanoid` in both). Neither tool is a superset
of the other, and a token lacking `security_events` would make the API look
falsely clean on top of that. Run `npm audit` in **both** trees, and do not
treat a green alerts page as proof of anything.

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

A single source of truth in `src/styles/global.css`. **Do not change existing
token values** — they're shared with litbible.net for visual consistency. New
*semantic* tokens that flip with the theme are fine to add (litbible's own
precedent is add-tokens, not change-tokens); several below were added that way.

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

Text/semantic tokens that flip with the theme (light → dark):
- `--green-text: #0F6B33` → `#3abf6a` — **green as a TEXT color on light
  surfaces.** Plain `--green` fails WCAG AA as body text (2.6:1 cream / 3.5:1
  white); `--green-text` clears it (4.97:1 cream, 6.62:1 white; 5.5:1 on the
  dark raised surface). `--link` points at it. **Rule: `--green` never colors
  text on a light surface — use `--green-text`.** Plain `--green` is still
  right for green-on-ink pairings (skip link, button hover labels, the ink
  footer) and for fills/borders/large hero display.
- `--on-green-fill: #ffffff` → `#1d231c` — foreground paired with a
  `--green-text` fill (e.g. the theme-toggle hover).
- `--text-muted: #5c5b57` → `#b3b1ab` — secondary/label gray. Replaced the
  hardcoded `#5c5b57` that was dark-on-dark before. Dark value is `#b3b1ab`
  (not a darker gray) specifically so it clears 4.5:1 even on the lightened
  `--badge-bg` surface (4.75:1 there, ~6:1 on plain dark surfaces).
- `--badge-bg: rgba(29,35,28,0.07)` → `rgba(255,255,255,0.08)` — the faint
  pill background behind `.project-card__badge` / `.coming-soon-badge`, which
  vanished on dark before.

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

### Theme: system default, with an explicit toggle

The site follows the OS `prefers-color-scheme` by default, and users can
override it. Two cooperating pieces (ported from litbible):

- **Pre-paint script** in `Layout.astro`'s `<head>` reads `localStorage`
  key **`lsc-theme`** and, only for `light`/`dark`, stamps `data-theme` +
  `style.colorScheme` on `<html>` before first paint. Absence of the key (or
  value `system`) = follow the OS; no attribute is set and CSS falls through to
  `prefers-color-scheme`. This is why every dark rule in the CSS comes in two
  forms: `@media (prefers-color-scheme: dark) :root:not([data-theme="light"])`
  **and** `:root[data-theme="dark"]` — the first lets a forced-light user opt
  out on a dark OS, the second forces dark on any OS.
- **The control** is a mini tray (`#themeTray`, a `role="dialog"` with a
  System/Light/Dark segmented radio group, `name="lsc-theme"`) in
  `SiteHeader.astro`. Two openers share `.site-header__theme-toggle`: a desktop
  one as the last `<li>` in `.site-nav__list` and a mobile one in
  `.site-header__actions` — each is shown/hidden purely by its container's
  existing 900px responsive rules, so there's no extra breakpoint to maintain.
  The tray's script re-parents it to `<body>` (to escape the sticky header's
  stacking context) and writes/clears `lsc-theme` exactly as the pre-paint
  script reads it. If the popover's or any component's storage changes, update
  `/privacy`'s Cookies paragraph too (it names `lsc_apps_launch_v1`/`lsc_pv`;
  `lsc-theme` is localStorage, not a cookie — mention it if that section ever
  broadens to storage generally).

### Why `cssTarget` is pinned in `astro.config.mjs`

Astro 7 bundles Vite 8, which minifies CSS with **Lightning CSS**. Left at its
default, Lightning CSS assumes a modern baseline and rewrites every width
breakpoint into Media Queries Level 4 **range syntax** — `@media (max-width:
640px)` becomes `@media (width<=640px)`. Browsers older than Safari 16.4 /
Chrome 104 / Firefox 102 don't parse that, so they ignore the rule *entirely*:
all 24 of the site's breakpoints would silently drop and a phone on an older
iOS would render the desktop layout. Astro 6's minifier never did this, so the
regression arrives purely from the upgrade, invisible unless you diff the
built CSS or test on an old browser.

`vite.build.cssTarget` pins an older baseline, which keeps the legacy
`(max-width: …)` form. Verified by building both ways and counting: 24
range-syntax queries unpinned, 0 pinned.

One visible side effect, and it's benign: at that target Lightning CSS also
expands `system-ui` into an explicit fallback chain
(`BlinkMacSystemFont, "Segoe UI", Roboto, …`). `system-ui` stays first, so
modern browsers resolve identically and old ones get a better fallback than
bare `sans-serif`. It is the *only* computed-style difference between the
Astro 6 and Astro 7 builds — confirmed by diffing `getComputedStyle` for
every element across 13 pages × light/dark × 390px/1280px, which is otherwise
byte-identical once CSS transitions are disabled (sample mid-animation and the
popover close button and `/apps` carousel control produce third-decimal noise
that is not a real difference).

### Critical inline CSS (anti-FOUC)

`Layout.astro` emits a small inline `<style>` (the `criticalCSS` const) in
`<head>` **before** the external stylesheets: html/body reset, body
background+color for light and both dark selector forms, and the 68px header /
`50svh` main min-heights. It stops the light-flash for dark-mode users and the
margin/CLS jump before `global.css` loads. It intentionally mirrors the
dual-selector dark pattern so the pre-paint `data-theme` wins on first paint.
`/apps` sets its own body background (apps.css), so it shows the critical
bg for a beat before repainting — both values are near-identical darks/creams,
so it's imperceptible and page-local.

## The Brand Mark

The LSC mark is a monochrome dove. It is drawn **once**, in
`src/lib/lsc-mark.mjs` (path data + SVG builders), and everything else derives
from that module — `components/LscMark.astro` inlines it for the page, and
`scripts/build-brand-assets.mjs` rasterizes it for every favicon, app icon and
OG source. There is no hand-made logo file anywhere in the tree; if the art
changes, edit the module and re-run `npm run build:brand && npm run build:og`.

**The treatment is an inverted coin.** The dove sits on a filled disc whose
color *opposes the surface*, and the dove opposes the disc. Two tokens carry it,
flipped in `:root` and both dark blocks of `global.css`:

| Token | Light | Dark |
|---|---|---|
| `--lsc-mark-disc` | `#1D231C` | `#E4E2DC` |
| `--lsc-mark-bird` | `#FAFAF8` | `#1D231C` |

**Fixed-darkness surfaces pin their own pair**, because "opposes the surface" is
wrong for a surface that never flips. Two do it today, and any new one must:

- `.site-footer` — the ink band is dark in *both* themes → cream disc, ink dove.
- `.hero` on `index.astro` — `--green-deep` is theme-invariant → ink disc, cream
  dove. (Ink on green-deep is ~2.7:1 at the rim — soft, but exactly the edge
  contrast the old gold tile had there, and the dove inside is high contrast.)

Get this wrong and the mark vanishes into its own background in one theme only,
which is easy to miss if you only look at the theme you're developing in.

**Inline SVG, never `<img src>`.** An externally-referenced SVG is its own
document and can't read the page's custom properties, so an `<img>` can't
follow the theme at all. That is the whole reason the component exists.

**Coin vs. tile.** `markSvg()` takes a `shape`. The favicon SVG, the OG
composite and every on-page use are `"coin"` (disc, transparent outside).
`apple-touch-icon` and the `web-app-manifest-*` icons are `"tile"` (full-bleed
square) because `site.webmanifest` declares them `purpose: maskable` — the
platform applies its own crop, and a circle on transparency gets clipped into a
lens. `favicon.ico` is the tile too; a coin's rim turns to mush at 16px.

**Two things depend on the disc-opposes-surface rule outside the CSS:**

- `build-og-images.mjs` paints an ink field, so its cards composite
  `lsc-mark-inverse.png` (cream disc, ink dove). The plain coin would be an ink
  disc on an ink field.
- `public/favicon.svg` carries its own `prefers-color-scheme` block, so the
  favicon follows the *browser's* scheme. Generated, not hand-written.

**Mirrored in litbible.net**, which renders the LSC mark on
`/liberating-scripture-collective`, `/support`, and the home page's fourth
question card. That repo gets a copy of `lsc-mark.mjs` + `LscMark.astro` and its
own `--lsc-mark-*` tokens (dark disc `#F0F0F0`, matching its `--text`); it
generates nothing, since only this repo owns the favicons and OG cards. Its
`.questions-block` is a fixed `--green` band and pins its pair the same way the
hero here does. Keep the two component copies in step.

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
- **Brevo** — two forms, both posting to **LSC's own list**, in the same Brevo
  account as litbible.net but a dedicated list (not litbible's
  translation-update list): the footer newsletter (`SiteFooter.astro`) and the
  opt-out on `/unsubscribe` (`pages/unsubscribe.astro`). They are separate
  Brevo forms with **separate `action` tokens**, and litbible's tokens are not
  interchangeable with these — a litbible token would act on litbible's list.
  **We do not load Brevo's `main.js`** for either — see "The newsletter submits
  itself" below. Turnstile is lazy-loaded on first hover/focus of the subscribe
  form (the unsubscribe form has no captcha — Brevo's unsubscription form
  carries none); both POSTs are our own `fetch`.
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
`AppsLaunchPopover.astro` announces it. **litbible is upstream**: `/apps` is a
byte-for-byte mirror of litbible.net/apps and should render identically except
for LSC's own header/footer. Change these files **on litbible**, then copy them
here — never the other way round.

- **The mirror is enforced, not just documented.** `scripts/check-apps-mirror.mjs`
  holds the authoritative file list and compares each one against litbible's
  `main`; `npm run check:mirror` runs it locally, and
  `.github/workflows/apps-mirror.yml` runs it on any PR touching those paths.
  The CI check is scoped to the PR's **own changed files**, so this repo simply
  being behind litbible never reddens an unrelated PR — what it catches is a
  mirrored file edited *here*. The reverse signal comes from litbible:
  its `apps-mirror-notify.yml` opens (or comments on) an issue here, labelled
  `apps-mirror`, whenever it publishes a change worth carrying across. To fix
  drift, copy litbible's file wholesale (the check prints the exact `curl`
  commands); don't hand-patch.
- **Two things are deliberately NOT mirrored.** `src/pages/apps.astro` — two
  sites can't share a canonical URL, so its Layout props and JSON-LD head stay
  LSC's own; keep only the *section list* in step. And
  `src/styles/pages/apps-bridge.css` — LSC-only, and the reason `apps.css` can
  be a pure mirror.
- **The screenshot bytes are mirrored by hand, not by CI.** They used to be a
  third exception (this repo shipped full-resolution originals); it now ships
  litbible's ~2x-display-size copies, so all 12 files under
  `public/assets/screenshots/` are byte-identical to litbible's. They are
  deliberately absent from `MIRRORED` in `check-apps-mirror.mjs`, which reads
  files as UTF-8 and folds CRLF — that mangles binaries, so enforcing them
  needs a hash path the script doesn't have yet. Re-copy by hand if either side
  re-exports. The full-resolution originals are archived in litbible's
  `_source-images/screenshots/`, not here. Filenames are lowercase-kebab with no
  spaces on both sides precisely so the components can carry identical `src`
  strings.
  litbible's `ExampleSideBySide.astro` is absent here on purpose — it's unused
  dead code even in litbible's own repo, so mirroring it would add a file with
  no rendering effect.
- **`AppIcons.astro` and `PlatformIcon.astro` live under `components/apps/`**,
  not at the top level, so `Hero.astro` and `JoinBeta.astro` can use the same
  relative import string litbible uses. Their two consumers outside `/apps`
  (`AppsLaunchPopover.astro`, `pages/lit-bible.astro`) reach into that folder.
  Both files are mirrored — don't edit them here.
- **`apps-bridge.css` carries everything LSC-specific, and is imported BEFORE
  `apps.css`. That order matters.** litbible's `apps.css` intentionally
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
  before** litbible's `.btn-primary`/`.btn-secondary` rules, which is why
  `apps.astro` imports `apps-bridge.css` first: both selectors are the same
  specificity (two classes), so the later rule wins ties on shared properties.
  Bridge-first lets litbible's own rules (later, in `apps.css`) win back what
  they actually set — background, border, hover colors — while the bridge's
  resets only stick where litbible is silent (LSC's uppercase text, its
  swipe-fill `::before`, the `position`/`overflow`/`isolation` trick behind
  it, `nowrap`). Getting this backwards is a real, easy-to-miss bug: it
  silently produced a transparent primary button and a borderless secondary
  button here, caught only by diffing computed styles against the live
  litbible.net page in both themes — a visual glance didn't catch it. If you
  touch the bridge, re-verify computed styles (`getComputedStyle`, not just
  eyeballing) against litbible.net before trusting a change.
- **The body background is set by `apps-bridge.css`, not a Layout prop.**
  litbible's `apps.astro` passes `Layout bg="white"`, which litbible's
  `global.css` resolves to `body { background: var(--surface-raised) }`
  (`#FAFAF8` light / `#1d1d1f` dark). LSC's `Layout.astro` has no such prop, so
  the bridge (imported *only* by `apps.astro`) sets a literal `body` background
  instead — page-scoped by construction, since Astro only ships a page's
  imported CSS to that page. Don't import either stylesheet elsewhere, or this leaks
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

The footer newsletter in `SiteFooter.astro` **and the opt-out form on
`/unsubscribe`** post with their **own `fetch`**, not with
`https://sibforms.com/forms/end-form/build/main.js`. This is deliberate and was
arrived at by debugging a silent failure, so don't "restore" the script.

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

**And the replacement is proven, not just assumed.** Both directions were
live-tested end-to-end on the deployed site 2026-07-21: a real subscribe
through the footer form (Turnstile render → token → POST → contact appears in
the LSC Brevo list) and a real unsubscribe through `/unsubscribe` (contact
removed). So the `fetch` approach is confirmed working server-side as well as
client-side — there is no open question that reintroducing `main.js` would
answer.

**What replaced it.** The submit handler validates the email, reads the
Turnstile token from the hidden `cf-turnstile-response` input the widget
injects, and POSTs `EMAIL` + `email_address_check` (honeypot, empty) + `locale`
+ `cf-turnstile-response` as form-urlencoded. The sibforms endpoint supports
CORS and returns a readable status, so success/failure drive the two status
panels. On failure the widget is reset — Turnstile tokens are single-use.

Consequences worth knowing:

- **The button no longer ships `disabled`.** It used to be disabled until
  `main.js` loaded and re-enabled it, which meant a JS failure left a dead
  button. Now it's live immediately for JS visitors.
- **With JS off, the form is hidden rather than left to fall through to a
  native POST.** A token-less POST to sibforms returns HTTP 200
  `{"success":true}` to the client but is silently dropped server-side —
  verified live (no contact appears in the Brevo list, no confirmation
  email sends). Turnstile can't render without JS, and every fallback
  (Brevo's hosted page, `/contact`) gates on Turnstile too, so no fallback
  can make no-JS subscription actually work. A `<noscript>` block in
  `SiteFooter.astro` hides `.footer-newsletter__form` and shows one honest
  line, "Subscribing requires JavaScript," instead of a route that can't
  work. Inert when JS is on. Ported from litbible's equivalent fix.
- **The fixed Brevo ids no longer matter functionally.** `sib-form`,
  `sib-captcha`, `error-message`, `success-message` are kept for continuity
  with litbible, but nothing external depends on them now.
- **Keep the honeypot and `locale` hidden fields** — Brevo still expects both
  in the POST body.

### `/unsubscribe` and the `hideFooterNewsletter` prop

Brevo's markup pins a handful of ids (`sib-form`, `error-message`,
`success-message`), and both LSC forms inherit them — so the two **collide on
any page carrying both**. `Layout.astro` therefore takes
`hideFooterNewsletter`, which it forwards to `SiteFooter.astro` as
`hideNewsletter`; that guard omits **both** the newsletter markup and its
inline submit script (leave the script guarded — unguarded, it binds
`#sib-form` and would hijack the unsubscribe form's submit). `/unsubscribe`
is the only page that sets it. Same mechanism as litbible's.

Two deliberate divergences from litbible's `unsubscribe.css`, both because
LSC's page background flips with the theme and litbible's flat values don't
survive it — don't "restore" them to match litbible:

- The submit's **hover** uses `--cta-bg`/`--cta-text`, not raw `--ink`/`--green`
  (see "Buttons must use the CTA tokens": an ink pill on the `#1a1e1a` dark page
  is invisible). Resolves identically to litbible in light mode.
- `.unsub-form__field-error` reads a page-scoped `--unsub-error-fg` token,
  flipped in the same three blocks `global.css` uses. litbible's flat `#661d1d`
  measures ~1.3:1 on the dark page; the token gives 8.96:1 light / 8.31:1 dark.
  The status *panels* keep litbible's flat colors — those pin a background too,
  so they're legible either way.

Live-tested end-to-end 2026-07-21: a real submit removes the contact from the
LSC list (see "And the replacement is proven" above).

The page is `noindex` and excluded from the sitemap (`astro.config.mjs`), and
`AppsLaunchPopover` suppresses itself there — nobody should be pitched an app
mid-opt-out. It's linked from `/privacy`, and otherwise reached from email
footers; it is deliberately not in the nav.

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
