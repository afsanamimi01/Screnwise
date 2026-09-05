/**
 * SSLCommerz checkout for plan purchases.
 *
 * Two drivers, chosen by what is configured - the same shape as
 * `shared/mail/mailer.js`, so switching is an environment change:
 *
 *   sslcommerz  Real checkout. Set SSLCOMMERZ_STORE_ID and
 *               SSLCOMMERZ_STORE_PASSWORD; sandbox unless
 *               SSLCOMMERZ_LIVE=true.
 *   manual      Nothing configured. The plan activates immediately and the
 *               payment is recorded as `manual` - the demo still works, and
 *               the billing page says in as many words that no money moved.
 *
 * Money is never taken from the client: the amount comes from the Plan record
 * on the server, and a plan is only activated after SSLCommerz's own
 * validation API confirms the transaction.
 */

const SANDBOX = {
  init: "https://sandbox.sslcommerz.com/gwprocess/v4/api.php",
  validate: "https://sandbox.sslcommerz.com/validator/api/validationserverAPI.php",
};
const LIVE = {
  init: "https://securepay.sslcommerz.com/gwprocess/v4/api.php",
  validate: "https://securepay.sslcommerz.com/validator/api/validationserverAPI.php",
};

const REQUEST_TIMEOUT_MS = 20000;

/** A variable present but blank counts as unset, not as "". */
function env(name, fallback = "") {
  const value = process.env[name];
  if (value === undefined || value === null) return fallback;
  const trimmed = String(value).trim();
  return trimmed === "" ? fallback : trimmed;
}

export function isLive() {
  return env("SSLCOMMERZ_LIVE").toLowerCase() === "true";
}

function endpoints() {
  return isLive() ? LIVE : SANDBOX;
}

/** Which driver this process will use. */
export function activeDriver() {
  return env("SSLCOMMERZ_STORE_ID") && env("SSLCOMMERZ_STORE_PASSWORD") ? "sslcommerz" : "manual";
}

/** Where the gateway sends the customer's browser back to. */
export function apiBaseUrl() {
  return env("PUBLIC_API_URL", `http://localhost:${env("PORT", "5000")}/api`);
}

export function clientBaseUrl() {
  return env("CLIENT_URL", "http://localhost:8080");
}

/**
 * What the billing page shows about payments. Reports configuration only -
 * never the store password.
 */
export function gatewayStatus() {
  const driver = activeDriver();
  if (driver === "manual") {
    return {
      driver,
      live: false,
      configured: false,
      sandbox: false,
      currency: "BDT",
      message:
        "No payment gateway is configured, so choosing a plan activates it immediately without taking payment. Set SSLCOMMERZ_STORE_ID and SSLCOMMERZ_STORE_PASSWORD in backend/.env to charge for real.",
    };
  }

  const sandbox = !isLive();
  return {
    driver,
    live: !sandbox,
    configured: true,
    sandbox,
    currency: "BDT",
    message: sandbox
      ? "SSLCommerz sandbox is on. Checkout runs end to end with test cards and no money moves."
      : "Live SSLCommerz checkout is on. Real payments will be taken.",
  };
}

/** SSLCommerz speaks form-encoded bodies, not JSON. */
function form(fields) {
  const body = new URLSearchParams();
  for (const [key, value] of Object.entries(fields)) {
    if (value !== undefined && value !== null) body.append(key, String(value));
  }
  return body;
}

/**
 * Open a checkout session.
 *
 * @returns {Promise<{ok: boolean, redirectUrl: string|null, sessionKey: string|null, error: string|null}>}
 */
