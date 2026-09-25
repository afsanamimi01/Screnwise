
import Company from "../../shared/models/Company.model.js";
import Payment from "../../shared/models/Payment.model.js";
import Plan from "../../shared/models/Plan.model.js";
import User from "../../shared/models/User.model.js";
import { logAudit } from "../../shared/utils/audit.js";
import { PLAN_KEYS, activatePlan, seatConflict } from "../../shared/billing/subscription.js";
import {
  activeDriver,
  clientBaseUrl,
  gatewayStatus,
  initiatePayment,
  newTransactionId,
  validatePayment,
} from "../../shared/payment/sslcommerz.js";

/** Where the customer's browser lands once we are done with a callback. */
function billingUrl(params) {
  const url = new URL("/billing", clientBaseUrl());
  for (const [key, value] of Object.entries(params)) {
    if (value != null) url.searchParams.set(key, String(value));
  }
  return url.toString();
}

/** What the billing page shows about payments. */
export async function getPaymentStatus(_req, res, next) {
  try {
    res.json(gatewayStatus());
  } catch (err) {
    next(err);
  }
}

/** This company's paid receipts, newest first. Abandoned checkouts never show up here. */
export async function listPayments(req, res, next) {
  try {
    // ---- Sort config ----
    // Flip to "createdAt asc" to show the oldest receipts first - nothing else to touch.
    const SORT_BY = "createdAt desc";
    const [sortField, sortWord] = SORT_BY.split(" ");
    const sortOrder = sortWord === "desc" ? -1 : 1;

    const rows = await Payment.find({ companyId: req.user.companyId, status: "paid" })
      .sort({ [sortField]: sortOrder })
      .limit(25);

    const payments = [];
    for (const r of rows) payments.push(r.toJSON());
    res.json(payments);
  } catch (err) {
    next(err);
  }
}

/**
 * Start a checkout.
 *
 * With no gateway configured the plan is activated on the spot and the payment
 * is recorded as `manual`, so the demo keeps working and the record still says
 * plainly that no money moved.
 */
export async function startPayment(req, res, next) {
  try {
    // ---- Step 1: the plan must be one of the three real plan keys ----
    const { plan: planKey } = req.body;
    if (!PLAN_KEYS.includes(planKey)) {
      return res.status(400).json({ message: "plan must be basic, advance or custom" });
    }

    // ---- Step 2: the company, its priced plan and the manager, fetched independently ----
    const [company, plan, manager] = await Promise.all([
      Company.findById(req.user.companyId),
      Plan.findOne({ key: planKey }),
      User.findById(req.user._id),
    ]);
    if (!company) return res.status(404).json({ message: "Company not found" });

    // ---- Step 3: refuse a downgrade that could not be applied, before taking any money ----
    const conflict = await seatConflict(company._id, planKey);
    if (conflict) return res.status(409).json({ message: conflict });

    // ---- Step 4: this plan must actually be sold online ----
    const amount = plan?.amount ?? 0;
    if (amount <= 0) {
      return res.status(400).json({
        message: "This plan isn't sold online - talk to us and we'll set it up.",
        code: "NOT_PURCHASABLE",
      });
    }

    // ---- Step 5: record the pending payment ----
    const tranId = newTransactionId(company._id);
    const payment = await Payment.create({
      companyId: company._id,
      initiatedBy: req.user._id,
      planKey,
      tranId,
      amount,
      currency: plan?.currency || "BDT",
      gateway: activeDriver(),
    });

    // ---- Step 6: no gateway configured - activate the plan on the spot ----
    if (activeDriver() === "manual") {
      const { firstPick } = await activatePlan(company, planKey);
      payment.status = "paid";
      payment.paidAt = new Date();
      payment.cardType = "No gateway configured";
      await payment.save();
      await logAudit(
        req.user.name,
        firstPick ? "Plan selected" : "Plan changed",
        `${company.name} → ${planKey} (no gateway configured, nothing charged)`,
        company._id,
      );
      return res.status(201).json({ paid: true, redirectUrl: null, payment: payment.toJSON() });
    }

    // ---- Step 7: a gateway is configured - start the real checkout session ----
    const session = await initiatePayment({
      tranId,
      amount,
      currency: payment.currency,
      plan: planKey,
      company,
      customer: { name: manager?.name, email: manager?.email },
    });

    if (!session.ok) {
      // The gateway never saw this tranId, so there is nothing to reconcile later.
      await payment.deleteOne();
      return res.status(502).json({ message: session.error ?? "Could not start the payment" });
    }

    res.status(201).json({ paid: false, redirectUrl: session.redirectUrl, tranId });
  } catch (err) {
    next(err);
  }
}

