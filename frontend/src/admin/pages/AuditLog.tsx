import { useQuery } from "@tanstack/react-query";
import { Shell } from "@/admin/components/Shell";
import { EmptyState, ErrorState, LoadingRows } from "@/shared/components/StateViews";
import { Badge } from "@/shared/components/ui/badge";
import { Card, CardContent } from "@/shared/components/ui/card";
import { getAuditLog } from "@/shared/lib/api";
import { usePageTitle } from "@/shared/lib/use-page-title";

export default function AuditLog() {
  usePageTitle("Audit log — Screenwise");
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["audit"],
    queryFn: getAuditLog,
  });

  return (
    <Shell
      allow={["admin"]}
      title="Audit log"
      description="Job creation, uploads, shortlisting, identity reveals and emails."
    >
      {isLoading ? <LoadingRows rows={5} /> : null}
      {isError ? (
        <ErrorState message="We couldn't load the audit log." onRetry={() => refetch()} />
      ) : null}
      {data && data.length === 0 ? (
        <EmptyState title="No activity yet" description="Actions will appear here as your team works." />
      ) : null}
      {data && data.length > 0 ? (
        <Card className="shadow-card">
          <CardContent className="divide-y pt-6">
            {data.map((entry) => (
              <div key={entry.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="font-normal">
                      {entry.action}
                    </Badge>
                    <span className="text-sm">{entry.detail}</span>
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">by {entry.actor}</div>
                </div>
                <span className="num text-xs text-muted-foreground">{entry.timestamp}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}
    </Shell>
  );
}
