// Tests for the liberatingscripture.org contact-form backend (FIXLIST O5).
//
// These run inside workerd via @cloudflare/vitest-pool-workers, so
// `cloudflare:email` and EmailMessage are the real thing. The worker's entry is
// `fetch(request, env)` with env as a plain parameter, so each test calls it
// directly with a hand-built env — no real send_email or ratelimit binding is
// provisioned, and CONTACT_EMAIL.send / RATE_LIMITER.limit are plain spies.
//
// Turnstile's siteverify is the only outbound fetch; it is stubbed per test.
//
// Ported from litbible.net's sibling Worker suite, adapted to this Worker's
// single form: no /app-support route, no platform field, no route selection —
// every request uses DEST_EMAIL / TURNSTILE_SECRET and lands on /contact/thanks/.
import { describe, it, expect, vi, afterEach } from "vitest";
import worker from "../src/index.js";

const BASE = "https://liberatingscripture.org";
const IP = "203.0.113.7";

/** A submission that passes every check, so each test can vary one field. */
const VALID = {
  name: "Ada Lovelace",
  email: "ada@example.com",
  message: "Hello there",
  "cf-turnstile-response": "tok",
};

function makeEnv(overrides = {}) {
  return {
    FROM_EMAIL: "contact@liberatingscripture.org",
    DEST_EMAIL: "contact-inbox@example.com",
    TURNSTILE_SECRET: "contact-secret",
    CONTACT_EMAIL: { send: vi.fn() },
    RATE_LIMITER: { limit: vi.fn(async () => ({ success: true })) },
    ...overrides,
  };
}

/** Stub the siteverify call. Returns the spy so tests can assert on it. */
function stubSiteverify(verdict = { success: true }) {
  const fn = vi.fn(async () => Response.json(verdict));
  vi.stubGlobal("fetch", fn);
  return fn;
}

function post(path, fields = {}, { env, json = false, method = "POST" } = {}) {
  const body = new FormData();
  for (const [k, v] of Object.entries(fields)) body.set(k, v);
  const headers = { "CF-Connecting-IP": IP };
  if (json) headers.Accept = "application/json";
  const init = method === "GET" ? { method, headers } : { method, body, headers };
  return worker.fetch(new Request(BASE + path, init), env);
}

/**
 * workerd stores an outbound EmailMessage's MIME under the namespaced own
 * property "EmailMessage::raw" — `.raw` is undefined on outbound messages.
 * Guarded so a workerd rename fails loudly here instead of turning every body
 * assertion vacuous.
 */
function rawOf(msg) {
  const raw = msg["EmailMessage::raw"] ?? msg.raw;
  if (typeof raw !== "string") {
    throw new Error(
      "Could not read raw MIME off EmailMessage — workerd may have renamed the property.",
    );
  }
  return raw;
}

/** Decode RFC 2047 encoded-words. The subject always contains an em dash, so
 *  mimetext base64-encodes it; comparing against the raw header would never match. */
function decodeMimeWords(s) {
  return s.replace(/=\?utf-8\?B\?([^?]*)\?=/gi, (_m, b64) =>
    new TextDecoder().decode(Uint8Array.from(atob(b64), (c) => c.charCodeAt(0))),
  );
}

function headerOf(raw, name) {
  const m = raw.match(new RegExp(`^${name}:\\s*(.*)$`, "mi"));
  return m ? decodeMimeWords(m[1].trim()) : null;
}

/** Everything after the first blank line. */
function bodyOf(raw) {
  const m = raw.match(/\r?\n\r?\n([\s\S]*)$/);
  return m ? m[1] : "";
}

const sentMessage = (env) => env.CONTACT_EMAIL.send.mock.calls[0][0];

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("method guard", () => {
  it("405s a non-POST and advertises Allow: POST", async () => {
    const res = await post("/contact/submit", {}, { env: makeEnv(), method: "GET" });
    expect(res.status).toBe(405);
    expect(res.headers.get("Allow")).toBe("POST");
  });
});

describe("honeypot", () => {
  it("pretends success and sends nothing when _gotcha is filled", async () => {
    const env = makeEnv();
    const siteverify = stubSiteverify();

    const res = await post(
      "/contact/submit",
      { ...VALID, _gotcha: "i am a bot" },
      { env, json: true },
    );

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
    expect(env.CONTACT_EMAIL.send).not.toHaveBeenCalled();
    // Bails before Turnstile too — a bot shouldn't cost a siteverify call.
    expect(siteverify).not.toHaveBeenCalled();
  });

  it("sends normally when _gotcha is present but empty", async () => {
    const env = makeEnv();
    stubSiteverify();

    const res = await post("/contact/submit", { ...VALID, _gotcha: "" }, { env, json: true });

    expect(res.status).toBe(200);
    expect(env.CONTACT_EMAIL.send).toHaveBeenCalledTimes(1);
  });
});

