import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Shell } from "@/admin/components/Shell";
import { EmptyState, ErrorState, LoadingRows } from "@/shared/components/StateViews";
import { getRevenue } from "@/shared/lib/api";
import type { RevenueReport } from "@/shared/lib/types";
import { usePageTitle } from "@/shared/lib/use-page-title";
import "./Revenue.css";

/** Headline figures, in display order. */
const TILES = [
  { key: "collected", label: "Collected", hint: "All confirmed payments" },
  { key: "thisMonth", label: "This month", hint: "Calendar month to date" },
  { key: "last30Days", label: "Last 30 days", hint: "Rolling window" },
] as const;

function money(amount: number, currency: string) {
  const symbol = currency === "BDT" ? "৳" : `${currency} `;
  return `${symbol}${amount.toLocaleString("en-US")}`;
}

/** "2026-09" -> "Sep", with the year kept for January so the axis stays readable. */
function monthLabel(month: string) {
  const [year, m] = month.split("-");
  const name = new Date(Number(year), Number(m) - 1, 1).toLocaleString("en-US", { month: "short" });
  return m === "01" ? `${name} ${year!.slice(2)}` : name;
}

/**
 * Twelve months of collected revenue.
 *
 * One series, so no legend - the heading names it. Every month is labelled with
 * its total, and the hover tooltip adds the payment count behind it.
 */
function RevenueTrend({ series, currency }: { series: RevenueReport["series"]; currency: string }) {
  const [hover, setHover] = useState<string | null>(null);
  // The tallest month sets the scale for the rest.
  const peak = Math.max(...series.map((s) => s.amount), 0);

  return (
    <section className="revenue__panel">
      <div className="revenue__panel-head">
        <h2 className="revenue__panel-title">Revenue collected, by month</h2>
      </div>

      <div className="revenue__chart">
        {series.map((point) => {
          // Zero months still render a baseline tick, so gaps read as real.
          const height = peak > 0 ? Math.round((point.amount / peak) * 100) : 0;
          return (
            <div
              key={point.month}
              className="revenue__bar-slot"
              onMouseEnter={() => setHover(point.month)}
              onMouseLeave={() => setHover(null)}
              onFocus={() => setHover(point.month)}
              onBlur={() => setHover(null)}
              tabIndex={0}
              role="img"
              aria-label={`${monthLabel(point.month)}: ${money(point.amount, currency)} from ${point.count} payment(s)`}
            >
              {hover === point.month ? (
                <div className="revenue__tooltip">
                  <span className="revenue__tooltip-value">{money(point.amount, currency)}</span>
                  <span className="revenue__tooltip-meta">
                    {monthLabel(point.month)} · {point.count} payment{point.count === 1 ? "" : "s"}
                  </span>
                </div>
              ) : null}
              <span className="revenue__bar-label">{money(point.amount, currency)}</span>
              <div
                className={"revenue__bar" + (point.amount === 0 ? " revenue__bar--empty" : "")}
                style={{ height: `${Math.max(height, point.amount > 0 ? 4 : 1)}%` }}
              />
              <span className="revenue__bar-month">{monthLabel(point.month)}</span>
            </div>
          );
        })}
      </div>
    </section>
  );
}

export default function Revenue() {
  usePageTitle("Revenue - Screenwise");
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["revenue"],
    queryFn: getRevenue,
  });

  const currency = data?.currency ?? "BDT";
  // A trend needs a trend: with one month of history a chart says less than
  // the headline figure already does.
  const monthsWithRevenue = data?.series.filter((s) => s.amount > 0).length ?? 0;

  return (
    <Shell allow={["superadmin"]}>
      <main className="revenue">
        <div className="revenue__intro">
          <h1 className="revenue__intro-title">Revenue</h1>
          <p className="revenue__intro-text">
            What the platform has collected, which plans earn it, and every payment attempt -
            including the ones that failed.
          </p>
        </div>

        {isLoading ? <LoadingRows rows={4} /> : null}
        {isError ? (
          <ErrorState message="We couldn't load the revenue report." onRetry={() => refetch()} />
        ) : null}

        {data ? (
          <>
            <div className="revenue__tiles">
              {TILES.map((tile) => (
                <div key={tile.key} className="revenue__tile">
                  <span className="revenue__tile-label">{tile.label}</span>
                  <span className="revenue__tile-value">
                    {money(data.totals[tile.key], currency)}
                  </span>
                  <span className="revenue__tile-hint">{tile.hint}</span>
                </div>
              ))}
              <div className="revenue__tile">
                <span className="revenue__tile-label">Paying companies</span>
                <span className="revenue__tile-value">{data.totals.payingCompanies}</span>
                <span className="revenue__tile-hint">
                  {data.totals.paidCount} payment{data.totals.paidCount === 1 ? "" : "s"} ·{" "}
                  {money(data.totals.averagePayment, currency)} average
                </span>
              </div>
            </div>

            {monthsWithRevenue >= 2 ? (
              <RevenueTrend series={data.series} currency={currency} />
            ) : null}

            <section className="revenue__panel">
              <div className="revenue__panel-head">
                <h2 className="revenue__panel-title">By plan</h2>
              </div>
              {data.byPlan.length === 0 ? (
                <p className="revenue__empty-note">Nothing collected yet.</p>
              ) : (
                <div className="revenue__plans">
                  {data.byPlan.map((row) => {
                    const share = data.totals.collected
                      ? Math.round((row.amount / data.totals.collected) * 100)
                      : 0;
                    return (
                      <div key={row.plan} className="revenue__plan">
                        <div className="revenue__plan-line">
                          <span className="revenue__plan-name">{row.plan}</span>
                          <span className="revenue__plan-amount">
                            {money(row.amount, currency)}
                          </span>
                        </div>
                        <div className="revenue__plan-track">
                          <div className="revenue__plan-fill" style={{ width: `${share}%` }} />
                        </div>
                        <span className="revenue__plan-meta">
                          {row.count} payment{row.count === 1 ? "" : "s"} · {share}% of revenue
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>

            <section className="revenue__panel">
              <div className="revenue__panel-head">
                <h2 className="revenue__panel-title">Payments</h2>
                <span className="revenue__panel-note">{data.payments.length} most recent</span>
              </div>

              {data.payments.length === 0 ? (
                <EmptyState
                  title="No payments yet"
                  description="Checkouts will appear here as companies buy plans."
                />
              ) : (
                <div className="revenue__table">
                  {data.payments.map((p) => (
                    <div key={p.id} className="revenue__row">
                      <div className="revenue__row-main">
                        <span className="revenue__row-company">{p.companyName}</span>
                        <span className="revenue__row-meta">
                          {p.planKey} plan · {p.gateway}
                          {p.cardType ? ` · ${p.cardType}` : ""} · {p.tranId}
                        </span>
                      </div>
                      <div className="revenue__row-side">
                        <span className="revenue__row-amount">{money(p.amount, p.currency)}</span>
                        <span className="revenue__row-date">{p.paidAt ?? p.createdAt}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </>
        ) : null}
      </main>
    </Shell>
  );
}
