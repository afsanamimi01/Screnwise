/**
 * Outbound email for Screenwise.
 *
 * One `sendMail()` on top of three interchangeable drivers, so switching
 * provider is an environment change, never a code change:
 *
 *   resend   HTTPS API (api.resend.com). The recommended default - one API
 *            key, nothing to install, and no SMTP ports to get blocked by a
 *            host or an ISP.
 *   smtp     Any SMTP server through nodemailer - Gmail / Google Workspace,
 *            Mailtrap, Amazon SES, Office 365, a company relay.
 *   console  Nothing configured. Messages are logged to the server console and
 *            never delivered - the old sandbox behaviour, kept as the fallback
 *            so a fresh clone still runs.
 *
 * `MAIL_DRIVER` forces one; otherwise the first driver that has credentials
 * wins. See backend/.env.example for the full variable list.
 */
import nodemailer from "nodemailer";

const RESEND_ENDPOINT = "https://api.resend.com/emails";
const REQUEST_TIMEOUT_MS = 15000;

/** Resend's free tier allows 2 requests/second; stay just under it. */
const DEFAULT_THROTTLE_MS = { resend: 550, smtp: 0, console: 0 };

let transporter = null;
let lastSendAt = 0;

/** A variable present but blank (`MAIL_FROM=`) counts as unset, not as "". */
function env(name, fallback = "") {
  const value = process.env[name];
  if (value === undefined || value === null) return fallback;
  const trimmed = String(value).trim();
  return trimmed === "" ? fallback : trimmed;
}

/** Which driver this process will use, from `MAIL_DRIVER` or what's configured. */
export function activeDriver() {
  const explicit = env("MAIL_DRIVER").toLowerCase();
  if (explicit) return explicit;
  if (env("RESEND_API_KEY")) return "resend";
  if (env("SMTP_HOST")) return "smtp";
  return "console";
}

/** The From: header. Must be an address on a domain the provider verified. */
export function fromAddress() {
  return env("MAIL_FROM", "Screenwise <onboarding@resend.dev>");
}

function throttleMs(driver) {
  const override = env("MAIL_THROTTLE_MS");
  if (override) return Number(override) || 0;
  return DEFAULT_THROTTLE_MS[driver] ?? 0;
}

/** Space out provider calls so a bulk send doesn't trip a rate limit. */
async function pace(driver) {
  const gap = throttleMs(driver);
  if (!gap) return;
  const wait = lastSendAt + gap - Date.now();
  if (wait > 0) await new Promise((resolve) => setTimeout(resolve, wait));
  lastSendAt = Date.now();
}

/* --------------------------------- resend -------------------------------- */

async function postToResend(message) {
  const res = await fetch(RESEND_ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env("RESEND_API_KEY")}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: message.from,
      to: [message.to],
      subject: message.subject,
      text: message.text,
      html: message.html,
      ...(message.replyTo ? { reply_to: message.replyTo } : {}),
    }),
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });

  const payload = await res.json().catch(() => null);
  if (!res.ok) {
    const detail = payload?.message ?? payload?.error ?? `HTTP ${res.status}`;
    const error = new Error(`Resend rejected the message: ${detail}`);
    error.retryable = res.status === 429 || res.status >= 500;
    throw error;
  }
  return payload?.id ?? null;
}

async function sendViaResend(message) {
  if (!env("RESEND_API_KEY")) throw new Error("RESEND_API_KEY is not set");
  try {
    return await postToResend(message);
  } catch (err) {
    if (!err.retryable) throw err;
    // One backoff retry covers the usual rate-limit / transient-5xx blip.
    await new Promise((resolve) => setTimeout(resolve, 1200));
    return postToResend(message);
  }
}

/* ---------------------------------- smtp --------------------------------- */

function getTransporter() {
  if (transporter) return transporter;
  const port = Number(env("SMTP_PORT", "587"));
  transporter = nodemailer.createTransport({
    host: env("SMTP_HOST"),
    port,
    // 465 is implicit TLS; 587 and 25 start plain and upgrade with STARTTLS.
    secure: env("SMTP_SECURE") ? env("SMTP_SECURE") === "true" : port === 465,
    auth: env("SMTP_USER") ? { user: env("SMTP_USER"), pass: env("SMTP_PASS") } : undefined,
  });
  return transporter;
}

async function sendViaSmtp(message) {
  if (!env("SMTP_HOST")) throw new Error("SMTP_HOST is not set");
  const info = await getTransporter().sendMail({
    from: message.from,
    to: message.to,
    subject: message.subject,
    text: message.text,
    html: message.html,
    ...(message.replyTo ? { replyTo: message.replyTo } : {}),
  });
  return info?.messageId ?? null;
}

/* -------------------------------- console -------------------------------- */

