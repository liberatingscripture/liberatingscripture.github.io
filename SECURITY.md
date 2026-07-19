# Security Policy

## Reporting a vulnerability

If you've found a security issue with the liberatingscripture.org website or
its supporting infrastructure, please report it privately rather than opening
a public GitHub issue. The fastest way to reach us is the
[contact form](https://liberatingscripture.org/contact/) — just describe what
you found; you don't need to include exploit details up front, and we'll
follow up to get whatever's needed to confirm and fix it.

Please avoid publicly disclosing the issue until we've had a reasonable
chance to address it.

## What's in scope

This is a static site with no logins, no accounts, and no user data beyond
what people voluntarily submit through the contact form (delivered by email
via Cloudflare, not stored in a database). That said, we take reports
seriously, especially anything involving:

- The contact-form Worker (`workers/contact-form/`) and its spam and abuse
  protections
- Supply-chain concerns in build or runtime dependencies
- Any way to inject or tamper with content served from liberatingscripture.org

## What to expect

There's no bug bounty program for this project — it's a small nonprofit
effort — but we do read and respond to every report, and we'll credit
reporters who want credit once an issue is resolved.

Thank you for helping keep the site and its readers safe.
