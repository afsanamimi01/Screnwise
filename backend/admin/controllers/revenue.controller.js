import Payment from "../../shared/models/Payment.model.js";
import Company from "../../shared/models/Company.model.js";
import { gatewayStatus } from "../../shared/payment/sslcommerz.js";

const DAY = 24 * 60 * 60 * 1000;

/** Start of the calendar month, in the server's timezone. */
function startOfMonth(date = new Date()) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function sum(rows) {
  let total = 0;
  for (const row of rows) {
    total = total + (row.amount ?? 0);
  }
  return total;
}

export async function getRevenue(req, res, next) {
  try {
    // Sort config
    const SORT_BY = "createdAt desc";
    const [sortField, sortWord] = SORT_BY.split(" ");
    const sortOrder = sortWord === "desc" ? -1 : 1;

    const limit = Math.min(Number(req.query.limit) || 100, 500);
    // Only paid rows count as revenue - a pending/abandoned checkout is never
    // fetched here, so there is no status breakdown to calculate.
    const payments = await Payment.find({ status: "paid" }).sort({ [sortField]: sortOrder });
    const companies = await Company.find().select("name");

    // Company name by id, looked up once instead of per row.
    const nameById = {};
    for (const company of companies) {
      nameById[company._id.toString()] = company.name;
    }

    // `manual` rows are separated out so the demo's free activations never
    // inflate the figures.
    const real = payments.filter((p) => p.gateway !== "manual");
    const manual = payments.filter((p) => p.gateway === "manual");

    // Tiles
    const monthStart = startOfMonth();
    const last30Start = new Date(Date.now() - 30 * DAY);

    let collected = 0;
    let thisMonth = 0;
    let last30Days = 0;
    const payingCompanyIds = new Set();

    for (const p of real) {
      const amount = p.amount ?? 0;
      const at = p.paidAt ?? p.createdAt;

      collected = collected + amount;
      if (at >= monthStart) {
        thisMonth = thisMonth + amount;
      }
      if (at >= last30Start) {
        last30Days = last30Days + amount;
      }
      payingCompanyIds.add(p.companyId.toString());
    }

    const averagePayment = real.length ? Math.round(collected / real.length) : 0;

    let manualAmount = 0;
    for (const p of manual) {
      manualAmount = manualAmount + (p.amount ?? 0);
    }

    // Trend chart
    let earliest = null;
    for (const p of real) {
      const at = p.paidAt ?? p.createdAt;
      if (!earliest || at < earliest) earliest = at;
    }

    let monthsBack = 0;
    if (earliest) {
      const now = new Date();
      const yearsDiff = now.getFullYear() - earliest.getFullYear();
      const monthsDiff = now.getMonth() - earliest.getMonth();
      monthsBack = Math.min(11, yearsDiff * 12 + monthsDiff);
    }

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

    // By plan
    const byPlan = {};
    for (const p of real) {
      byPlan[p.planKey] ??= { plan: p.planKey, amount: 0, count: 0 };
      byPlan[p.planKey].amount += p.amount ?? 0;
      byPlan[p.planKey].count += 1;
    }

    // Payments list
    const paymentRows = payments.slice(0, limit).map((p) => ({
      ...p.toJSON(),
      companyName: nameById[p.companyId.toString()] ?? "(deleted company)",
    }));

    res.json({
      gateway: gatewayStatus(),
      currency: real[0]?.currency ?? "BDT",
      totals: {
        collected,
        thisMonth,
        last30Days,
        payingCompanies: payingCompanyIds.size,
        paidCount: real.length,
        averagePayment,
        /** Activated without payment, because no gateway was configured. */
        manualCount: manual.length,
        manualAmount,
      },
      series,
      byPlan: Object.values(byPlan).sort((a, b) => b.amount - a.amount),
      payments: paymentRows,
    });
  } catch (err) {
    next(err);
  }
}
