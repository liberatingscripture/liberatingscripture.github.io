/**
 * liberatingscripture.org contact-form backend.
 *
 * Routed at POST liberatingscripture.org/contact/submit (the site itself is
 * GitHub Pages, but the zone is Cloudflare-proxied, so this Worker owns that
 * path at the edge). Adapted from litbible.net's contact Worker; replaces
 * Formspree:
 *   1. verifies the Cloudflare Turnstile token server-side (siteverify);
 *   2. rate-limits submissions per IP (5/min -> 429, fail-open);
 *   3. sends via the Email Routing send_email binding, from FROM_EMAIL
 *      (contact@liberatingscripture.org) with Reply-To set to the submitter,
 *      delivered to the verified destination inbox (DEST_EMAIL secret).
 *
 * The optional DISPLAY_TO secret sets the address SHOWN in the To: header
 * (the org-branded alias) while the delivery envelope still targets
 * DEST_EMAIL — so a quoted/forwarded original never reveals the underlying
 * inbox. If the platform rejects the header/envelope mismatch, the send is
 * retried once with the headers matching.
 *
 * Two client paths:
 *   - fetch() submits send `Accept: application/json` and get a JSON verdict;
 *   - native POSTs (the form's fallback when JS is available but `fetch`
 *     fails or is blocked) get a 303 to /contact/thanks/ on success, or a
 *     small self-contained HTML error page. Turnstile still requires JS to
 *     render, so this path can't help a genuinely JS-less visitor pass the
 *     check.
 *
 * The `_gotcha` honeypot is honored server-side: a filled honeypot
 * "succeeds" without sending anything.
 */

import { EmailMessage } from "cloudflare:email";
// The browser build — the Node build drags in node:path/os, which Workers
// would need the nodejs_compat flag for.
import { createMimeMessage, Mailbox } from "mimetext/browser";

const LIMITS = { name: 200, email: 254, message: 10000 };

// Header-bound fields must never carry CR/LF (header injection) — collapse
// all whitespace runs. The message body keeps its newlines.
const headerSafe = (v, max) =>
  String(v ?? "").replace(/\s+/g, " ").trim().slice(0, max);

const looksLikeEmail = (s) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);

export default {
  async fetch(request, env) {
    if (request.method !== "POST") {
      return new Response("Method Not Allowed", {
        status: 405,
        headers: { Allow: "POST" },
      });
    }

    const wantsJson = (request.headers.get("Accept") || "").includes(
      "application/json",
    );
    const respond = (status, error) =>
      wantsJson
        ? Response.json(error ? { ok: false, error } : { ok: true }, { status })
        : error
          ? errorPage(status, error)
          : seeOther(new URL("/contact/thanks/", request.url));

    // Per-IP rate limit before doing any real work. Fail open on a binding
    // hiccup — a broken limiter shouldn't take the contact form down.
    try {
      const ip = request.headers.get("CF-Connecting-IP") || "unknown";
      const { success } = await env.RATE_LIMITER.limit({ key: ip });
      if (!success) return respond(429, "rate-limited");
    } catch (err) {
      console.warn("rate limiter unavailable:", err);
    }

    let form;
    try {
      form = await request.formData();
    } catch {
      return respond(400, "bad-request");
    }

    // Honeypot filled → a bot. Pretend success, send nothing.
    if (String(form.get("_gotcha") || "").trim() !== "") {
      return respond(200);
    }

    const name = headerSafe(form.get("name"), LIMITS.name);
    const email = headerSafe(form.get("email"), LIMITS.email);
    const message = String(form.get("message") || "")
      .trim()
      .slice(0, LIMITS.message);
    if (!name || !message || !looksLikeEmail(email)) {
      return respond(400, "missing-fields");
    }

    const token = String(form.get("cf-turnstile-response") || "");
    if (!(await verifyTurnstile(env, token, request))) {
      return respond(403, "turnstile");
    }

    const fields = { name, email, message };
    try {
      const displayTo = env.DISPLAY_TO || env.DEST_EMAIL;
      try {
        await env.CONTACT_EMAIL.send(buildEmail(env, request, fields, displayTo));
      } catch (err) {
        if (displayTo === env.DEST_EMAIL) throw err;
        // The branded To: header was rejected — deliver anyway with the
        // headers matching the envelope, and say so in the log.
        console.warn("DISPLAY_TO send rejected, retrying with DEST_EMAIL:", err);
        await env.CONTACT_EMAIL.send(
          buildEmail(env, request, fields, env.DEST_EMAIL),
        );
      }
    } catch (err) {
      console.error("send failed:", err);
      return respond(500, "send-failed");
    }

    return respond(200);
  },
};

