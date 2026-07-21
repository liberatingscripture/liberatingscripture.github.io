# Disaster Recovery — liberatingscripture.org

> **What this is.** The repo is the content store — everything reader-facing can
> be rebuilt from a clone. What *cannot* be rebuilt from the repo is the deploy
> configuration and secrets, which live only in third-party dashboards. This
> file lists every dashboard, every secret **by name and location only** (never
> values — if a value ever appears here, rotate it), and the from-zero redeploy
> path. Because this repo is **public**, login addresses and recovery contacts
> are also kept out; they live in the private **"LIT Bible — Accounts &
> Recovery"** doc in the Liberating Scripture Collective Google Drive (the same
> doc litbible.net uses — this org and that product share it). Update both in
> the same change whenever a dashboard, secret, or integration is added or
> removed.
>
> Scenarios it covers: lost laptop, lost account access, a deleted Cloudflare or
> GitHub project, or handing the site to someone else.
>
> **`[OWNER: …]` markers** flag facts only a dashboard knows — unlike litbible's
> zone, this repo can't read them. The owner fills those in on a first pass;
> this draft is otherwise complete from repo knowledge.

## The one-paragraph version

The site is a static **Astro** build deployed to **GitHub Pages** by a GitHub
Actions workflow (`.github/workflows/deploy.yml`) on every push to `main`; the
custom domain comes from `public/CNAME` (`liberatingscripture.org`). DNS for the
domain is on **Cloudflare with the proxy enabled**, which sits in front of
GitHub Pages — that's what lets one standalone **Cloudflare Worker**
(`lsc-contact-form`) own `liberatingscripture.org/contact/submit` at the edge.
The Worker delivers mail via **Cloudflare Email Routing's send binding**; bot
protection is **Cloudflare Turnstile** — two widgets of our own, one for the
contact form and a separate dedicated one for the footer newsletter. Traffic
measurement is **Cloudflare Web Analytics** (cookie-free). Off-platform:
**GitHub** (repo + Pages + Actions), **Give Lively** (donations, embedded on
/support/), **Brevo** (the footer newsletter — see below; a dedicated LSC list
in the same account litbible.net uses), and the **podcast platform accounts**
(Apple / Spotify / YouTube for *Found in Translation*). Everything else is in
the repo.

## Accounts & dashboards

This repo is **public**, so specific login addresses, the password-vault
location, and recovery contacts are deliberately NOT written here. They live in
the private **"LIT Bible — Accounts & Recovery"** doc in the **Liberating
Scripture Collective Google Drive**. In a real emergency, open that doc first;
this table only maps which services exist and which *kind* of identity owns each.

| Service | What it holds | Who logs in (specifics in the private doc) |
|---------|---------------|--------------------------------------------|
| Cloudflare | `liberatingscripture.org` zone (DNS, proxy), the Worker + its route, Email Routing (send-side), **both** Turnstile widgets (contact form + footer newsletter), Web Analytics, the security-header rules (see `docs/security-headers.md`) | The primary admin identity |
| GitHub | `liberatingscripture/liberatingscripture.github.io` repo, Pages, Actions | The primary admin identity |
| Porkbun (registrar) | `liberatingscripture.org` domain registration | The owner's Porkbun account (login in the private doc) |
| Give Lively | Donation widget on /support/ (nonprofit slug `liberating-scripture-collective`) | The owner |
| Brevo | The footer newsletter form posts to **a dedicated LSC list/form**, created in the same Brevo account litbible.net uses (the account login and recovery are litbible's; the list itself is an LSC asset with no second copy kept — same export caveat as litbible's own list). The captcha uses **our own dedicated Turnstile sitekey** (`0x4AAAAAAD6VVgt-e5g_YNul`, tracked in the Cloudflare row above), not litbible's — see FIXLIST OW9 for the one remaining verification step. Losing Brevo breaks the footer form; losing the Turnstile widget would too, but that one recovers the same way the contact form's does (we own it). | The primary admin identity (via litbible) |
| Apple Podcasts / Spotify / YouTube | *Found in Translation* listings (Apple id `1586737797`, Spotify show `6S2wWaM5oqknwncPfOEyZ6`, `@foundintranslationpodcast`) — **linked from the site, not embedded** | **Managed by BDR**, not the site owner — podcast recovery goes through them |
| Google Workspace (on the **litbible.net** domain) | The Google Drive holding the private Accounts doc, and the inbox that inbound `@liberatingscripture.org` mail is forwarded into. This org has no mailbox of its own — Cloudflare Email Routing forwards to a Workspace inbox on litbible.net (the specific address is the `DEST_EMAIL` secret value; kept in the private Drive doc). The `google._domainkey` + site-verification TXT records tie this domain to that same Google identity. | The primary admin identity |

