import { useQuery } from "@tanstack/react-query";
import { Shell } from "@/admin/components/Shell";
import { EmptyState, ErrorState, LoadingRows } from "@/shared/components/StateViews";
import { getAuditLog } from "@/shared/lib/api";
import { usePageTitle } from "@/shared/lib/use-page-title";
import "./AuditLog.css";

export default function AuditLog() {
  usePageTitle("Audit log — Screenwise");
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["audit"],
    queryFn: getAuditLog,
  });

  return (
    <Shell allow={["superadmin"]}>
      <main className="audit-log">
        <div className="audit-log__intro">
          <h1 className="audit-log__intro-title">Audit log</h1>
          <p className="audit-log__intro-text">
            Company signups, plan changes, access actions, job activity and emails across the
            platform.
          </p>
        </div>

        {isLoading ? <LoadingRows rows={5} /> : null}
        {isError ? (
          <ErrorState message="We couldn't load the audit log." onRetry={() => refetch()} />
        ) : null}
        {data && data.length === 0 ? (
          <EmptyState
            title="No activity yet"
            description="Actions will appear here as your team works."
          />
        ) : null}

        {data && data.length > 0 ? (
          <div className="audit-log__list">
            {data.map((entry) => (
              <div key={entry.id} className="audit-log__row">
                <div>
                  <div className="audit-log__line">
                    <span className="audit-log__action">{entry.action}</span>
                    <span className="audit-log__detail">{entry.detail}</span>
                  </div>
                  <div className="audit-log__by">by {entry.actor}</div>
                </div>
                <span className="audit-log__time">{entry.timestamp}</span>
              </div>
            ))}
          </div>
        ) : null}
      </main>
    </Shell>
  );
}
