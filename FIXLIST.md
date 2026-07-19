# Site Audit Fix List

From the comprehensive audit of **2026-07-18** (developer, QA, SEO, end-user,
editor, marketing, disability/accessibility, legal, security, performance, and
HR/governance passes; key findings verified against the live site and a full
local `npm run build` + `astro check`), plus a same-day review of the sibling
**litbible repo**, which shares this site's design system and code lineage and
has already solved several of the problems found here. Items are grouped by
which model should run them:

- **Sonnet** — mechanical, fully specified edits; run as ONE batch session.
- **Opus** — well-scoped implementation work; run one session per item.
- **Fable** — judgment, security, design, or brand voice; owner in the loop.
- **Owner** — decisions or dashboard access no model has.

Every item below is written to stand alone — a fresh session should be able to
execute from the item text without the originating conversation. After any code
item: `npm run build` must pass, and changed pages should be spot-checked in
`npm run dev`. This is a living checklist: when an item lands, mark it `[x]`
and add a short DONE note (see the litbible repo's FIXLIST.md for the pattern)
— don't delete it.

**litbible references.** Several items port code or docs from the litbible
repo. It's a sibling checkout, typically at `../litbible` relative to this
repo's parent directory (`C:\Users\bcjoh\GitHub\litbible` on the owner's
machine). If it isn't present locally, ask the owner rather than guessing —
the referenced files are the source of truth for those items.

**Suggested first wave:** S1 (broken llms.txt links, live 404), S2+S3 (broken
typecheck + CI gap), S4 (15 MB of dead assets), then O1 and O2 (the two real
accessibility defects), then F2→OW1 (security headers).

## Sonnet — one batch session

> Prompt shape: "Work through the Sonnet checklist in FIXLIST.md top to
> bottom. Make exactly the changes described; don't expand scope. Run
> `npm run check` and `npm run build` at the end."

- [ ] **(S1) Fix the broken podcast URL in both llms files, and list the
  missing pages.**
  Problem: `public/llms.txt` (line 11) and `public/llms-full.txt` (lines 16
  and 37) link to `https://liberatingscripture.org/table-were-building-podcast/`,
  which does not exist and returns a live 404 (verified 2026-07-18). The
  actual podcast hub is `/podcasts/`. Both files also omit real pages.
  Fix: in both files, replace the dead URL with
  `https://liberatingscripture.org/podcasts/` (in llms-full.txt's "The Table
  We're Building" section, keep the description but point the landing-page
  URL at /podcasts/). Then extend each file's page list to include:
  About (`/about/`), Podcasts hub (`/podcasts/`), Community & Courses
  (`/community/`), Support/donate (`/support/`), and Privacy (`/privacy/`),
  each with a one-line description consistent with the page's actual meta
  description. Keep the existing tone and format.
  Verify: `grep -r "table-were-building-podcast" public/` returns nothing;
  every URL listed in both files corresponds to an entry in
  `dist/sitemap-0.xml` after a build.