describe("field validation", () => {
  it.each([
    ["empty name", { name: "" }],
    ["whitespace-only name", { name: "   " }],
    ["empty message", { message: "" }],
    ["malformed email (no @)", { email: "not-an-email" }],
    ["malformed email (no dot in domain)", { email: "ada@example" }],
    ["malformed email (spaces)", { email: "ada lovelace@example.com" }],
  ])("400s on %s", async (_label, override) => {
    const env = makeEnv();
    stubSiteverify();

    const res = await post("/contact/submit", { ...VALID, ...override }, { env, json: true });

    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ ok: false, error: "missing-fields" });
    expect(env.CONTACT_EMAIL.send).not.toHaveBeenCalled();
  });
});

describe("header injection", () => {
  it("collapses CR/LF in the name so it cannot split headers", async () => {
    const env = makeEnv();
    stubSiteverify();

    const res = await post(
      "/contact/submit",
      { ...VALID, name: "Ada\r\nBcc: evil@example.com" },
      { env, json: true },
    );

    expect(res.status).toBe(200);
    const raw = rawOf(sentMessage(env));
    // The CRLF became a single space inside the (encoded) subject...
    expect(headerOf(raw, "Subject")).toBe(
      "liberatingscripture.org contact — Ada Bcc: evil@example.com",
    );
    // ...and no Bcc header line was smuggled into the message.
    expect(/^Bcc:/im.test(raw)).toBe(false);
  });

  it("rejects an email carrying CR/LF (collapse makes it fail validation)", async () => {
    const env = makeEnv();
    stubSiteverify();

    const res = await post(
      "/contact/submit",
      { ...VALID, email: "ada@example.com\r\nBcc: evil@example.com" },
      { env, json: true },
    );

    expect(res.status).toBe(400);
    expect(env.CONTACT_EMAIL.send).not.toHaveBeenCalled();
  });

  it("truncates name at the 200-char limit", async () => {
    const env = makeEnv();
    stubSiteverify();

    await post("/contact/submit", { ...VALID, name: "A".repeat(250) }, { env, json: true });

    const subject = headerOf(rawOf(sentMessage(env)), "Subject");
    expect(subject).toBe(`liberatingscripture.org contact — ${"A".repeat(200)}`);
  });

  it("truncates message at the 10000-char limit", async () => {
    const env = makeEnv();
    stubSiteverify();

    await post("/contact/submit", { ...VALID, message: "B".repeat(10_100) }, { env, json: true });

    const body = bodyOf(rawOf(sentMessage(env)));
    expect(body).toContain("B".repeat(10_000));
    expect(body).not.toContain("B".repeat(10_001));
  });

  it("keeps newlines in the message body", async () => {
    const env = makeEnv();
    stubSiteverify();

    await post("/contact/submit", { ...VALID, message: "Line one\nLine two" }, { env, json: true });

    expect(bodyOf(rawOf(sentMessage(env)))).toContain("Line one\nLine two");
  });
});

describe("Turnstile", () => {
  it("403s when siteverify rejects the token", async () => {
    const env = makeEnv();
    stubSiteverify({ success: false, "error-codes": ["invalid-input-response"] });

    const res = await post("/contact/submit", VALID, { env, json: true });

    expect(res.status).toBe(403);
    expect(await res.json()).toEqual({ ok: false, error: "turnstile" });
    expect(env.CONTACT_EMAIL.send).not.toHaveBeenCalled();
  });

  it("403s without calling siteverify when the token is missing", async () => {
    const env = makeEnv();
    const siteverify = stubSiteverify();

    const res = await post(
      "/contact/submit",
      { ...VALID, "cf-turnstile-response": "" },
      { env, json: true },
    );

    expect(res.status).toBe(403);
    expect(siteverify).not.toHaveBeenCalled();
  });

  it("403s (fails closed) when siteverify itself throws", async () => {
    const env = makeEnv();
    vi.stubGlobal("fetch", vi.fn(async () => { throw new Error("network down"); }));

    const res = await post("/contact/submit", VALID, { env, json: true });

    expect(res.status).toBe(403);
    expect(env.CONTACT_EMAIL.send).not.toHaveBeenCalled();
  });

  it("sends the route's secret and the submitter IP to siteverify", async () => {
    const env = makeEnv();
    const siteverify = stubSiteverify();

    await post("/contact/submit", VALID, { env, json: true });

    const [url, init] = siteverify.mock.calls[0];
    expect(url).toBe("https://challenges.cloudflare.com/turnstile/v0/siteverify");
    const sent = new URLSearchParams(init.body);
    expect(sent.get("secret")).toBe("contact-secret");
    expect(sent.get("response")).toBe("tok");
    expect(sent.get("remoteip")).toBe(IP);
  });
});

