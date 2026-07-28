# Security headers — Cloudflare setup checklist

> **What this is.** GitHub Pages can't set response headers, but the
> `liberatingscripture.org` zone is **proxied through Cloudflare** (that's how
> the contact-form Worker owns `/contact/submit` at the edge), so Cloudflare can
> add them for us. This is the paste-ready checklist for the owner to execute in
> the Cloudflare dashboard — it's FIXLIST item **OW1**, drafted here as **F2**.
>
> Nothing here changes the repo's behavior; it's all dashboard configuration.
> The origin allowlist below was built by loading `/support/` and `/contact/`
> live and inventorying every third-party origin they actually load (2026-07-18)
> — re-verify it if the site ever adds an embed or widget.
>
> **Status.** Step 1 (HSTS) applied 2026-07-22. Step 2 (the transform rule)
> applied 2026-07-28, with the Report-Only value corrected and re-pasted the
> same day — the version used when the rule was first created carried a bare
> `https://sibforms.com`, which matches none of the site's actual form targets
> (see the `form-action` note below). Step 3's Report-Only watch is the part
> still outstanding.

## Design decisions (owner, 2026-07-18; CSP split revised 2026-07-22)

- **HSTS at 180 days, without `preload`.** `max-age=15552000;
  includeSubDomains`, no `preload` — owner-confirmed intentional value
  (2026-07-22), not the more common 12-month max-age. Reversible either way;
  `preload` is the near-permanent, whole-domain commitment being avoided for
  now.
- **CSP enforcement is scoped to directives that never name a third-party
  origin**, so nothing here can silently block a future integration just
  because someone forgot to update this file:
  1. **Enforced**: `frame-ancestors 'none'`, `object-src 'none'`,
     `base-uri 'self'`. These constrain attackers but never allowlist a
     specific origin, so adding a widget/form/embed later never requires
     touching them.
  2. **Report-Only**: `form-action` plus the full resource allowlist
     (script-src, style-src, connect-src, frame-src, img-src, font-src).
     `form-action` is grouped here, not with the enforced set, because it
     *does* name specific origins (every target a form may submit to) —
     exactly the kind of line a future integration could need and someone
     could forget to update. The whole Report-Only header is kept as living
     documentation of every third-party origin the site uses, and as free
     telemetry. On a static site with no logins, a missed origin silently
     breaking Turnstile, the Give Lively widget, or the newsletter is a
     likelier and worse failure mode than what enforcing would stop. Revisit
     only if the site ever gains accounts/logins.

## What the pages actually load (origin inventory, 2026-07-18)