function buildEmail(env, request, { name, email, message }, toHeader) {
  const msg = createMimeMessage();
  msg.setSender({ name: "LSC contact form", addr: env.FROM_EMAIL });
  msg.setRecipient(toHeader);
  // mimetext validates known headers: Reply-To must be a Mailbox, not a
  // bare string (a string throws MIMETEXT_INVALID_HEADER_VALUE).
  msg.setHeader("Reply-To", new Mailbox(email));
  msg.setSubject(`liberatingscripture.org contact — ${name}`);
  msg.addMessage({
    contentType: "text/plain",
    data: [
      "New message from the liberatingscripture.org contact form.",
      "",
      `Name:  ${name}`,
      `Email: ${email}`,
      "",
      "Message:",
      message,
      "",
      `— ${sentLine(request)}; reply to this email to answer.`,
    ].join("\n"),
  });
  return new EmailMessage(env.FROM_EMAIL, env.DEST_EMAIL, msg.asRaw());
}

// The email footer shows the SENDER's local time (from Cloudflare's
// IP-geolocation zone on the request) — the mail client already localizes
// the Date: header to the reader's zone, so sender-local is the one piece
// of timing context the header can't provide.
function sentLine(request) {
  const zone = request.cf?.timezone;
  if (zone) {
    try {
      const when = new Intl.DateTimeFormat("en-US", {
        timeZone: zone,
        dateStyle: "medium",
        timeStyle: "long",
      }).format(new Date());
      return `Sent ${when} (sender's local time)`;
    } catch {
      // fall through to UTC
    }
  }
  return `Sent ${new Date().toISOString()}`;
}

async function verifyTurnstile(env, token, request) {
  if (!token) return false;
  try {
    const res = await fetch(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      {
        method: "POST",
        body: new URLSearchParams({
          secret: env.TURNSTILE_SECRET,
          response: token,
          remoteip: request.headers.get("CF-Connecting-IP") || "",
        }),
      },
    );
    const verdict = await res.json();
    if (verdict.success !== true) {
      // Only Turnstile's error codes — no submitter data. Visible in
      // `wrangler tail`; distinguishes a misconfigured secret
      // (invalid-input-secret) from a bad/expired token.
      console.warn(
        "turnstile rejected:",
        JSON.stringify(verdict["error-codes"] ?? []),
      );
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

const seeOther = (url) =>
  new Response(null, { status: 303, headers: { Location: url.href } });

// Minimal branded error page for the native-POST fallback path. Matches the
// site's cream/ink palette; self-contained because the Worker can't reach
// into the static site.
function errorPage(status, error) {
  const detail =
    error === "turnstile"
      ? "The security check could not be verified. Please go back, complete it again if it is shown, and resend. (The check requires JavaScript.)"
      : error === "missing-fields"
        ? "Please go back and fill in your name, a valid email address, and a message."
        : error === "rate-limited"
          ? "Several messages arrived from your connection in a short time. Please wait a minute, then go back and try again."
          : "Something went wrong sending your message. Please go back and try again in a moment.";
  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>Message not sent | Liberating Scripture Collective</title>
<style>
  body{margin:0;background:#E1DFD9;color:#1D231C;font:1.05rem/1.5 Georgia,'Times New Roman',serif;
       min-height:100svh;display:grid;place-items:center;padding:24px}
  main{max-width:34rem;text-align:center}
  h1{font-size:2rem;margin:0 0 .6em}
  a{color:#166b39}
</style>
</head>
<body>
<main>
<h1>Your message didn&rsquo;t send</h1>
<p>${detail}</p>
<p><a href="/contact/">Back to the contact form</a></p>
</main>
</body>
</html>`;
  return new Response(html, {
    status,
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}