describe("rate limiting", () => {
  it("429s over the limit, keyed by CF-Connecting-IP", async () => {
    const env = makeEnv({ RATE_LIMITER: { limit: vi.fn(async () => ({ success: false })) } });
    stubSiteverify();

    const res = await post("/contact/submit", VALID, { env, json: true });

    expect(res.status).toBe(429);
    expect(await res.json()).toEqual({ ok: false, error: "rate-limited" });
    expect(env.RATE_LIMITER.limit).toHaveBeenCalledWith({ key: IP });
    expect(env.CONTACT_EMAIL.send).not.toHaveBeenCalled();
  });

  it("fails open when the limiter binding throws", async () => {
    const env = makeEnv({
      RATE_LIMITER: { limit: vi.fn(async () => { throw new Error("binding down"); }) },
    });
    stubSiteverify();

    const res = await post("/contact/submit", VALID, { env, json: true });

    expect(res.status).toBe(200);
    expect(env.CONTACT_EMAIL.send).toHaveBeenCalledTimes(1);
  });
});

describe("JSON vs no-JS response paths", () => {
  it("returns a JSON verdict when Accept: application/json", async () => {
    const env = makeEnv();
    stubSiteverify();

    const res = await post("/contact/submit", VALID, { env, json: true });

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
  });

  it("303s to the thanks page without Accept: application/json", async () => {
    const env = makeEnv();
    stubSiteverify();

    const res = await post("/contact/submit", VALID, { env });

    expect(res.status).toBe(303);
    expect(res.headers.get("Location")).toBe(`${BASE}/contact/thanks/`);
  });

  it("renders a branded noindex error page for a no-JS failure", async () => {
    const env = makeEnv();
    stubSiteverify({ success: false });

    const res = await post("/contact/submit", VALID, { env });

    expect(res.status).toBe(403);
    expect(res.headers.get("Content-Type")).toBe("text/html; charset=utf-8");
    const html = await res.text();
    expect(html).toContain('<meta name="robots" content="noindex">');
    expect(html).toContain("The security check could not be verified.");
    expect(html).toContain('href="/contact/"');
  });
});

describe("DISPLAY_TO alias and retry", () => {
  it("shows the alias in To: while the envelope targets the real inbox", async () => {
    const env = makeEnv({ DISPLAY_TO: "hello@liberatingscripture.org" });
    stubSiteverify();

    await post("/contact/submit", VALID, { env, json: true });

    const msg = sentMessage(env);
    expect(msg.to).toBe("contact-inbox@example.com"); // envelope
    expect(headerOf(rawOf(msg), "To")).toBe("<hello@liberatingscripture.org>"); // header
  });

  it("retries once with the header matching the envelope when the alias is rejected", async () => {
    const send = vi
      .fn()
      .mockRejectedValueOnce(new Error("header/envelope mismatch"))
      .mockResolvedValueOnce(undefined);
    const env = makeEnv({ DISPLAY_TO: "hello@liberatingscripture.org", CONTACT_EMAIL: { send } });
    stubSiteverify();

    const res = await post("/contact/submit", VALID, { env, json: true });

    expect(res.status).toBe(200);
    expect(send).toHaveBeenCalledTimes(2);
    expect(headerOf(rawOf(send.mock.calls[0][0]), "To")).toBe("<hello@liberatingscripture.org>");
    expect(headerOf(rawOf(send.mock.calls[1][0]), "To")).toBe("<contact-inbox@example.com>");
    // The envelope was the real inbox on both attempts.
    expect(send.mock.calls.map((c) => c[0].to)).toEqual([
      "contact-inbox@example.com",
      "contact-inbox@example.com",
    ]);
  });

  it("does not retry when no alias is configured", async () => {
    const send = vi.fn().mockRejectedValue(new Error("smtp exploded"));
    const env = makeEnv({ CONTACT_EMAIL: { send } });
    stubSiteverify();

    const res = await post("/contact/submit", VALID, { env, json: true });

    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ ok: false, error: "send-failed" });
    expect(send).toHaveBeenCalledTimes(1);
  });

  it("500s when the retry also fails", async () => {
    const send = vi.fn().mockRejectedValue(new Error("smtp exploded"));
    const env = makeEnv({ DISPLAY_TO: "hello@liberatingscripture.org", CONTACT_EMAIL: { send } });
    stubSiteverify();

    const res = await post("/contact/submit", VALID, { env, json: true });

    expect(res.status).toBe(500);
    expect(send).toHaveBeenCalledTimes(2);
  });
});

describe("message shape", () => {
  it("sets From, Reply-To and the field block", async () => {
    const env = makeEnv();
    stubSiteverify();

    await post("/contact/submit", VALID, { env, json: true });

    const msg = sentMessage(env);
    const raw = rawOf(msg);
    expect(msg.from).toBe("contact@liberatingscripture.org");
    expect(headerOf(raw, "Reply-To")).toBe("<ada@example.com>");
    expect(headerOf(raw, "From")).toBe("LSC contact form <contact@liberatingscripture.org>");

    const body = bodyOf(raw);
    expect(body).toContain("New message from the liberatingscripture.org contact form.");
    expect(body).toContain("Name:  Ada Lovelace");
    expect(body).toContain("Email: ada@example.com");
    expect(body).toContain("reply to this email to answer.");
  });
});
