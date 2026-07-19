# Security headers — Cloudflare setup checklist

> **What this is.** The live site sends **no** security headers today (verified
> 2026-07-18 with `curl -sI`). GitHub Pages can't set response headers, but the
> `liberatingscripture.org` zone is **proxied through Cloudflare** (that's how
> the contact-form Worker owns `/contact/submit` at the edge), so Cloudflare can
> add them for us. This is the paste-ready checklist for the owner to execute in
> the Cloudflare dashboard — it's FIXLIST item **OW1**, drafted here as **F2**.
>
> Nothing here changes the repo's behavior; it's all dashboard configuration.
> The origin allowlist below was built by loading `/support/` and `/contact/`
> live and inventorying every third-party origin they actually load (2026-07-18)
> — re-verify it if the site ever adds an embed or widget.

## Design decisions (owner, 2026-07-18)

- **HSTS without `preload`.** `max-age=31536000; includeSubDomains`, no
  `preload`. Full protection for anyone who's visited once, and reversible;
  `preload` is a near-permanent, whole-domain commitment we can add later if
  ever wanted.
- **CSP is split in two, mirroring litbible** (its owner decision 2026-07-10 —
  same rationale holds here):
  1. an **enforced** policy with only *structural* directives — the ones that
     constrain attackers but never need editing when we add a widget; and
  2. a **Report-Only** resource allowlist that logs violations to the console
     and blocks nothing. It's kept as living documentation of every third-party
     origin the site uses, and as free telemetry. Enforcing it was rejected
     because a single missed origin would silently break Turnstile or the Give
     Lively donate widget, and on a static site with no logins that failure mode
     is likelier than the threat enforcing would stop. Revisit only if the site
     ever gains accounts/logins.

## What the pages actually load (origin inventory, 2026-07-18)

| Origin | Loaded on | Used for | CSP directive |
|--------|-----------|----------|---------------|
| `secure.givelively.org` | /support/ | donate widget script, images, modal **iframe** | script/img/connect/frame |
| `fonts.googleapis.com` | /support/ | Google Fonts stylesheet (pulled in by the GL widget) | style |
| `fonts.gstatic.com` | /support/ | the font files that stylesheet references | font |
| `challenges.cloudflare.com` | /contact/ | Turnstile script + its **iframe** | script/frame |
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
2. Set: **Max-Age = 12 months** (`31536000`), **Apply HSTS to subdomains
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
Content-Security-Policy: frame-ancestors 'none'; object-src 'none'; base-uri 'self'; form-action 'self'
Content-Security-Policy-Report-Only: default-src 'self'; script-src 'self' 'unsafe-inline' https://challenges.cloudflare.com https://secure.givelively.org https://static.cloudflareinsights.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://secure.givelively.org; img-src 'self' data: https://secure.givelively.org; font-src 'self' https://fonts.gstatic.com; connect-src 'self' https://secure.givelively.org https://static.cloudflareinsights.com https://cloudflareinsights.com; frame-src https://challenges.cloudflare.com https://secure.givelively.org; media-src 'self'
```

Notes on the values:

- **Enforced CSP (structural only).** `frame-ancestors 'none'` backs up
  `X-Frame-Options: DENY` (nothing may frame us). `form-action 'self'` means our
  forms can only submit to our own origin — the contact form posts to
  `/contact/submit`, a same-origin Worker route, so `'self'` is enough (there's
  no Brevo/sibforms here, unlike litbible). `object-src 'none'` and
  `base-uri 'self'` are cheap, universally-safe hardening. **These never need
  editing when a widget is added.**
- **`'unsafe-inline'` in the Report-Only script-src** is required by Astro's
  `is:inline` scripts and the inline Give Lively bootstrap; JSON-LD `<script
  type="application/ld+json">` blocks are data, not executable, and are exempt.
- The rule will also apply on the Worker route `/contact/submit`. That's
  harmless (the Worker sets its own response body/headers; these are additive) —
  **leave it applying to all requests.**

## Step 3 — Watch Report-Only, then (optionally) graduate

1. After the rule is live, open **DevTools → Console** and click through
   **every** page — especially **/support/** (exercise the donate widget, open
   the amount/checkout modal) and **/contact/** (let Turnstile render). Any
   `[Report Only]` CSP violation names an origin the allowlist is missing.
2. The Give Lively **payment step** (card fields, Stripe/PayPal) was not driven
   to completion during the 2026-07-18 inventory, so its deepest origins may not
   be listed. In Report-Only that's harmless — but if you take a real test
   donation, watch the console and add any origin it flags.
3. Add missing origins to the Report-Only header and re-check. Per the owner
   decision above, the resource allowlist **stays Report-Only** — do not flip it
   to enforcing without revisiting that tradeoff.

## Verify (after applying)

```sh
curl -sI https://liberatingscripture.org/ | grep -iE 'strict-transport|content-security|x-content-type|x-frame|referrer-policy|permissions-policy'
```

Expect: HSTS, both CSP headers, `X-Content-Type-Options`, `X-Frame-Options`,
`Referrer-Policy`, `Permissions-Policy` all present. Then browse /support/ and
/contact/ with the console open and confirm no unexpected Report-Only
violations.