async function sendViaConsole(message) {
  console.info(
    `[mail:console] no provider configured - not delivered\n` +
      `  to:      ${message.to}\n` +
      `  from:    ${message.from}\n` +
      `  subject: ${message.subject}`,
  );
  return `console-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
}

const DRIVERS = { resend: sendViaResend, smtp: sendViaSmtp, console: sendViaConsole };

/** True while `From:` is Resend's shared sender - test-only, no domain needed. */
function usesSharedSender() {
  return /@resend\.dev\b/i.test(fromAddress());
}

/**
 * Cheapest authenticated call Resend offers, used purely to tell a working key
 * from a rejected one. Cached, because the composer asks on every page load.
 */
let resendProbe = { at: 0, status: null };

async function probeResend() {
  if (resendProbe.status && Date.now() - resendProbe.at < 60_000) return resendProbe;
  try {
    const res = await fetch("https://api.resend.com/domains", {
      headers: { Authorization: `Bearer ${env("RESEND_API_KEY")}` },
      signal: AbortSignal.timeout(8000),
    });
    const status = res.status === 401 || res.status === 403 ? "rejected" : "ok";
    resendProbe = { at: Date.now(), status };
  } catch {
    // Network trouble is not the same as a bad key - don't call it dead.
    resendProbe = { at: Date.now(), status: "unreachable" };
  }
  return resendProbe;
}

/* ----------------------------------- api ---------------------------------- */

/**
 * Delivers one message. Never throws - callers get a result they can persist
 * per recipient, so one bad address can't abort a whole batch.
 *
 * @returns {Promise<{ok: boolean, driver: string, messageId: string|null, error: string|null}>}
 */
export async function sendMail({ to, subject, text, html, replyTo }) {
  const driver = activeDriver();
  const send = DRIVERS[driver];
  if (!send) {
    return { ok: false, driver, messageId: null, error: `Unknown MAIL_DRIVER "${driver}"` };
  }

  const message = { to, from: fromAddress(), subject, text, html, replyTo };
  try {
    await pace(driver);
    const messageId = await send(message);
    return { ok: true, driver, messageId, error: null };
  } catch (err) {
    console.error(`[mail:${driver}] send to ${to} failed:`, err);
    return { ok: false, driver, messageId: null, error: err?.message ?? "Send failed" };
  }
}

/**
 * What the HR console shows in its delivery banner. Reports configuration only
 * - never the API key or the SMTP password.
 */
export async function mailerStatus() {
  const driver = activeDriver();
  const from = fromAddress();

  if (driver === "console") {
    return {
      driver,
      live: false,
      configured: false,
      restricted: false,
      from,
      message:
        "No email provider is configured, so messages are logged on the server and never delivered. Set RESEND_API_KEY (or SMTP_HOST) in backend/.env to send for real.",
    };
  }

  if (driver === "resend") {
    if (!env("RESEND_API_KEY")) {
      return {
        driver,
        live: false,
        configured: false,
        restricted: false,
        from,
        message: "MAIL_DRIVER is set to resend but RESEND_API_KEY is missing - sends will fail.",
      };
    }

    const probe = await probeResend();
    if (probe.status === "rejected") {
      return {
        driver,
        live: false,
        configured: true,
        restricted: false,
        from,
        message: "Resend rejected the API key. Check RESEND_API_KEY in backend/.env.",
      };
    }
    if (probe.status === "unreachable") {
      return {
        driver,
        live: true,
        configured: true,
        restricted: false,
        from,
        message: `Configured for Resend, from ${from}. The API couldn't be reached just now to confirm it.`,
      };
    }

    // Resend's shared onboarding sender needs no verified domain, but it only
    // ever delivers to the address that owns the Resend account. Saying "live"
    // without that caveat would mislead exactly like the old sandbox banner.
    if (usesSharedSender()) {
      return {
        driver,
        live: true,
        configured: true,
        restricted: true,
        from,
        message:
          "Sending through Resend's shared test address, so mail is delivered ONLY to the address that owns your Resend account - everyone else is rejected. Verify a domain and set MAIL_FROM in backend/.env to reach real candidates.",
      };
    }

    return {
      driver,
      live: true,
      configured: true,
      restricted: false,
      from,
      message: `Live sending is on via Resend, from ${from}.`,
    };
  }

  if (driver === "smtp") {
    const host = env("SMTP_HOST");
    if (!host) {
      return {
        driver,
        live: false,
        configured: false,
        restricted: false,
        from,
        message: "MAIL_DRIVER is set to smtp but SMTP_HOST is missing - sends will fail.",
      };
    }
    // A handshake is the only honest answer for SMTP, and it's cheap enough to
    // be worth it for the banner. A failure here is reported, not thrown.
    try {
      await getTransporter().verify();
      return {
        driver,
        live: true,
        configured: true,
        restricted: false,
        from,
        message: `Live sending is on via ${host}, from ${from}.`,
      };
    } catch (err) {
      return {
        driver,
        live: false,
        configured: true,
        restricted: false,
        from,
        message: `SMTP server ${host} did not accept the connection: ${err?.message ?? "unknown error"}`,
      };
    }
  }

  return {
    driver,
    live: false,
    configured: false,
    restricted: false,
    from,
    message: `Unknown MAIL_DRIVER "${driver}".`,
  };
}
