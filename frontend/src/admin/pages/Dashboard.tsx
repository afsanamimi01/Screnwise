import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { AlertTriangle, Briefcase, Building2, FileText, Users } from "lucide-react";
import { Shell } from "@/admin/components/Shell";
import { ErrorState, LoadingRows } from "@/shared/components/StateViews";
import { getAdminDashboard } from "@/shared/lib/api";
import { usePageTitle } from "@/shared/lib/use-page-title";
import "./Dashboard.css";

/** KPI tiles - reorder the array to reorder the row. */
const KPIS = [
  { key: "companies", label: "Companies", icon: Building2 },
  { key: "activeCompanies", label: "Active now", icon: Building2 },
  { key: "candidates", label: "Candidates", icon: Users },
  { key: "jobs", label: "Jobs", icon: Briefcase },
  { key: "applications", label: "Applications", icon: FileText },
] as const;

function companyState(c: { accessible?: boolean; status: string; plan: string | null }) {
  if (c.accessible) return "active";
  if (c.status === "revoked") return "revoked";
  if (!c.plan) return "no plan";
  return "expired";
}

export default function Dashboard() {
  usePageTitle("Super admin - Screenwise");
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["admin-dashboard"],
    queryFn: getAdminDashboard,
  });

  return (
    <Shell allow={["superadmin"]}>
      <main className="dashboard">
        <div className="dashboard__intro">
          <h1 className="dashboard__intro-title">Platform overview</h1>
          <p className="dashboard__intro-text">
            Companies on subscription, their access state and what's expiring soon.
          </p>
        </div>

        {isLoading ? <LoadingRows rows={4} /> : null}
        {isError ? (
          <ErrorState message="We couldn't load the dashboard." onRetry={() => refetch()} />
        ) : null}

        {data ? (
          <>
            <div className="dashboard__kpis">
              {KPIS.map((kpi) => (
                <div key={kpi.key} className="dashboard__kpi">
                  <kpi.icon className="dashboard__kpi-icon" size={16} />
                  <div className="dashboard__kpi-value">{data.totals[kpi.key]}</div>
                  <div className="dashboard__kpi-label">{kpi.label}</div>
                </div>
              ))}
            </div>

            <div className="dashboard__panels">
              <section className="dashboard__panel">
                <header className="dashboard__panel-head">
                  <h2 className="dashboard__panel-title">
                    <AlertTriangle className="dashboard__panel-icon" size={16} />
                    Expiring within 7 days
                  </h2>
                  <Link to="/admin/companies" className="dashboard__link">
                    Manage
                  </Link>
                </header>
                <div className="dashboard__rows">
                  {data.expiringSoon.length === 0 ? (
                    <p className="dashboard__empty">Nothing expiring soon.</p>
                  ) : (
                    data.expiringSoon.map((c) => (
                      <div key={c.id} className="dashboard__row">
                        <span className="dashboard__row-name">{c.name}</span>
                        <span className="dashboard__row-meta">
                          <span className="dashboard__pill">{c.plan ?? "-"}</span>
                          <span className="dashboard__num">{c.subscriptionExpiresAt ?? "-"}</span>
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </section>

              <section className="dashboard__panel">
                <header className="dashboard__panel-head">
                  <h2 className="dashboard__panel-title">Recent companies</h2>
                </header>
                <div className="dashboard__rows">
                  {data.recentCompanies.map((c) => (
                    <div key={c.id} className="dashboard__row">
                      <span className="dashboard__row-name">{c.name}</span>
                      <span className="dashboard__row-meta">
                        <span className="dashboard__pill">{c.plan ?? "-"}</span>
                        <span
                          className={
                            "dashboard__pill" +
                            (c.accessible ? " dashboard__pill--ok" : " dashboard__pill--muted")
                          }
                        >
                          {companyState(c)}
                        </span>
                      </span>
                    </div>
                  ))}
                </div>
              </section>
            </div>
          </>
        ) : null}
      </main>
    </Shell>
  );
}
