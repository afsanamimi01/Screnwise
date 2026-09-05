/**
 * Buying a plan through SSLCommerz.
 *
 * The flow, and where trust sits at each step:
 *
 *   1. The manager picks a plan. We read the price from the Plan record - never
 *      from the request - write a `pending` Payment, and ask SSLCommerz for a
 *      checkout session.
 *   2. The customer pays on the gateway's own page. We never see card details.
 *   3. SSLCommerz sends the browser back to `/payments/success`. That request
 *      proves nothing: anyone can open the URL. So we call the gateway's
 *      validation API from our server, with our store credentials, and only
 *      activate the plan if it confirms the transaction *and* the amount
 *      matches what we recorded.
 *   4. `/payments/ipn` is the same confirmation server-to-server, for the case
 *      where the customer closes the tab before being redirected back.
 */
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

/** This company's checkout history, newest first. */
export async function listPayments(req, res, next) {
  try {
    const rows = await Payment.find({ companyId: req.user.companyId })
      .sort({ createdAt: -1 })
      .limit(25);
    res.json(rows.map((r) => r.toJSON()));
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
    const { plan: planKey } = req.body;
    if (!PLAN_KEYS.includes(planKey)) {
      return res.status(400).json({ message: "plan must be basic, advance or custom" });
    }

    const [company, plan, manager] = await Promise.all([
      Company.findById(req.user.companyId),
      Plan.findOne({ key: planKey }),
      User.findById(req.user._id),
    ]);
    if (!company) return res.status(404).json({ message: "Company not found" });

    // Refuse a downgrade that could not be applied, before taking any money.
    const conflict = await seatConflict(company._id, planKey);
    if (conflict) return res.status(409).json({ message: conflict });

    const amount = plan?.amount ?? 0;
    if (amount <= 0) {
      return res.status(400).json({
        message: "This plan isn't sold online - talk to us and we'll set it up.",
        code: "NOT_PURCHASABLE",
      });
    }

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

    const session = await initiatePayment({
      tranId,
      amount,
      currency: payment.currency,
      plan: planKey,
      company,
      customer: { name: manager?.name, email: manager?.email },
    });

    if (!session.ok) {
      payment.status = "failed";
      payment.failReason = session.error ?? "Gateway refused the session";
      await payment.save();
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
  const tranId = body?.tran_id;
  const valId = body?.val_id;
  if (!tranId) return { ok: false, payment: null, reason: "No transaction id in the callback" };

  const payment = await Payment.findOne({ tranId });
  if (!payment) return { ok: false, payment: null, reason: "Unknown transaction" };

  // Already settled - a second callback (IPN after redirect, or a retry) must
  // not activate anything twice.
  if (payment.status === "paid") return { ok: true, payment, reason: "Already settled" };

  if (!valId) {
    payment.status = "invalid";
    payment.failReason = "Callback carried no validation id";
    await payment.save();
    return { ok: false, payment, reason: payment.failReason };
  }

  const check = await validatePayment(valId);
  if (!check.ok) {
    payment.status = "invalid";
    payment.failReason = check.error ?? `Gateway reported ${check.status}`;
    await payment.save();
    return { ok: false, payment, reason: payment.failReason };
  }

  // The gateway is the authority on what was paid; if it does not match what we
  // recorded, something is wrong and no plan is granted.
  if (check.amount == null || Math.abs(check.amount - payment.amount) > 0.01) {
    payment.status = "invalid";
    payment.failReason = `Paid ${check.amount} but the plan costs ${payment.amount}`;
    await payment.save();
    return { ok: false, payment, reason: payment.failReason };
  }

  const company = await Company.findById(payment.companyId);
  if (!company) {
    payment.status = "invalid";
    payment.failReason = "Company no longer exists";
    await payment.save();
    return { ok: false, payment, reason: payment.failReason };
  }

  const { firstPick } = await activatePlan(company, payment.planKey);

  payment.status = "paid";
  payment.valId = valId;
  payment.bankTranId = check.bankTranId;
  payment.cardType = check.cardType;
  payment.paidAt = new Date();
  await payment.save();

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

/** The customer's card was declined, or the gateway rejected the payment. */
export async function paymentFail(req, res, next) {
  try {
    const tranId = req.body?.tran_id ?? req.query?.tran_id;
    const payment = tranId ? await Payment.findOne({ tranId }) : null;
    if (payment && payment.status === "pending") {
      payment.status = "failed";
      payment.failReason = req.body?.error || req.body?.failedreason || "The payment did not go through";
      await payment.save();
    }
    res.redirect(billingUrl({ payment: "failed", plan: payment?.planKey }));
  } catch (err) {
    next(err);
  }
}

/** The customer backed out on the gateway's page. */
export async function paymentCancel(req, res, next) {
  try {
    const tranId = req.body?.tran_id ?? req.query?.tran_id;
    const payment = tranId ? await Payment.findOne({ tranId }) : null;
    if (payment && payment.status === "pending") {
      payment.status = "cancelled";
      await payment.save();
    }
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