/**
 * Confirm one transaction and, if it holds up, activate the plan.
 *
 * Shared by the browser redirect and the server-to-server IPN, because the
 * checks are the same either way and whichever arrives first should settle it.
 *
 * @returns {Promise<{ok: boolean, payment: object|null, reason: string}>}
 */
async function settlePayment(body) {
  // ---- Step 1: the callback must carry a transaction id we know about ----
  const tranId = body?.tran_id;
  const valId = body?.val_id;
  if (!tranId) return { ok: false, payment: null, reason: "No transaction id in the callback" };

  const payment = await Payment.findOne({ tranId });
  if (!payment) return { ok: false, payment: null, reason: "Unknown transaction" };

  // ---- Step 2: already settled - a second callback must not activate anything twice ----
  if (payment.status === "paid") return { ok: true, payment, reason: "Already settled" };

  // Nothing below here is persisted: an unconfirmed checkout just stays
  // `pending` so a later, genuine callback for the same tranId can still
  // settle it - it is never labelled failed/cancelled/invalid in the database.
  // ---- Step 3: the callback must carry a validation id ----
  if (!valId) {
    return { ok: false, payment, reason: "Callback carried no validation id" };
  }

  // ---- Step 4: the gateway must confirm that validation id ----
  const check = await validatePayment(valId);
  if (!check.ok) {
    return { ok: false, payment, reason: check.error ?? `Gateway reported ${check.status}` };
  }

  // ---- Step 5: what the gateway says was paid must match what we recorded ----
  // The gateway is the authority on what was paid; if it does not match what we
  // recorded, something is wrong and no plan is granted.
  if (check.amount == null || Math.abs(check.amount - payment.amount) > 0.01) {
    return { ok: false, payment, reason: `Paid ${check.amount} but the plan costs ${payment.amount}` };
  }

  // ---- Step 6: the company must still exist ----
  const company = await Company.findById(payment.companyId);
  if (!company) {
    return { ok: false, payment, reason: "Company no longer exists" };
  }

  // ---- Step 7: activate the plan and record the payment as paid ----
  const { firstPick } = await activatePlan(company, payment.planKey);

  payment.status = "paid";
  payment.valId = valId;
  payment.bankTranId = check.bankTranId;
  payment.cardType = check.cardType;
  payment.paidAt = new Date();
  await payment.save();

  // ---- Step 8: log who it was for and return ----
  const manager = await User.findById(payment.initiatedBy);
  await logAudit(
    manager?.name ?? "Payment gateway",
    firstPick ? "Plan selected" : "Plan changed",
    `${company.name} → ${payment.planKey} · ${payment.currency} ${payment.amount} · ${payment.tranId}`,
    company._id,
  );

  return { ok: true, payment, reason: "Settled" };
}

/** SSLCommerz redirects the customer's browser here after a successful payment. */
export async function paymentSuccess(req, res, next) {
  try {
    const result = await settlePayment({ ...req.body, ...req.query });
    res.redirect(
      billingUrl({
        payment: result.ok ? "success" : "invalid",
        plan: result.payment?.planKey,
        reason: result.ok ? null : result.reason,
      }),
    );
  } catch (err) {
    next(err);
  }
}

/**
 * The customer's card was declined, or the gateway rejected the payment.
 *
 * The row is left exactly as it is (still `pending`) instead of being marked
 * failed - a genuine IPN for the same tranId can still arrive and settle it,
 * and there is no failed state to record it under either way.
 */
export async function paymentFail(req, res, next) {
  try {
    const tranId = req.body?.tran_id ?? req.query?.tran_id;
    const payment = tranId ? await Payment.findOne({ tranId }) : null;
    res.redirect(billingUrl({ payment: "failed", plan: payment?.planKey }));
  } catch (err) {
    next(err);
  }
}

/** The customer backed out on the gateway's page. The row stays `pending`, same as a decline. */
export async function paymentCancel(req, res, next) {
  try {
    const tranId = req.body?.tran_id ?? req.query?.tran_id;
    const payment = tranId ? await Payment.findOne({ tranId }) : null;
    res.redirect(billingUrl({ payment: "cancelled", plan: payment?.planKey }));
  } catch (err) {
    next(err);
  }
}

/**
 * Server-to-server notification. This is the one that matters when the customer
 * closes the tab mid-redirect: no browser involved, so it answers plainly
 * rather than redirecting.
 */
export async function paymentIpn(req, res, next) {
  try {
    const result = await settlePayment(req.body ?? {});
    res.status(result.ok ? 200 : 400).json({ received: true, settled: result.ok, reason: result.reason });
  } catch (err) {
    next(err);
  }
}