## The dependency chain (read this first in a real emergency)

Like litbible, almost every account above logs in as — and password-resets
through — the **primary admin identity**, a mailbox that only works while three
things hold:

1. the **domain registration** is current (a lapse = no DNS at all),
2. the **Cloudflare zone** exists and carries the mail records (zone deletion =
   mail stops even though the registration is fine),
3. the **Google Workspace** account is active and its admin login recoverable.

Break any link and the recovery email for Cloudflare and GitHub — and the
password vault itself — can go dark with it.

**Cross-org note:** this org has no mailbox of its own — inbound
`@liberatingscripture.org` mail (including any account-recovery mail routed
through it) is forwarded by Cloudflare Email Routing into the **litbible.net
Google Workspace**. So liberatingscripture.org's recovery ultimately rides on
litbible.net's stack staying alive too (its registration, its Cloudflare zone,
its Workspace). In a shared-fate emergency, work litbible.net's own
`DISASTER-RECOVERY.md` dependency chain first — if that mailbox is reachable,
this domain's recovery mail is reachable.

`[OWNER: confirm these mitigations are actually configured, mirroring
litbible's: **Porkbun** auto-renew with a working payment method; the primary
admin account has recovery configured OUTSIDE this chain (a recovery email on a
domain not controlled through this stack, plus a personal phone); and that
outside recovery identity has its own recovery pointing at a trusted contact.
The specific addresses and phone belong ONLY in the private "Accounts &
Recovery" Drive doc (which now exists), never here.]`

## Cloudflare (the load-bearing account)

Losing this account is the worst case — it holds five distinct things:

1. **DNS zone `liberatingscripture.org`** — registered at **Porkbun**,
   nameservers pointed at Cloudflare (so the zone's records live in the
   Cloudflare dashboard, and a lapsed Porkbun registration takes down everything
   regardless of Cloudflare's health — keep renewal/payment current there),
   **proxy enabled** (orange cloud) so Cloudflare fronts GitHub Pages. The full
   record inventory
   is in **"DNS record inventory"** below — `[OWNER: capture it]`.
2. **The GitHub Pages origin behind the proxy** — the site itself is served by
   GitHub Pages, not Cloudflare Pages (see the GitHub section). Cloudflare only
   proxies. The DNS records that point the apex/`www` at GitHub Pages are the
   load-bearing part here.
3. **Worker `lsc-contact-form`** — routes `liberatingscripture.org/contact/submit`
   and `www.liberatingscripture.org/contact/submit`. Code, routes, the
   `FROM_EMAIL` var, and the rate-limit binding all live in
   `workers/contact-form/wrangler.toml` and redeploy with `npm run deploy`
   there; only the secrets (below) need re-entering by hand. The rate-limiter
   uses `namespace_id = "1002"`, deliberately distinct from litbible's Worker so
   the two forms never share counters.
4. **Email Routing (inbound + send)** — the domain's MX records point at
   Cloudflare Email Routing (`route{1,2,3}.mx.cloudflare.net`, see the DNS
   inventory), so it both **receives** inbound mail for `@liberatingscripture.org`
   and forwards it to a verified destination, **and** powers the Worker's
   `send_email` binding (binding name `CONTACT_EMAIL`). Sender identity is
   `contact@liberatingscripture.org` (`FROM_EMAIL` in `wrangler.toml`). What
   matters for recovery: the **Destination address** must be added **and
   verified** in Email Routing (Cloudflare emails a confirmation link; the
   binding hard-fails on an unverified destination). Here the destination is a
   **Google Workspace inbox on the litbible.net domain** — this org has no
   mailbox of its own; Cloudflare forwards cross-org into that Workspace. The
   exact address is the `DEST_EMAIL` secret value, kept in the private Drive doc.
5. **Turnstile** — one widget for the contact form. The **site key** is public
   and committed (`0x4AAAAAACJ446flkL7Rwf8i` in `src/pages/contact.astro`); the
   **secret key** is the Worker's `TURNSTILE_SECRET`. If the widget is lost,
   create a new **Managed**-mode widget for hostname `liberatingscripture.org`,
   paste the new site key into `contact.astro`, and re-set the secret.

Also in this account: **Web Analytics** (cookie-free; re-enable from the
Cloudflare dashboard, no repo change) and the **security-header rules** — the
setup steps are in [`docs/security-headers.md`](docs/security-headers.md).

## DNS record inventory (liberatingscripture.org zone, 2026-07-18)

Captured from the Cloudflare dashboard (14 records). All values here are public
by nature (anyone can query them), so committing them is safe; the DKIM public
keys and verification tokens can also be re-issued from the matching provider if
this list ever drifts. Unless noted: TTL Auto.

**Site (GitHub Pages)** — all **Proxied** (orange cloud):

```
liberatingscripture.org       A      185.199.108.153
liberatingscripture.org       A      185.199.109.153
liberatingscripture.org       A      185.199.110.153
liberatingscripture.org       A      185.199.111.153
www.liberatingscripture.org   CNAME  liberatingscripture.github.io
```

The four A records are GitHub Pages' standard apex IPs; `www` CNAMEs to the
Pages host. Proxied, so Cloudflare fronts them (this is what lets the Worker
route and the security headers work at the edge).

**Mail: Cloudflare Email Routing** — **DNS only** (not proxied). Inbound mail
for `@liberatingscripture.org` is received by Cloudflare Email Routing and
forwarded to the verified destination; the same Email Routing also backs the
Worker's `send_email` binding. (This differs from litbible, whose MX points at
Google.)

```
liberatingscripture.org  MX  route1.mx.cloudflare.net   (priority 23)
liberatingscripture.org  MX  route2.mx.cloudflare.net   (priority 4)
liberatingscripture.org  MX  route3.mx.cloudflare.net   (priority 7)

liberatingscripture.org             TXT  "v=spf1 include:_spf.mx.cloudflare.net ~all"
cf2024-1._domainkey.liberatingscripture.org  TXT  "v=DKIM1; h=sha256; k=rsa; p=MIIBIjANB…"   (Cloudflare Email Routing DKIM)
_dmarc.liberatingscripture.org      TXT  "v=DMARC1; p=none; rua=mailto:rua@dm…"     [OWNER: full rua address truncated in dashboard]
```

The MX priorities and Email-Routing DKIM/SPF are all recreated automatically if
Email Routing is re-enabled, so exact values aren't load-bearing for recovery.

**Google Workspace verification / DKIM** — DNS only. The domain is verified with
Google and carries a Google DKIM key, even though inbound MX is Cloudflare's
(Google is used for the Drive/Workspace identity, not for this domain's inbound
mail path):

```
google._domainkey.liberatingscripture.org  TXT  "v=DKIM1; k=rsa; p=MIIBIjANBgkqhkiG9w…"
liberatingscripture.org                     TXT  "google-site-verification=W3uMCX8arqoN…"   (TTL 1 hr)
liberatingscripture.org                     TXT  "google-site-verification=zg2dBRJ-cZtzsJ…"
```

All three are re-issuable from Google Search Console / Workspace admin if lost.

## Secrets (names and locations only — never values)

**Worker secrets** — re-set from `workers/contact-form/` with
`npx wrangler secret put <NAME>` (interactive prompt; values never touch shell
history). Documented in `wrangler.toml`'s comments:

| Name | What it is |
|------|------------|
| `TURNSTILE_SECRET` | Secret key of the contact-form Turnstile widget |
| `DEST_EMAIL` | Verified Email Routing destination that receives contact mail |
| `DISPLAY_TO` | Optional branded alias shown in the mail's `To:` header while delivery still goes to `DEST_EMAIL`; falls back to `DEST_EMAIL` if the platform rejects the mismatch, or can be omitted entirely |

There are **no GitHub Actions secrets** — `deploy.yml` uses only the built-in
`GITHUB_TOKEN` (via `pages: write` / `id-token: write` permissions) and needs
nothing set by hand. The site build itself needs no secrets (Give Lively is an
embed; Turnstile's site key is public; there is no authenticated API).

## From-zero redeploy

**Site** (any machine with Node 22.12+ and npm):

```sh
git clone https://github.com/liberatingscripture/liberatingscripture.github.io
cd liberatingscripture.github.io
npm ci
npm run build        # output in dist/
```

In normal operation there is no manual deploy: **push to `main` and the
`deploy.yml` GitHub Actions workflow builds `dist/` and deploys it to GitHub
Pages.** Only if the Pages setup itself was lost: in the GitHub repo →
**Settings → Pages**, set **Source = GitHub Actions**, and (Settings → Pages →
Custom domain) re-enter `liberatingscripture.org` — the `public/CNAME` file
already carries it into every build, so Pages picks it up. The security headers
are **not** in the repo; they're Cloudflare dashboard config — re-apply from
[`docs/security-headers.md`](docs/security-headers.md).

**Worker** (must be live *before* the site handles form posts, or a POST to
`/contact/submit` hits a Pages 404):

```sh
cd workers/contact-form
npm install
npx wrangler login
# re-set the secrets listed above (wrangler offers to create the Worker on the
# first `secret put` — say yes)
npm run deploy       # attaches the routes from wrangler.toml
```

Full step-by-step (Email Routing destination verification, Turnstile widget
creation, smoke tests) is in `workers/contact-form/README.md`.

**Verify after redeploy:**

- Site loads over HTTPS; a couple of pages render (home, /support/, /contact/).
- Submit `/contact/` once; confirm the email arrives with a working `Reply-To`.
- /support/ renders the Give Lively donate widget.

## Off-platform integrations (degrade independently)

- **Give Lively** — the donate widget is a third-party embed
  (`secure.givelively.org`, slug `liberating-scripture-collective`); nothing to
  recover on our side beyond the account login (in the private Drive doc). A
  Give Lively outage only affects the donate widget, not the rest of the site.
- **Brevo (footer newsletter)** — the form posts to a **dedicated LSC list**,
  in the same Brevo account litbible.net uses (account login/recovery is
  litbible's; the list is our own asset, with no export/second-copy kept as of
  this writing — start one if the list grows to matter). A Brevo outage
  disables the subscribe form and leaves the rest of the site untouched (the
  scripts are lazy-loaded on interaction, so pages that nobody touches the
  form on don't even request them). The captcha uses **our own dedicated
  Turnstile widget** (see FIXLIST OW9 for the one remaining verification
  step), so its recovery follows the same path as the contact form's widget,
  not litbible's account. Note the form is also gated by the
  *enforced* CSP `form-action` — if subscribes start failing silently with no
  Brevo-side cause, check that rule before suspecting Brevo (see
  `docs/security-headers.md`).
- **Podcast platforms** — Apple / Spotify / YouTube are **linked, not
  embedded**, so an outage there never touches this site's build. The audio and
  feeds live in those accounts, which **BDR manages** (as with litbible's
  RedCircle/Resend) — podcast recovery is theirs to drive, not the site
  owner's.
- **Apple Pay domain association** —
  `public/.well-known/apple-developer-merchantid-domain-association` is committed
  and ships in every build; it verifies the domain for Apple Pay inside the Give
  Lively widget. Don't delete it. If Apple Pay ever needs re-verification, Give
  Lively (or Apple) reissues the file's contents.
