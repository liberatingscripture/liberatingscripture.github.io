# Contact-form Worker

The backend for the [liberatingscripture.org/contact](https://liberatingscripture.org/contact/)
form. A standalone Cloudflare Worker that verifies the Turnstile token
server-side, rate-limits per IP, and delivers the message through Cloudflare
Email Routing — no third-party form processor. Adapted from litbible.net's
contact Worker (same code lineage; see that repo's `workers/contact-form/`).

The site itself deploys to **GitHub Pages**, but the domain's DNS is proxied
through Cloudflare, so the Worker route owns `/contact/submit` at the edge —
requests to that path never reach GitHub.

- **Route:** `liberatingscripture.org/contact/submit` (+ `www.`).
- **From:** `contact@liberatingscripture.org`, with `Reply-To:` set to the
  submitter.
- **To:** delivered to the `DEST_EMAIL` secret (kept out of the repo). If
  the optional `DISPLAY_TO` secret is set, that address is what appears in
  the email's `To:` header instead — useful when the destination inbox lives
  on another domain and shouldn't show in quoted/forwarded text. If the
  platform rejects the header/envelope mismatch the Worker retries with
  matching headers, so delivery never depends on the cosmetic header
  (`wrangler tail` will show a `DISPLAY_TO send rejected` warning if the
  fallback fired).

## One-time setup (owner)

Email Routing is already enabled on this zone (it powers the `@liberating
scripture.org` forwards), and the Turnstile widget already exists (the site
key in `src/pages/contact.astro`). What's left:

```sh
cd workers/contact-form
npm install
npx wrangler secret put TURNSTILE_SECRET   # the SECRET key of the existing widget (dashboard → Turnstile)
npx wrangler secret put DEST_EMAIL         # the verified destination inbox
npx wrangler secret put DISPLAY_TO         # optional: org-branded To: header address
npm run deploy
```

(`wrangler login` is shared across repos — if you've authenticated for the
litbible Worker on this machine, you're already logged in. On the first
`secret put`, wrangler offers to create the Worker — say yes.)

Then merge the site changes that point the form at `/contact/submit` and
smoke-test: one submit via `fetch` (inline success message), one via the
native-POST fallback (lands on `/contact/thanks/` — note this still requires
JS to render Turnstile, it's not a true no-JS path), and confirm the emails
arrive with a working Reply-To — and, if `DISPLAY_TO` is set, that the To:
header shows it.

## Abuse protection

- **Turnstile** server-side verification gates bots.
- A **rate-limiting binding** caps submissions at 5/minute per client IP →
  429 with a "wait a minute" message. Best-effort per Cloudflare location —
  a cost cap, not a security boundary.

## Development notes

- `npm run check` bundles without deploying (no auth needed).
- `npm run dev` runs locally with `send_email` simulated to a local file.
- Retire the old Formspree form (`xdkqvlkj`) in their dashboard once this
  ships.