- [ ] **(S2) Make `npm run check` work from a clean clone and fix the four
  type errors.**
  Problem: `@astrojs/check` and `typescript` are not in `package.json`, so
  `npm run check` prompts interactively on a fresh `npm ci`. Once run, it
  reports 4 errors in `src/components/SiteHeader.astro` (lines ~35, 38, 73,
  76): `link.external` doesn't exist on the inferred `navLinks` type — no
  entry defines `external`, so all four branches are dead code.
  Fix: (a) `npm i -D @astrojs/check typescript` (mirror litbible's
  `package.json` devDependencies). (b) In SiteHeader.astro, delete the dead
  machinery: the `{...(link.external ? ... : {})}` spreads and the
  `{link.external && <span ...>↗</span>}` fragments in BOTH the desktop nav
  and the mobile overlay loops. (If external nav links ever return, the right
  pattern is litbible's: a typed array plus `<span class="sr-only">(opens in
  new tab)</span>` inside the link, not `aria-label` on a span.) The
  `.ext-icon` CSS rule in the same file also becomes unused — delete it.
  Verify: `npm run check` exits 0 with 0 errors.

- [ ] **(S3) Run the typecheck in CI and run CI on pull requests.**
  Problem: `.github/workflows/deploy.yml` only builds, and only on push to
  main — type errors (see S2) and PR breakage never surface. litbible's
  `.github/workflows/ci.yml` is the reference.
  Fix: in deploy.yml's `build` job, add `- run: npm run check` between
  `npm ci` and `npm run build`. Add `pull_request:` to the `on:` block.
  Guard the deploy job so PRs build but don't deploy:
  `if: github.event_name != 'pull_request'` on the `deploy` job.
  Depends on S2 (check must pass first).
  Verify: workflow YAML is valid (`gh workflow view` or push to a branch and
  watch the PR run); a PR run executes build+check but skips deploy.

- [ ] **(S4) Delete the unused images (~15 MB) and the duplicate OG folder.**
  Problem: these files under `public/assets/images/` are referenced nowhere
  in `src/`, `public/llms*.txt`, README, or CLAUDE.md (verified by grep),
  but ship with every deploy: `sd-hero.jpg` (5.9 MB), `sevenfold-mandala.png`
  (3.5 MB), `twb-square.png` (1.9 MB), `lsc-logo-gold.png`,
  `lsc-logo-gold-square.png`, `lsc-logo-text.png`. Additionally
  `public/assets/images/og/` duplicates `public/assets/og/` (og-default.png,
  og-square.png in both); Layout.astro references only
  `/assets/og/og-default.png`.
  Fix: `git rm` the six unused images and the entire
  `public/assets/images/og/` directory. KEEP `public/assets/og/og-default.png`
  (the live OG image) and KEEP `public/assets/og/og-square.png` for now — its
  deletion is gated on OW4 (it may be pasted into external social/podcast
  profiles).
  Verify: `npm run build` passes; grep confirms no reference to any deleted
  filename; the built `dist/assets/` no longer contains them.

- [ ] **(S5) Small HTML/copy corrections.**
  (a) `src/pages/support.astro` (~line 54): the donate-band logo has
  `height="auto"`, which is invalid HTML (`height` must be an integer). The
  image is 2200×2200 rendered at width 84 — use `height="84"`.
  (b) `src/pages/lit-bible.astro` (~line 214): "allowing in depth study" →
  "allowing in-depth study".
  (c) Silence the 10 `astro check` hints: add `is:inline` to every
  `<script type="application/ld+json">` tag in `src/pages/*.astro` (they are
  already treated as inline; the directive just makes it explicit).
  Verify: `npm run check` shows 0 errors and no astro(4000) hints on those
  scripts.

- [ ] **(S6) Remove dead code found in the audit.**
  (a) `src/layouts/Layout.astro`: the `bg = "cream"` prop renders
  `class="bg-cream"` on `<body>`, but no `.bg-*` class exists anywhere in
  this repo's CSS and no page passes the prop (it was ported from litbible,
  which does define `body.bg-green`; the classes never came along). Remove
  the prop and render a bare `<body>`.
  (b) `src/pages/index.astro` (~line 215): the project-card CTA's
  `aria-label` contains a dead ternary — `${p.cta}${p.external ? "" : ""}` —
  and an em dash. Change the whole label to
  `aria-label={`${p.cta}: ${p.name}`}`.
  (c) `src/pages/index.astro` (~line 539): the `.support-strip__hint` CSS
  rule styles a class no element uses. Delete it.
  Verify: `npm run build` passes; rendered `<body>` has no class; the CTA
  aria-labels read e.g. "Learn more: LIT Bible".

- [ ] **(S7) Em-dash sweep in visible prose.**
  Owner style rule (established in litbible and in this repo's recent
  commits, e.g. `e96156e`, `492bd62`): no em dashes in published page copy —
  rephrase with commas/periods/colons, changing as few words as possible.
  Remaining locations: `src/pages/index.astro` (~line 178, "the LIT
  Bible—a trauma-informed, justice-oriented New Testament translation—which
  lives at" → use commas or parentheses); `src/pages/lit-bible.astro`
  (~line 94, "The full name—Liberation and Inclusion Translation—reflects" →
  commas); `src/pages/support.astro` (~line 129,
  "experience—biblical studies, accessibility, design, education, community
  care—you can" → use a colon and comma, e.g. "experience: biblical studies,
  …, community care. You can…" adjusting the sentence minimally);
  `src/pages/community.astro` (~lines 114–118, "contribute—experience …
  find—reach out" → same colon treatment); `src/pages/contact.astro` JS
  success string (~line 133, "Message sent — we'll be in touch soon." →
  "Message sent! We'll be in touch soon."); `src/pages/contact/thanks.astro`
  lede (~line 21, "as soon as we can — usually within a week, often sooner."
  → "as soon as we can, usually within a week and often sooner.").
  LEAVE ALONE: code comments, `title` tags, alt text, JSON-LD, and the
  Worker's email body text (not page prose).
  Verify: `grep -rn "—" src/pages src/components` shows no em dashes in
  visible prose (JSON-LD/comments excepted).

- [ ] **(S8) Harden the contact-form honeypot.**
  Problem: the `_gotcha` honeypot in `src/pages/contact.astro` is hidden via
  `.hp { display: none; }` — trivially detected by spam bots that skip
  `display:none` fields. litbible fixed the same weakness.
  Fix: mirror litbible's pattern (see its FIXLIST "Stronger contact-form
  honeypot" DONE note and `src/pages/contact.astro` there): position the
  wrapper off-screen instead — `.hp { position: absolute; left: -9999px; }`
  — keeping `type="text"`, `tabindex="-1"`, `autocomplete="off"`,
  `aria-hidden="true"` on the input. No Worker changes (it already checks
  the value server-side).
  Verify: field invisible in `npm run dev`, not focusable by Tab, still
  present in the POST body.

- [ ] **(S9) Stop overstating the no-JS contact path.**
  Problem: comments and docs claim "a native no-JS POST works too", but
  Cloudflare Turnstile requires JavaScript to render, so a genuinely JS-less
  visitor can never obtain a token and every native POST fails the server
  check with a 403. The real purpose of the native-POST path is resilience
  when JS is on but `fetch` fails or is blocked. Also, the Worker's 403
  error page tells the user to "complete the checkbox again" — a checkbox a
  no-JS user never saw.
  Fix (comments/copy only, no behavior change): (a) the JSX comment in
  `src/pages/contact.astro` (~lines 40–43); (b) the docblock in
  `workers/contact-form/src/index.js` (~lines 20–23); (c)
  `workers/contact-form/README.md` where it describes the no-JS path; (d)
  the comment atop `src/pages/contact/thanks.astro`. Reword each to say the
  303/HTML path serves native form POSTs (JS available for Turnstile, but
  fetch unavailable/failed) rather than "no-JS works". In the Worker's
  `errorPage` turnstile branch, soften to "The security check could not be
  verified. Please go back, complete it again if it is shown, and resend.
  (The check requires JavaScript.)".
  Verify: reread all four spots; no functional diff (`npm run build`, worker
  `npm run check` in `workers/contact-form/` still pass).

- [ ] **(S10) Render the footer year at build time.**
  Problem: `src/components/SiteFooter.astro` injects the copyright year with
  client JS into `#footerYear`; without JS the footer reads "© " with a
  blank. The site rebuilds on every push, so a build-time year is accurate
  in practice.
  Fix: render `{new Date().getFullYear()}` in the frontmatter/template so
  the year is in the HTML, and keep the tiny script as a
  progressive-enhancement overwrite (guards against a stale year if no
  deploy happens across a New Year).
  Verify: `dist/index.html` contains the literal current year in the footer.

- [ ] **(S11) Switch font imports to Latin subsets and drop unused weights.**
  Problem: `src/styles/global.css` (lines 1–12) imports full-subset
  @fontsource files; litbible imports `latin-` subsets only (site is
  English), which is meaningfully smaller. Also `@fontsource/fraunces/600.css`
  appears unused — no Fraunces element sets weight 600 (grep before
  deleting to confirm).
  Fix: change each import to its `latin-` variant, mirroring litbible's
  `src/styles/global.css` lines 1–11 (e.g. `@fontsource/inter/latin-400.css`).
  Confirm Fraunces 600 is unused (`grep -rn "font-weight" src | grep -i -B2
  fraunces` and inspect the Fraunces-using selectors: `.lede`,
  `.footer-tagline`, `.support-strip__heading` (500), `.podcast-card__tagline`,
  `.sd-questions__list li`), then remove that import.
  Verify: `npm run build`; spot-check headings/lede/taglines in `npm run
  dev` — no fallback-font flash or weight change.

- [ ] **(S12) Add a dark-scheme `theme-color` meta.**
  Problem: `src/layouts/Layout.astro` emits a single
  `<meta name="theme-color" content="#209D50" />`; in dark mode the green
  chrome clashes. litbible ships a second meta (owner-approved value
  `#0F6B33`, its `--green-deep`).
  Fix: after the existing meta, add
  `<meta name="theme-color" content="#0F6B33" media="(prefers-color-scheme: dark)" />`
  — matching litbible's Layout.astro lines 99–100.
  Verify: both metas present in `dist/index.html`.

- [x] **(S13) Only emit og:image dimensions for the default image; add a
  `twitterCard` prop.**
  DONE 2026-07-19 (landed with F5, which depends on it): in
  `src/layouts/Layout.astro`, the `og:image:width`/`height` metas are now guarded
  with `{!ogImage && …}` so pages passing their own card don't misreport 1200×630,
  and a `twitterCard = "summary_large_image"` prop backs the `twitter:card` meta.
  Verified: `dist/index.html` (default card) still carries the dimensions;
  `dist/podcasts/index.html` (per-page card) omits them and both keep the twitter
  card. Byte-identical for pages that don't pass `ogImage`.
  Problem: `src/layouts/Layout.astro` hardcodes
  `og:image:width=1200`/`height=630` even when a page passes its own
  `ogImage` of different dimensions — misreporting. litbible solved this
  ("Stop hardcoding og:image dimensions" in its FIXLIST; see its
  Layout.astro).
  Fix: emit the two dimension metas only when `ogImage` was NOT provided
  (i.e. the 1200×630 `/assets/og/og-default.png` default is in use). Add a
  `twitterCard = "summary_large_image"` prop and use it for the
  `twitter:card` meta so future pages with square art can pass
  `twitterCard="summary"`. No current page passes `ogImage`, so built
  output should be byte-identical.
  Verify: diff a built page's `<head>` before/after — identical today; a
  test page passing `ogImage` omits the dimension metas.

- [ ] **(S14) Add `.editorconfig` and `.gitattributes`.**
  Copy both verbatim from the litbible repo root: `.editorconfig` (UTF-8,
  LF, trim trailing whitespace, final newline) and `.gitattributes`
  (`* text=auto eol=lf`). Rationale: Windows-based development; keeps line
  endings and whitespace consistent for any future contributor.
  Verify: `git check-attr text -- src/pages/index.astro` reports `auto`.

- [ ] **(S15) Add a Dependabot config.**
  Problem: no automated dependency updates for the site's npm deps, the
  Worker's npm deps (`workers/contact-form/`), or the GitHub Actions in
  `deploy.yml` — everything is manual.
  Fix: create `.github/dependabot.yml` with three update blocks:
  `package-ecosystem: npm` with `directory: /`; `package-ecosystem: npm`
  with `directory: /workers/contact-form`; `package-ecosystem:
  github-actions` with `directory: /`. Use `schedule: { interval: monthly }`
  and sensible `groups` (e.g. group all patch/minor npm bumps) to keep PR
  noise low on this small site.
  Verify: YAML validates; after merge, the Dependabot tab on GitHub shows
  the three ecosystems.

- [ ] **(S16) Governance/health drafts: SECURITY.md, CONTRIBUTING.md,
  CODE_OF_CONDUCT.md, security.txt (owner-review drafts).**
  Problem: the site actively invites collaboration ("feedback,
  collaboration, scholarship, accessibility work, art" on /about/ and
  /support/) but the public repo has none of GitHub's community-health
  files; there is also no security contact channel.
  Fix: adapt litbible's `SECURITY.md`, `CONTRIBUTING.md`, and
  `CODE_OF_CONDUCT.md` (repo root there) for this repo, as drafts for owner
  review. Adjustments: scope is a static org site with NO public API and NO
  apps — drop litbible's API/app-support bullets; the in-scope list is the
  contact-form Worker (`workers/contact-form/`), supply-chain concerns, and
  content tampering; the report channel is
  `https://liberatingscripture.org/contact/`. CONTRIBUTING should route
  content/mission feedback to the contact form and technical
  issues/PRs to GitHub, and mention `npm run dev` / `npm run check` /
  `npm run build`. CODE_OF_CONDUCT: Contributor Covenant v2.1 like
  litbible's, enforcement contact = the contact form. Also create
  `public/.well-known/security.txt` (RFC 9116): `Contact:
  https://liberatingscripture.org/contact/`, `Policy:` pointing at the
  SECURITY.md on GitHub, an `Expires:` about one year out, and
  `Preferred-Languages: en`.
  NOTE: do NOT create LICENSE — that's gated on OW3.
  Verify: files exist at the paths above; `npm run build` copies
  security.txt into `dist/.well-known/`; GitHub's Community Standards page
  (repo Insights) recognizes the three markdown files after merge.

- [ ] **(S17) Doc-drift sweep in CLAUDE.md and README (run LAST in the
  batch).**
  Problem: CLAUDE.md's `public/` structure listing omits
  `.well-known/apple-developer-merchantid-domain-association` (Apple Pay
  domain verification for the Give Lively donate widget — exactly the kind
  of mystery file a cleanup pass might delete). README doesn't mention
  FIXLIST.md. (CLAUDE.md's Open Items section was already rewritten to point
  at FIXLIST.md when the fixlist was created — don't redo it.)
  Fix: (a) Add the `.well-known` file to CLAUDE.md's structure listing with
  a one-line "what it is / don't delete" note. (b) Mention FIXLIST.md in
  README (one line, e.g. under "Working with Claude Code"). (c) Then update
  both docs to reflect whatever else landed in this batch (new devDeps and
  `check` in CI per S2/S3, health files per S16, dependabot per S15, deleted
  images per S4) — CLAUDE.md's own header requires keeping it accurate in
  the same change.
  Verify: read both docs against the repo tree; no stale claims remain.

## Opus — one session per item

- [ ] **(O1) Port the green text-contrast tokens from litbible and sweep
  green-as-text usages.**
  Problem: brand green `#209D50` used AS TEXT fails WCAG AA on light
  backgrounds — ~2.6:1 on cream (`--cream` #E1DFD9), ~3.5:1 on white,
  vs. the 4.5:1 requirement. Affected: every default link (`--link:
  var(--green)` in `src/styles/global.css`), every `.eyebrow` on light
  backgrounds, `.project-card__cta` (index), `.contact-sidebar__links a`,
  `.status-label` (community), `.thanks-link`, `.privacy-body a`, the
  `.required` asterisks (contact), and similar. litbible hit the identical
  problem and solved it in its `src/styles/global.css` (lines ~60–140),
  whose comments are effectively the spec:
  `--green-text: #0F6B33` (green for TEXT on light surfaces; ~4.9:1 on
  cream, ~6.7:1 on white; flips to `#3abf6a` in BOTH dark blocks),
  `--green-deep: #0F6B33` (theme-INVARIANT solid-button green — never
  redefine in dark blocks), `--on-green-fill: #ffffff` (foreground paired
  with a green fill; flips to ink in dark), and `--link:
  var(--green-text)`.
  Fix: add the tokens to this repo's `global.css` with litbible's comment
  text (adapted), point `--link` at `--green-text`, then sweep every
  green-as-text usage in `src/` to the new token. Large display text on
  green/dark backgrounds (hero headlines, button labels on `--ink`) keeps
  plain `--green` — this item is about green *text on light backgrounds*.
  The form-success color `#166b39` in contact.astro can stay for now (O2
  handles form-status colors holistically). Do NOT alter `--green` itself:
  both sites share it, and litbible's precedent is add-tokens, not
  change-tokens.
  Verify: contrast-check the changed pairs (WebAIM or computed ratios) —
  all body-size green text on cream/white ≥ 4.5:1 in light mode and ≥ 4.5:1
  in dark mode (`#3abf6a` on the dark surfaces passes); visual pass of every
  page in both themes; `npm run build`.

- [ ] **(O2) Fix dark mode's unreadable hardcoded grays and form-status
  colors.**
  Problem: multiple components hardcode light-mode grays that sit on
  `--surface-raised` (#2e322e in dark mode) at roughly 1.9:1 — effectively
  invisible. `#5c5b57` text: `.contact-notice` (contact.astro ~287),
  `.podcast-card__hosts`, `.podcast-notify`, `.coming-soon-badge`
  (podcasts.astro), `.donate-band__sub` (support.astro ~257),
  `.privacy-effective` (privacy.astro ~170), `.project-card__badge`
  (index.astro ~446). The badge backgrounds `rgba(29,35,28,0.07)` also
  nearly vanish on dark. Form status colors fail the same way:
  `.form-status--success` `#166b39` and `.form-status--error` `#8b1a1a`
  (contact.astro ~304–314) are dark-on-dark in dark mode. Note
  `lit-bible.astro` (~470) already contains a per-page dark override for
  exactly this class of bug (`.lit-example__traditional`) — the pattern
  exists; it just wasn't applied elsewhere.
  Fix: introduce a semantic `--text-muted` token in `global.css` (light:
  `#5c5b57`; dark blocks: a light gray around `#a8a6a0` — pick a value
  ≥ 4.5:1 on #2e322e) and replace every hardcoded `#5c5b57` with it. Give
  the badges a token-based background that reads in both themes (e.g.
  `rgba(255,255,255,0.08)` in dark via a `--badge-bg` token). For form
  status, add dark-mode overrides (success: light green text such as
  `#7ed6a0` on a subtle green-tinted dark background; error: light red such
  as `#e08a8a` similarly), following the existing
  `@media (prefers-color-scheme: dark) :root:not([data-theme="light"])` +
  `:root[data-theme="dark"]` double-block pattern already used in
  lit-bible.astro. Once the tokens exist, fold lit-bible.astro's local
  override into them if straightforward.
  Verify: every listed element legible in dark mode (`npm run dev`, OS dark
  or DevTools emulation) with computed contrast ≥ 4.5:1; light mode
  unchanged; trigger a real form-status message (temporarily set text via
  DevTools) in both themes.
  NOTE: the related cream-hero dark-mode bug (hero titles invisible on the
  light band because the hero hardcoded `var(--cream)`) was already fixed during
  F5 — `.sd-hero`, `.contact-hero`, `.privacy-hero`, `.thanks-hero` now use
  `var(--surface)`. Still open here: the hardcoded grays, badges, and form-status
  colors listed above.

- [ ] **(O3) Right-size the images.**
  Problem: `public/assets/images/lsc-logo.png` is 2200×2200 / 177 KB and is
  loaded eagerly on EVERY page as a 40 px header logo, again as the ~320 px
  hero logo on the homepage with `fetchpriority="high"`, and again at 80 px
  in the footer. Worse: the hero logo is `display:none` under 700 px but
  still downloads at high priority on phones. `twb-banner.png` is
  1536×1024 / 3 MB displayed at ≤ 240 px on /podcasts/.
  Fix: generate properly sized WebP variants (sharp is the family-standard
  tool — litbible uses it in `scripts/build-og-images.mjs`; a one-off
  script or manual export is fine here, no need for a build step): e.g.
  `lsc-logo-80.webp` (2x for the 40px header), `lsc-logo-160.webp` (footer
  2x), `lsc-logo-640.webp` (hero 2x), `twb-banner-480.webp`. Update
  `SiteHeader.astro`, `SiteFooter.astro`, `index.astro` (hero), and
  `podcasts.astro` to use them (`srcset` where useful). For the homepage
  hero image, stop downloading it on mobile: either use `<picture>` with a
  media-queried source, or drop `fetchpriority="high"`+eager in favor of
  lazy so mobile at least deprioritizes it (picture is preferred). Keep the
  original `lsc-logo.png` in place — it's referenced by JSON-LD (`logo` in
  index.astro's Organization schema) and og fallbacks; large-but-cold is
  fine there. Alternatively adopt Astro's built-in `<Image>` component if
  it stays simple; don't add a heavyweight pipeline for 4 images.
  Verify: `npm run build`; DevTools network tab on / shows the header logo
  ≤ ~10 KB and no 177 KB png on mobile viewport; /podcasts/ no longer
  transfers 3 MB; images look crisp at 2x DPR.

- [ ] **(O4) Port litbible's internal link checker and wire it into CI.**
  Problem: nothing validates that internal links in the built site resolve
  (the S1 llms.txt 404 is the class of bug this catches for HTML).
  Fix: copy `scripts/check-links.mjs` from litbible (top-of-file comments
  explain the resolution rules; it's dependency-free, reads only `dist/`).
  Adaptations: this repo has no `scripts/` dir yet — create it; resolution
  already matches Astro's directory format used here (`trailingSlash:
  'always'`). Add `"check:links": "node scripts/check-links.mjs"` to
  package.json and a CI step after the build in deploy.yml (`npm run
  check:links`). Fix anything it finds.
  Verify: `npm run build && npm run check:links` exits 0 locally; CI runs
  it after build.

- [ ] **(O5) Add a test suite for the contact-form Worker, plus a CI job.**
  Problem: `workers/contact-form/` has no tests. litbible's sibling Worker
  (same code lineage) has a full vitest suite running in real workerd:
  `workers/contact-form/test/index.test.js`, `vitest.config.js`, and
  devDeps `@cloudflare/vitest-pool-workers` + `vitest` in its
  `workers/contact-form/package.json` — the suite hand-builds `env`, spies
  `CONTACT_EMAIL.send` / `RATE_LIMITER.limit`, and stubs Turnstile's
  siteverify fetch per test.
  Fix: port the harness and adapt the cases to THIS Worker's behavior
  (single form, no app-support variant): method gating (405 + Allow),
  rate-limit 429 and fail-open on limiter throw, honeypot fake-200 with no
  send, field validation (missing fields, bad email, length caps,
  CRLF-collapse in `headerSafe`), Turnstile 403 on failure/stub-error,
  JSON vs. 303 content negotiation via the Accept header, the
  DISPLAY_TO-rejected retry path (first send throws → second send uses
  DEST_EMAIL), and send-failure 500. Add `"test": "vitest run"` to the
  worker's package.json. In `.github/workflows/deploy.yml`, add a
  `worker-tests` job copied from litbible's `ci.yml` `worker-tests` job
  (working-directory + `cache-dependency-path:
  workers/contact-form/package-lock.json`); it should run on PRs and
  pushes but is not a deploy dependency.
  Verify: `cd workers/contact-form && npm test` green locally; CI job green.

- [ ] **(O6) Inline critical CSS to prevent theme/background flash.**
  Problem: the page background and text color arrive only with the full
  stylesheet; on slow connections dark-mode users get a light flash.
  litbible inlines a small critical block in its `Layout.astro` (line ~47):
  html/body reset, body background+color for light AND both dark-mode
  selector forms, plus header/main min-heights to reduce CLS.
  Fix: port the pattern into this repo's `src/layouts/Layout.astro`,
  substituting this site's values: light `#E1DFD9`/`#1D231C`, dark
  `#1a1e1a`/`#e4e2dc`, header height 68px (see `.site-header__inner`).
  Keep it tiny (< ~600 bytes) and emit via a `<style set:html={...}>` (or
  is:inline style tag) before the stylesheet link.
  Verify: throttle CSS in DevTools (or block global.css) — background/text
  colors correct in both themes before the stylesheet loads; no layout
  shift of the header; `npm run build`.

- [ ] **(O7) Port the theme toggle.**
  Problem: this site's CSS already supports explicit
  `:root[data-theme="dark"]` / `[data-theme="light"]` overrides (global.css
  and lit-bible.astro), but nothing ever sets `data-theme` — users are stuck
  with the OS preference. litbible ships a toggle: see `lit-theme` usages in
  its `src/components/SiteHeader.astro` and `src/layouts/Layout.astro`
  (inline pre-paint script reads localStorage and stamps `data-theme` on
  `<html>`; absence of the key = follow system).
  Fix: port both halves — the pre-paint stamping script into Layout.astro
  (use storage key `lsc-theme`) and the toggle control into
  SiteHeader.astro (desktop nav + mobile overlay), styled with this site's
  tokens. Interacts with O6: the critical CSS must respect `data-theme` the
  way litbible's does.
  Verify: toggle switches themes instantly with no flash on reload;
  localStorage persists; removing the key reverts to system preference;
  keyboard/AT: the toggle is a button with an accurate accessible name in
  both states.

- [ ] **(O8) Contain focus properly in the mobile menu dialog.**
  Problem: `SiteHeader.astro`'s overlay sets `aria-modal="true"` and makes
  `main`/`footer` inert, but the header itself stays live — the brand link
  remains tabbable BEHIND the open dialog, contradicting aria-modal.
  Fix options (pick one, test with a screen reader if possible): (a) also
  set `inert` on `.site-header__inner` (the overlay lives outside it in the
  DOM — verify; if not, restructure so the overlay is a sibling), restoring
  on close; or (b) move the overlay element out of `<header>` to be a
  direct child of `<body>` slot-side and inert the whole header. Keep the
  existing focus-restore and Escape handling. While in the file: the close
  button's `✕` is fine, but confirm the panel's `tabindex="-1"` focus
  target and that Tab from the last link wraps within the dialog (add a
  simple focus trap only if inert leaves gaps — browser-native inert on
  everything else IS the trap).
  Verify: with the menu open, Tab cycles only through dialog controls;
  VoiceOver/NVDA (or at minimum Chrome's accessibility tree) shows
  background content hidden; closing restores focus to the toggle.

- [ ] **(O9) Give no-JS users a navigation fallback.**
  Problem: under 900px the nav collapses to the JS-only overlay; the toggle
  does nothing without JS, leaving footer links as the only navigation.
  Fix: smallest robust option — a `<noscript>` block in `SiteHeader.astro`
  rendering the plain nav list (styled compactly, wrapping under the
  header bar) so content is reachable; hide the useless toggle inside
  `<noscript>` CSS (`.site-header__menu-toggle { display: none }`).
  Alternative (bigger): a CSS-only `<details>` menu — only if the noscript
  version proves unworkable visually. Don't regress the JS experience.
  Verify: disable JS (DevTools), viewport < 900px: all five nav links +
  Support reachable in the header area; JS-enabled behavior unchanged.

## Fable — one session each, owner in the loop

- [x] **(F1) Decide and implement a hero text-contrast strategy.**
  DONE 2026-07-18: owner chose option (a) — hero surfaces darkened to
  litbible's theme-invariant `--green-deep: #0F6B33`, cream text kept
  (5.0:1; outline buttons pass too). Token added to global.css, decision
  documented in CLAUDE.md's Design System. Also fixed
  `.btn--hero-outline:hover` on /lit-bible/ (green-on-cream 2.7:1 → ink).
  Problem: cream (#E1DFD9) text on the brand-green (#209D50) hero
  backgrounds measures ~2.6:1 — below even the 3:1 large-text AA bar, and
  far below 4.5:1 for the lede/eyebrow body text. Affected heroes:
  index, about, lit-bible, podcasts, 404 (all `background: var(--green)`),
  plus `.hero .btn--outline` (cream on green). This is brand-defining
  shared design language with litbible, so it needs a deliberate call, not
  a mechanical fix. Options to explore with the owner: (a) darken the hero
  surface (e.g. a `--green-deep`-tinted or ink-tinted hero variant) keeping
  cream text; (b) switch hero body text (lede/eyebrow) to white + heavier
  weight and accept display-size headlines as-is only if a documented
  exception is chosen; (c) ink text on green; (d) check what litbible does
  on its green surfaces today (`body.bg-green` usage) and stay consistent
  with it. Whatever lands: eyebrow and lede must reach 4.5:1, headlines at
  least 3:1, and the outline buttons must pass. Document the decision in
  CLAUDE.md's Design System section.
  Verify: computed contrast on final pairs; owner sign-off on the look in
  light AND dark mode.

- [x] **(F2) Draft the Cloudflare security-header ruleset (owner applies in
  OW1).**
  DONE 2026-07-18: wrote `docs/security-headers.md` — a paste-ready Cloudflare
  checklist. Owner decisions this session: HSTS `max-age=31536000;
  includeSubDomains` WITHOUT preload; CSP split like litbible (enforce only
  structural directives `frame-ancestors 'none'; object-src 'none'; base-uri
  'self'; form-action 'self'`, keep the resource allowlist permanently
  Report-Only). Origin allowlist was built by loading /support/ and /contact/
  live (2026-07-18) and inventorying actual third-party origins: Give Lively
  (`secure.givelively.org` + Google Fonts it pulls in), Turnstile
  (`challenges.cloudflare.com`), CF Web Analytics
  (`static.cloudflareinsights.com`). Notably tighter than litbible's:
  /podcasts/ links out to Apple/Spotify/YouTube rather than embedding them, so
  no podcast `frame-src` needed. Remaining: OW1 (owner pastes it into
  Cloudflare).
  Problem: the live site sends NO security headers — verified 2026-07-18
  with curl: no HSTS, no X-Content-Type-Options, no Referrer-Policy, no
  CSP, no Permissions-Policy. GitHub Pages can't set them, but Cloudflare
  proxies the zone (that's how the contact Worker runs), so a Response
  Header Transform Rule can.
  Fix: produce a concrete spec the owner can paste into the Cloudflare
  dashboard: `Strict-Transport-Security: max-age=31536000;
  includeSubDomains` (discuss `preload` with owner — it's hard to undo),
  `X-Content-Type-Options: nosniff`, `Referrer-Policy:
  strict-origin-when-cross-origin`, `Permissions-Policy` denying unneeded
  features, and a Content-Security-Policy sized to reality: the site runs
  inline scripts/JSON-LD, Turnstile (`challenges.cloudflare.com` script +
  frame), the Give Lively widget (`secure.givelively.org` script + its
  frame/connect targets — inventory what it actually loads on /support/
  before writing the policy), and Cloudflare Web Analytics
  (`static.cloudflareinsights.com` + beacon connect). Start with
  `Content-Security-Policy-Report-Only`, watch the console on every page
  (especially /support/ and /contact/), then graduate to enforcing.
  Include the exact rule expressions/order for the dashboard, and note the
  Worker route (`/contact/submit`) sets its own responses — decide whether
  the transform rule should also apply there (generally yes, harmless).
  Deliverable: a checklist the owner executes in OW1, committed as part of
  this item (e.g. a `docs/security-headers.md` or a section in
  DISASTER-RECOVERY.md once F3 exists).
  Verify: after OW1 applies it, `curl -sI https://liberatingscripture.org/`
  shows the headers; no CSP violations in console on any page.

- [x] **(F3) Write DISASTER-RECOVERY.md for this site.**
  DONE 2026-07-18: wrote `DISASTER-RECOVERY.md` (repo root), adapted from
  litbible's template to this site's simpler stack — GitHub Pages via
  `deploy.yml` (not Cloudflare Pages) fronted by the Cloudflare proxy, one
  Worker `lsc-contact-form`, one Turnstile widget, Email Routing send binding,
  Give Lively embed, podcast accounts (linked not embedded), Apple Pay
  domain-association file. Secrets listed BY NAME ONLY (`TURNSTILE_SECRET`,
  `DEST_EMAIL`, `DISPLAY_TO`); noted there are no GitHub Actions secrets.
  Cross-linked from CLAUDE.md and from `docs/security-headers.md`. Owner
  supplied the live DNS inventory (14 records, captured 2026-07-18) — filled in;
  this also corrected the mail story: inbound is Cloudflare Email Routing
  (MX → route{1,2,3}.mx.cloudflare.net) forwarding to a verified destination,
  not a Google-hosted mailbox (Google DKIM/verification exist for the Drive/
  Workspace identity). Owner also confirmed inbound mail forwards cross-org into
  the litbible.net Google Workspace (this org has no mailbox of its own) —
  documented as architecture only; the specific address is the `DEST_EMAIL`
  value and stays in the private doc, and a cross-org recovery note was added.
  Owner filled the rest: registrar is Porkbun, owner manages Give Lively, BDR
  manages the podcast accounts, and the private "Accounts & Recovery" Drive doc
  exists. Only open marker left is a reminder to *confirm* the recovery-chain
  mitigations (Porkbun auto-renew, out-of-chain recovery email/phone) are
  actually configured — specifics live in the private doc. Public file carries
  no secret values or login addresses.
  Problem: everything reader-facing rebuilds from the repo, but the deploy
  configuration and secrets live only in third-party dashboards and are
  documented nowhere: the Cloudflare zone (DNS records, proxy status, the
  Worker route for `/contact/submit`, Email Routing config + verified
  destination address, the Turnstile widget + secret, Web Analytics),
  Worker secrets by name (`TURNSTILE_SECRET`, `DEST_EMAIL`, `DISPLAY_TO`),
  the GitHub Pages setup (custom domain, Actions), the Give Lively account
  (campaign slug `liberating-scripture-collective`, the Apple Pay domain
  association file in `public/.well-known/`), and the podcast platform
  accounts referenced site-wide. litbible's `DISASTER-RECOVERY.md` is the
  template — including its critical conventions: secrets BY NAME AND
  LOCATION ONLY (never values — if a value appears, rotate it), no login
  addresses or recovery contacts in the public repo (those live in the
  private accounts doc in the LSC Google Drive), and a "from-zero redeploy"
  narrative covering lost-laptop / lost-account / handover scenarios.
  Write the draft from repo knowledge + litbible's structure; the owner
  fills in dashboard-only facts (this is why it's a Fable item — expect a
  back-and-forth pass). Cross-link from CLAUDE.md.
  Verify: owner confirms every dashboard/secret is listed and nothing
  sensitive leaked; a cold-start reader could redeploy from it.

- [x] **(F4) Tighten the privacy policy's cookie claims around the Give
  Lively embed.**
  DONE 2026-07-18: verified reality first — loaded /support/ and /contact/
  live and inspected storage: the SITE's own origin sets zero cookies /
  localStorage / sessionStorage on both pages at render, and Turnstile set
  nothing either; Give Lively runs its own third-party script + modal iframe
  and can set its own storage during the donation flow. Reworded the "What we
  don't do" paragraph in `src/pages/privacy.astro` to keep the honest "this
  site sets no cookies of its own" claim while carving out the Give Lively
  donation widget as the one exception (links to their privacy policy), in the
  page's plain voice. Bumped the effective date and JSON-LD `dateModified` to
  2026-07-18. The "responsible contact identity" question stays with OW5.
  Owner should approve the final wording.
  Problem: `src/pages/privacy.astro` ("What we don't do") states flatly
  "no cookies set by this site", while /support/ embeds Give Lively's
  third-party script on our origin, which may set cookies/localStorage of
  its own. The donations bullet does disclose the processor, but the
  blanket sentence could contradict observable behavior on that one page.
  Fix: first VERIFY reality — load /support/ with DevTools
  (Application → Storage) and record what the widget actually sets, and
  double-check Turnstile on /contact/ while at it. Then scope the sentence
  honestly, e.g. "no cookies set by this site (the embedded donation
  widget on the support page is operated by Give Lively and may set its
  own; see their privacy policy)" — in the site's plain, warm voice.
  Consider also whether the policy should name a responsible contact
  identity beyond the form (see OW5). Bump the effective date and the
  JSON-LD `dateModified` if wording changes.
  Verify: policy statements match observed storage behavior on every page;
  owner approves the wording.

- [x] **(F5) Per-page OG images for the pages with real art.**
  DONE 2026-07-19: owner picked five pages — the homepage, /podcasts/,
  /lit-bible/, /support/, and /spiritual-direction/ — and the committed
  one-shot-script route. Added
  `scripts/build-og-images.mjs` (trimmed from litbible's recipe: sharp +
  opentype.js, deterministic, run by hand via `npm run build:og`, NOT in the
  build), with the two OG fonts + `OFL.txt` committed under `scripts/og/fonts/`
  and litbible's `lit-logo.png` copied to `scripts/og/` as a card source asset.
  Cards (all 1200×630, < 80 KB) written to `public/assets/og/`: house style is
  the ink field (sampled to lsc-logo's exact corner `#1D231C` so the gold emblem
  composites seamlessly), a green accent bar, the title in Fraunces, the org
  wordmark in Inter, and `liberatingscripture.org` in green-light. og-support and
  og-spiritual-direction carry the gold LSC emblem; og-lit-bible carries the LIT
  Bible's own green-disc logo in a green ring (echoing litbible.net's cards);
  og-podcasts shows the two podcast covers (`fit-cover.webp` + `twb-square.png`,
  both already square so no title gets cropped) as rounded tiles with the footer
  moved left to clear them. og-home carries the gold emblem with the hero thesis
  line ("Scripture that liberates rather than controls") as its title. Wired via
  Layout's `ogImage`/`ogImageAlt` props on the five pages (the homepage now has
  its own card instead of the shared og-default.png, which stays the fallback
  for the remaining pages). **S13 landed as its prerequisite** (see below). Also renamed the
  spiritual-direction page's wording to **"Spiritual Companionship"** (owner
  decision — umbrella term that includes classical spiritual direction): title,
  H1, section headings, meta description, JSON-LD, and header/footer nav labels;
  URL stays `/spiritual-direction/` (no redirects). NOTE for S4: `twb-square.png`
  is now consumed by the OG generator — do NOT delete it. Remaining: owner runs
  a social-debugger validator pass per page after deploy (opengraph.xyz or the
  platforms' own debuggers).
  Incidental dark-mode fix (found during review): the cream page heroes hardcoded
  `background: var(--cream)` (a raw, theme-invariant token) while their heading/
  lede text flips light in dark mode — so the titles were nearly invisible on the
  light band. Swapped to `background: var(--surface)` (cream in light — byte-
  identical there — and `#242824` in dark) on `.sd-hero`, `.contact-hero`,
  `.privacy-hero`, and `.thanks-hero`. The other `var(--cream)` uses are cream
  buttons ON green heroes (theme-invariant by design, per F1) and were left alone.
  Problem: every page shares one OG image; /podcasts/ and /lit-bible/ have
  distinctive art and would share far better with their own cards.
  litbible generates share cards programmatically
  (`scripts/build-og-images.mjs`: sharp + opentype.js, fonts committed
  under `scripts/og/fonts/`, deterministic output, owner-approved design)
  — but that scale is overkill for ~9 static pages.
  Fix: with the owner, pick per-page card designs consistent with the
  litbible card look (ink field, logo, green accent, wordmark). Either
  hand-produce 1200×630 PNGs into `public/assets/og/` or write a trimmed
  one-shot script reusing litbible's recipe. Wire them via the existing
  `ogImage` prop (S13 must land first so dimensions aren't misreported;
  pass `ogImageAlt` text per page too). Candidates: /podcasts/ (FIT cover
  art + TWB), /lit-bible/, /support/.
  Verify: validator pass (opengraph.xyz or the socials' own debuggers)
  shows the right card per page; file sizes reasonable (< ~150 KB each).

- [x] **(F6) Donor-trust polish on /support/.**
  DONE 2026-07-18: moved the `.donate-band__status` 501(c)(3) note ABOVE the
  Give Lively widget in `src/pages/support.astro` (was below it) and added the
  EIN inline — "a registered 501(c)(3) nonprofit (EIN 41-5314350)". Owner
  confirmed the EIN this session (satisfies the OW2 gate for this use). No CSS
  change needed — `.donate-band` is a flex column, the block reflows cleanly.
  Problems (marketing/legal judgment involved): (a) the 501(c)(3)
  tax-deductibility reassurance sits BELOW the Give Lively widget — donors
  decide before they type an amount; (b) the EIN is published in the
  homepage JSON-LD (`taxID: 41-5314350`) but not shown to humans — donors
  look for it for receipts and employer matching-gift lookups.
  Fix: with owner approval, move or duplicate the 501(c)(3) status note
  above the widget and add the EIN to it ("EIN 41-5314350") — after OW2
  confirms the number. Keep the site's voice; don't clutter the donate
  band.
  Verify: owner sign-off; page reads naturally; contrast/dark-mode fine.

- [x] **(F7) Give "The Table We're Building" notify flow some context.**
  DONE 2026-07-18: near-term version, owner-approved. The TWB "Get notified"
  CTA in `src/pages/podcasts.astro` now links to `/contact/?topic=twb`.
  `src/pages/contact.astro` reads the param client-side (progressive
  enhancement): when `topic=twb`, it unhides a green context notice above the
  form and pre-fills the empty message textarea with an editable starter
  ("I'd like to be notified when The Table We're Building launches."). No
  Worker change — the signal rides in the message body; the form posts
  identically with or without the param, and no-JS visitors see the normal
  form. Newsletter remains the eventual answer (owner backlog; ties to
  litbible's Brevo setup).
  Problem: the "Get notified" CTA on /podcasts/ drops people into the
  generic contact form with no indication of why they came — friction and
  lost signal. A newsletter is the real answer eventually (the privacy
  policy already anticipates one), but that's an owner-scale decision.
  Fix (near-term, with owner): smallest useful version — link with a query
  param (`/contact/?topic=twb`) and have contact.astro pre-fill or hint
  ("Interested in The Table We're Building? Just say so in the message.").
  Even a static line of copy above the form when the param is present
  works; avoid overbuilding. Note the newsletter question for the owner's
  backlog (ties to litbible's Brevo setup if ever pursued).
  Verify: following the CTA makes the purpose obvious; form still submits
  fine with and without the param.

- [x] **(F8) Editorial review: homepage title tag and register.**
  DONE 2026-07-18: owner picked "lead with the distinctive part" for (a) —
  `src/pages/index.astro`'s `<Layout title>` changed from
  "Liberating Scripture Collective | Radically Inclusive Scripture,
  Conversation & Community" (~85 chars) to "Radically Inclusive Scripture &
  Community | Liberating Scripture Collective" (~76 chars total, but the
  distinctive lead phrase now survives ~60-char truncation). `og:title` and
  `twitter:title` in Layout.astro render the same prop, so they update
  automatically; JSON-LD `name` fields are the org name, not the page
  title, and were correctly left untouched. For (b), owner chose to keep
  "Here's what we're cooking up so far" as intentional warmth — no change.
  Problem: Two owner-taste calls found in the audit: (a) the homepage
  `<title>` was ~85 characters — search engines truncate around 60. (b)
  "Here's what we're cooking up so far" (index projects heading) is a
  register drop from the surrounding copy — may be intentional warmth;
  flagged rather than unilaterally changed.
  Verify: `npm run build`; `dist/index.html` `<title>` and `og:title` both
  read the new string.

- [x] **(F9) Org social presence in the footer.**
  DONE 2026-07-18: owner decided the Found in Translation podcast channels
  (YouTube/Apple/Spotify) are not "the org's" channels in the sense this
  item meant, and no other org-level social accounts exist. No footer
  change made; JSON-LD `sameAs` left as-is (accurate as podcast-project
  links, not claimed as org channels).
  Problem: the footer links litbible.net properties but no social channels
  for the org itself, even though the homepage JSON-LD `sameAs` claims
  YouTube/Apple/Spotify (all Found in Translation channels). Whether those
  count as "the org's channels" — and whether any org-level accounts exist
  or are planned — was an owner question.
  Verify: owner decision recorded; no code change required.

## Owner — decisions & dashboard tasks (no model)

- [ ] **(OW1) Apply the security headers in Cloudflare.**
  Execute the checklist in `docs/security-headers.md` (written in F2) in the
  Cloudflare dashboard: HSTS via SSL/TLS → Edge Certificates; the static
  headers + split CSP via Rules → Transform Rules → Modify Response Header.
  The enforced CSP is structural-only; the resource allowlist stays
  Report-Only (owner decision). Afterwards run
  `curl -sI https://liberatingscripture.org/` and click through /support/
  and /contact/ with the console open, adding any origin the Give Lively
  payment step flags in Report-Only.

- [ ] **(OW2) Verify the Organization schema facts: foundingDate and EIN.**
  `src/pages/index.astro` JSON-LD says `foundingDate: "2020"` and `taxID:
  "41-5314350"`. 2020 is when the TRANSLATION began (per /about/); if the
  501(c)(3) was incorporated later, the schema should carry the org's
  actual founding/incorporation year. Confirm the EIN digits against IRS
  paperwork before F6 prints them for humans. Report the correct values;
  any model can then patch the JSON-LD.

- [ ] **(OW3) Decide the repo LICENSE.**
  The public repo has no LICENSE file, so the code defaults to
  all-rights-reserved and the content's terms live only in llms.txt.
  litbible's `LICENSE` is a dual-license structure (code under one
  license, translation/content under CC BY-NC-ND 4.0) — decide whether to
  mirror that split here (e.g. MIT for the site code, © LSC for the
  copy). Once decided, a model can draft it from litbible's file.

- [ ] **(OW4) Confirm whether `public/assets/og/og-square.png` is used
  anywhere off-site.**
  It's referenced nowhere in this repo (S4 already removed the other
  unused images), but square brand images often get pasted into podcast
  directories, social profiles, or Google Business listings by URL. If
  nothing external hotlinks it, tell a model to delete it; if something
  does, keep it and add a note to CLAUDE.md's structure section saying
  what references it.

- [ ] **(OW5) Decide whether to publish a fallback contact address.**
  If the contact form is ever down (Worker outage, Turnstile failure),
  the site has no other contact path — the only true dead-end found in
  the audit. Publishing e.g. `contact@liberatingscripture.org` (which
  already exists for sending) on /contact/ or /privacy/ fixes that at the
  cost of scraper spam. Decide; a model implements either way (including
  F4's privacy-policy contact-identity question).

- [ ] **(OW6) Check charitable-solicitation registration obligations.**
  The site solicits donations nationally (Give Lively embed). Most US
  states require charitable registration before solicitation, with varying
  small-nonprofit exemptions. This is outside the repo — confirm with
  whoever handles LSC's compliance (Give Lively's help docs cover it at a
  high level). Nothing to change in the repo unless disclosures are
  required (some states mandate specific disclosure text on donation
  pages — if so, feed the required text to F6).

- [ ] **(OW7) Finalize the LSC values statement.**
  Carried over from CLAUDE.md's old Open Items: the working values now
  live as prose in /about/'s "What we believe" section. When the board
  finalizes the official values statement, hand it to a model to
  reconcile the About page (and any echoes on the homepage) with the
  final language.