export async function initiatePayment({ tranId, amount, currency = "BDT", plan, company, customer }) {
  const api = apiBaseUrl();

  const fields = {
    store_id: env("SSLCOMMERZ_STORE_ID"),
    store_passwd: env("SSLCOMMERZ_STORE_PASSWORD"),
    total_amount: amount,
    currency,
    tran_id: tranId,

    // The gateway drives the customer's browser to these. They carry no
    // secrets: every one of them re-checks the transaction server-side.
    success_url: `${api}/payments/success`,
    fail_url: `${api}/payments/fail`,
    cancel_url: `${api}/payments/cancel`,
    ipn_url: `${api}/payments/ipn`,

    shipping_method: "NO",
    product_name: `Screenwise ${plan} plan`,
    product_category: "SaaS subscription",
    product_profile: "non-physical-goods",

    cus_name: customer?.name || "Screenwise customer",
    cus_email: customer?.email || "billing@screenwise.io",
    cus_add1: company?.name || "N/A",
    cus_city: "Dhaka",
    cus_country: "Bangladesh",
    cus_phone: customer?.phone || "01700000000",
  };

  try {
    const res = await fetch(endpoints().init, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: form(fields),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });

    const payload = await res.json().catch(() => null);
    if (!res.ok || payload?.status !== "SUCCESS" || !payload?.GatewayPageURL) {
      const detail =
        payload?.failedreason || payload?.status || `HTTP ${res.status}`;
      return { ok: false, redirectUrl: null, sessionKey: null, error: `SSLCommerz refused the session: ${detail}` };
    }

    return {
      ok: true,
      redirectUrl: payload.GatewayPageURL,
      sessionKey: payload.sessionkey ?? null,
      error: null,
    };
  } catch (err) {
    console.error("[payment:sslcommerz] init failed:", err);
    return {
      ok: false,
      redirectUrl: null,
      sessionKey: null,
      error: err?.message ?? "Could not reach the payment gateway",
    };
  }
}

/**
 * Confirm a transaction with the gateway itself.
 *
 * The browser is redirected to our success URL by SSLCommerz, but anyone can
 * open that URL - so nothing is trusted until this call, made from our server
 * to theirs with our store credentials, says the transaction is valid and
 * reports the amount actually paid.
 *
 * @returns {Promise<{ok: boolean, status: string, amount: number|null, currency: string|null, tranId: string|null, bankTranId: string|null, cardType: string, error: string|null}>}
 */
export async function validatePayment(valId) {
  const url = new URL(endpoints().validate);
  url.searchParams.set("val_id", valId);
  url.searchParams.set("store_id", env("SSLCOMMERZ_STORE_ID"));
  url.searchParams.set("store_passwd", env("SSLCOMMERZ_STORE_PASSWORD"));
  url.searchParams.set("format", "json");

  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) });
    const payload = await res.json().catch(() => null);

    if (!res.ok || !payload) {
      return blankValidation(`Validation call failed (HTTP ${res.status})`);
    }

    // VALID / VALIDATED both mean the money is confirmed; anything else is not.
    const status = String(payload.status ?? "").toUpperCase();
    return {
      ok: status === "VALID" || status === "VALIDATED",
      status,
      amount: payload.amount != null ? Number(payload.amount) : null,
      currency: payload.currency ?? null,
      tranId: payload.tran_id ?? null,
      bankTranId: payload.bank_tran_id ?? null,
      cardType: payload.card_type ?? "",
      error: status === "VALID" || status === "VALIDATED" ? null : `Gateway reported ${status || "no status"}`,
    };
  } catch (err) {
    console.error("[payment:sslcommerz] validation failed:", err);
    return blankValidation(err?.message ?? "Could not reach the payment gateway");
  }
}

function blankValidation(error) {
  return {
    ok: false,
    status: "UNREACHABLE",
    amount: null,
    currency: null,
    tranId: null,
    bankTranId: null,
    cardType: "",
    error,
  };
}

/** Our own reference for a checkout: readable, unique, and safe in a URL. */
export function newTransactionId(companyId) {
  const stamp = Date.now().toString(36);
  const noise = Math.random().toString(36).slice(2, 8);
  return `SW-${String(companyId).slice(-6)}-${stamp}-${noise}`.toUpperCase();
}