| Origin | Loaded on | Used for | CSP directive |
|--------|-----------|----------|---------------|
| `secure.givelively.org` | /support/ | donate widget script, images, modal **iframe** | script/img/connect/frame |
| `fonts.googleapis.com` | /support/ | Google Fonts stylesheet (pulled in by the GL widget) | style |
| `fonts.gstatic.com` | /support/ | the font files that stylesheet references | font |
| `challenges.cloudflare.com` | /contact/, every page (footer newsletter) | Turnstile script + its **iframe** | script/frame |
| `1742a6b7.sibforms.com` | every page (footer newsletter), `/unsubscribe/` | the subscribe/unsubscribe **POST target** only — reached by our own `fetch`, and by a native form POST as fallback | connect/**form-action** |
| `static.cloudflareinsights.com` | every page | Cloudflare Web Analytics beacon script | script/connect |
| `cloudflareinsights.com` | every page | analytics beacon POST target | connect |
| `/cdn-cgi/*` (rum, challenge-platform, speculation) | every page | Cloudflare edge (same-origin) | covered by `'self'` |

No page statically embeds an `<iframe>`; the only frames created at runtime are
Turnstile's and Give Lively's modal. The podcast links on /podcasts/ are plain
outbound `<a>` links, **not** embedded players — so, unlike litbible, this
site's `frame-src` does **not** need Apple/Spotify/YouTube.

## Step 1 — HSTS (SSL/TLS → Edge Certificates)

Cloudflare has a dedicated HSTS control; use it rather than a transform rule.

1. Dashboard → the `liberatingscripture.org` zone → **SSL/TLS → Edge
   Certificates → HTTP Strict Transport Security (HSTS) → Enable**.
2. Set: **Max-Age = 180 days** (`15552000`), **Apply HSTS to subdomains
   (includeSubDomains) = On**, **Preload = Off**, **No-Sniff header** can stay
   off here (we set `X-Content-Type-Options` in step 2 instead).
3. Confirm the acknowledgement prompt (HSTS means browsers will refuse plain
   HTTP to the domain and its subdomains for a year — fine, the site is
   HTTPS-only).

## Step 2 — Static headers (Rules → Transform Rules → Modify Response Header)

Create **one** rule named `security-headers`, matching **all incoming
requests** (expression: `true`, or "All incoming requests"), and add these as
**Set static** header entries:

```
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(), microphone=(), geolocation=()
Content-Security-Policy: frame-ancestors 'none'; object-src 'none'; base-uri 'self'
Content-Security-Policy-Report-Only: default-src 'self'; form-action 'self' https://*.sibforms.com; script-src 'self' 'unsafe-inline' https://challenges.cloudflare.com https://secure.givelively.org https://static.cloudflareinsights.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://secure.givelively.org; img-src 'self' data: https://secure.givelively.org; font-src 'self' https://fonts.gstatic.com; connect-src 'self' https://secure.givelively.org https://static.cloudflareinsights.com https://cloudflareinsights.com https://*.sibforms.com; frame-src https://challenges.cloudflare.com https://secure.givelively.org; media-src 'self'
```

Notes on the values:

- **Enforced CSP is limited to directives that never name a third-party
  origin.** `frame-ancestors 'none'` backs up `X-Frame-Options: DENY`
  (nothing may frame us). `object-src 'none'` and `base-uri 'self'` are
  cheap, universally-safe hardening. None of the three need editing when a
  widget/form/integration is added later — that's why they're safe to
  enforce permanently.
- **`form-action` lives in Report-Only, not with the other three.** It's the
  one directive that lists specific origins (every target a form may submit
  to), so if it were enforced, a missing origin would mean the browser
  silently blocks the submit — no fallback, no error the visitor can act on.
  That's the same maintenance risk as the resource allowlist below, so it's
  grouped with it instead. Today: `/contact/submit` is same-origin
  (`'self'`), and both Brevo forms (the footer newsletter and `/unsubscribe/`)
  post cross-origin to `https://1742a6b7.sibforms.com`, hence
  `https://*.sibforms.com`. **The wildcard is load-bearing, not belt-and-
  braces**: the action is on a per-account subdomain, so a bare
  `https://sibforms.com` matches nothing and would flag every submit.
  The same is true of `connect-src` — the forms submit with our own `fetch`
  (see CLAUDE.md, "The newsletter submits itself"), so the POST is subject to
  `connect-src` as well as `form-action`, and both need the wildcard.
  **If a form is ever added, removed, or repointed, update BOTH lines and
  watch Report-Only for violations** —
  nothing will block the submit if you forget, but nothing will warn you
  either unless you're watching the console.
- **`'unsafe-inline'` in the Report-Only script-src** is required by Astro's
  `is:inline` scripts and the inline Give Lively bootstrap; JSON-LD `<script
  type="application/ld+json">` blocks are data, not executable, and are exempt.
  Because this is `'unsafe-inline'` rather than a hash allowlist, the exact
  bytes of the inline scripts don't matter — an Astro/minifier upgrade that
  rewrites them (as the Astro 7 bump did) needs no change here.
- **`sibforms.com` is deliberately absent from `script-src`.** Brevo's
  `main.js` is not loaded — the forms submit themselves (CLAUDE.md explains
  why it must not come back). The origin is a POST target only.
- The rule will also apply on the Worker route `/contact/submit`. That's
  harmless (the Worker sets its own response body/headers; these are additive) —
  **leave it applying to all requests.**

## Step 3 — Watch Report-Only, then (optionally) graduate

1. After the rule is live, open **DevTools → Console** and click through
   **every** page — especially **/support/** (exercise the donate widget, open
   the amount/checkout modal) and **/contact/** (let Turnstile render). Also
   hover the **footer newsletter** on any page to trigger its lazy load, and
   send a real test subscribe through it. Only the three structural
   directives (`frame-ancestors`/`object-src`/`base-uri`) are enforced, so a
   missing origin anywhere else — including `form-action` — shows up as a
   `[Report Only]` console violation rather than an actual failure. Treat a
   violation as "add this before ever enforcing," not as a live bug.
2. The Give Lively **payment step** (card fields, Stripe/PayPal) was not driven
   to completion during the 2026-07-18 inventory, so its deepest origins may not
   be listed. In Report-Only that's harmless — but if you take a real test
   donation, watch the console and add any origin it flags.
3. Add missing origins to the Report-Only header and re-check. Per the owner
   decision above, only `frame-ancestors`/`object-src`/`base-uri` are
   enforced — `form-action` and the resource allowlist **stay Report-Only** —
   do not flip either to enforcing without revisiting that tradeoff.

## Verify (after applying)

```sh
curl -sI https://liberatingscripture.org/ | grep -iE 'strict-transport|content-security|x-content-type|x-frame|referrer-policy|permissions-policy'
```

Expect: HSTS, both CSP headers, `X-Content-Type-Options`, `X-Frame-Options`,
`Referrer-Policy`, `Permissions-Policy` all present. Then browse /support/ and
/contact/ with the console open and confirm no unexpected Report-Only
violations.
