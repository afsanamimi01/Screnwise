import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Shell } from "@/admin/components/Shell";
import { ErrorState, LoadingRows } from "@/shared/components/StateViews";
import { getCompanies, updateCompanyAccess } from "@/shared/lib/api";
import { usePageTitle } from "@/shared/lib/use-page-title";
import "./Companies.css";

/** Table columns - reorder / rename here. Last one is the actions cell. */
const COLUMNS = ["Company", "Manager", "Plan", "HR seats", "Jobs", "Expires", "Status", ""] as const;

function accessState(c: { accessible: boolean; status: string; plan: string | null }) {
  if (c.accessible) return "active";
  if (c.status === "revoked") return "revoked";
  if (!c.plan) return "no plan";
  return "expired";
}

export default function Companies() {
  usePageTitle("Companies - Screenwise");
  const queryClient = useQueryClient();
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["admin-companies"],
    queryFn: getCompanies,
  });
  const [busy, setBusy] = useState<string | null>(null);

  const act = async (id: string, action: "renew" | "revoke" | "clear") => {
    // Clearing a plan is not reversible from here - the company has to buy
    // again - so it asks first, unlike renew and revoke.
    if (action === "clear") {
      const company = data?.find((c) => c.id === id);
      const confirmed = window.confirm(
        `Remove ${company?.name ?? "this company"}'s subscription?

` +
          "Their jobs, candidates and HR accounts stay exactly as they are, but the workspace " +
          "locks until the manager chooses a plan again - the same as a new signup.",
      );
      if (!confirmed) return;
    }

    setBusy(id + action);
    try {
      await updateCompanyAccess(id, action);
      toast.success(
        action === "renew"
          ? "Subscription renewed."
          : action === "revoke"
            ? "Access revoked."
            : "Subscription cleared - the manager picks a plan again.",
      );
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["admin-companies"] }),
        queryClient.invalidateQueries({ queryKey: ["admin-dashboard"] }),
      ]);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not update the company.");
    } finally {
      setBusy(null);
    }
  };

  return (
    <Shell allow={["superadmin"]}>
      <main className="companies">
        <div className="companies__intro">
          <h1 className="companies__intro-title">Companies</h1>
          <p className="companies__intro-text">
            Every organisation on a subscription. Renew extends access by 30 days, revoke blocks it
            immediately, and clearing the plan puts a company back to a fresh signup without
            touching its data.
          </p>
        </div>

        {isLoading ? <LoadingRows rows={4} /> : null}
        {isError ? (
          <ErrorState message="We couldn't load companies." onRetry={() => refetch()} />
        ) : null}

        {data ? (
          <div className="companies__table-wrap">
            <table className="companies__table">
              <thead>
                <tr>
                  {COLUMNS.map((c, i) => (
                    <th
                      key={i}
                      className={i === COLUMNS.length - 1 ? "companies__cell--right" : undefined}
                    >
                      {c}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.map((c) => (
                  <tr key={c.id}>
                    <td className="companies__cell--name">{c.name}</td>
                    <td className="companies__cell--muted">{c.manager ? c.manager.email : "-"}</td>
                    <td className="companies__cell--cap">{c.plan ?? "-"}</td>
                    <td className="companies__num">
                      {c.plan
                        ? `${c.hrSeatsUsed}${c.hrSeatLimit != null ? ` / ${c.hrSeatLimit}` : ""}`
                        : "-"}
                    </td>
                    <td className="companies__num">{c.jobCount}</td>
                    <td className="companies__num companies__cell--muted">
                      {c.subscriptionExpiresAt ?? "-"}
                    </td>
                    <td>
                      <span
                        className={
                          "companies__pill" +
                          (c.accessible ? " companies__pill--ok" : " companies__pill--muted")
                        }
                      >
                        {accessState(c)}
                      </span>
                    </td>
                    <td className="companies__cell--right">
                      <div className="companies__actions">
                        <button
                          type="button"
                          className="companies__btn"
                          disabled={busy !== null}
                          onClick={() => act(c.id, "renew")}
                        >
                          {busy === c.id + "renew" ? "…" : "Renew"}
                        </button>
                        <button
                          type="button"
                          className="companies__btn"
                          disabled={busy !== null || !c.plan}
                          title={
                            c.plan
                              ? "Remove the subscription - the manager chooses a plan again"
                              : "This company has no plan to clear"
                          }
                          onClick={() => act(c.id, "clear")}
                        >
                          {busy === c.id + "clear" ? "…" : "Clear plan"}
                        </button>
                        <button
                          type="button"
                          className="companies__btn companies__btn--danger"
                          disabled={busy !== null || c.status === "revoked"}
                          onClick={() => act(c.id, "revoke")}
                        >
                          {busy === c.id + "revoke" ? "…" : "Revoke"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </main>
    </Shell>
  );
}
