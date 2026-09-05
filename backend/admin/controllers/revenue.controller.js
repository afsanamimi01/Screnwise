/**
 * Platform revenue for the super admin.
 *
 * Reports what was actually collected, not what was invoiced: only payments the
 * gateway confirmed (`paid`) count towards revenue. Attempts that failed, were
 * cancelled, or failed validation are still listed - a checkout that keeps
 * failing is something the operator needs to see, not something to hide.
 *
 * Payments recorded while no gateway was configured are marked `manual` and
 * counted separately, because no money changed hands for those.
 */
import Payment from "../../shared/models/Payment.model.js";
import Company from "../../shared/models/Company.model.js";
import { gatewayStatus } from "../../shared/payment/sslcommerz.js";

const DAY = 24 * 60 * 60 * 1000;

/** Start of the calendar month, in the server's timezone. */
function startOfMonth(date = new Date()) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function sum(rows) {
  return rows.reduce((total, r) => total + (r.amount ?? 0), 0);
}

/**
 * Everything the admin revenue page shows: headline totals, a monthly series,
 * a breakdown per plan, and the transactions themselves with company names
 * resolved.
 */
export async function getRevenue(req, res, next) {
  try {
    const limit = Math.min(Number(req.query.limit) || 100, 500);

    const payments = await Payment.find().sort({ createdAt: -1 });
    const companies = await Company.find().select("name plan");
    const companyName = new Map(companies.map((c) => [c._id.toString(), c.name]));

    // Only confirmed money counts as revenue; `manual` rows are separated out
    // so the demo's free activations never inflate the figures.
    const settled = payments.filter((p) => p.status === "paid");
    const real = settled.filter((p) => p.gateway !== "manual");
    const manual = settled.filter((p) => p.gateway === "manual");

    const monthStart = startOfMonth();
    const thisMonth = real.filter((p) => (p.paidAt ?? p.createdAt) >= monthStart);
    const last30 = real.filter(
      (p) => (p.paidAt ?? p.createdAt) >= new Date(Date.now() - 30 * DAY),
    );

    // The trend starts where the money does, not a fixed year back: a run of
    // empty months before the first payment says nothing and reads as a gap in
    // the data. Capped at twelve so a long history stays legible.
    const earliest = real.reduce(
      (oldest, p) => {
        const at = p.paidAt ?? p.createdAt;
        return !oldest || at < oldest ? at : oldest;
      },
      /** @type {Date|null} */ (null),
    );
    const monthsBack = earliest
      ? Math.min(
          11,
          (new Date().getFullYear() - earliest.getFullYear()) * 12 +
            (new Date().getMonth() - earliest.getMonth()),
        )
      : 0;

    const series = [];
    for (let i = monthsBack; i >= 0; i--) {
      const from = startOfMonth(new Date(new Date().getFullYear(), new Date().getMonth() - i, 1));
      const to = new Date(from.getFullYear(), from.getMonth() + 1, 1);
      const rows = real.filter((p) => {
        const at = p.paidAt ?? p.createdAt;
        return at >= from && at < to;
      });
      series.push({
        month: `${from.getFullYear()}-${String(from.getMonth() + 1).padStart(2, "0")}`,
        amount: sum(rows),
        count: rows.length,
      });
    }

    const byPlan = {};
    for (const p of real) {
      byPlan[p.planKey] ??= { plan: p.planKey, amount: 0, count: 0 };
      byPlan[p.planKey].amount += p.amount ?? 0;
      byPlan[p.planKey].count += 1;
    }

    const byStatus = payments.reduce((acc, p) => {
      acc[p.status] = (acc[p.status] ?? 0) + 1;
      return acc;
    }, {});

    // How many checkouts that were actually attempted ended up paid.
    const attempted = payments.filter((p) => p.gateway !== "manual").length;
    const conversion = attempted ? Math.round((real.length / attempted) * 100) : 0;

    res.json({
      gateway: gatewayStatus(),
      currency: real[0]?.currency ?? "BDT",
      totals: {
        collected: sum(real),
        thisMonth: sum(thisMonth),
        last30Days: sum(last30),
        paidCount: real.length,
        attempted,
        conversion,
        /** Activated without payment, because no gateway was configured. */
        manualCount: manual.length,
        manualAmount: sum(manual),
        payingCompanies: new Set(real.map((p) => p.companyId.toString())).size,
        averagePayment: real.length ? Math.round(sum(real) / real.length) : 0,
      },
      series,
      byPlan: Object.values(byPlan).sort((a, b) => b.amount - a.amount),
      byStatus,
      payments: payments.slice(0, limit).map((p) => ({
        ...p.toJSON(),
        companyName: companyName.get(p.companyId.toString()) ?? "(deleted company)",
      })),
    });
  } catch (err) {
    next(err);
  }
}
