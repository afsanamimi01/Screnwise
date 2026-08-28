import { useQuery } from "@tanstack/react-query";
import { Check } from "lucide-react";
import { CandidateShell } from "@/candidate/components/CandidateShell";
import { EmptyState, ErrorState, LoadingRows } from "@/shared/components/StateViews";
import { Badge } from "@/shared/components/ui/badge";
import { Card, CardContent } from "@/shared/components/ui/card";
import { getMyApplications } from "@/shared/lib/api";
import { useAuth } from "@/shared/lib/auth";
import { STATUS_PIPELINE } from "@/shared/lib/types";
import { usePageTitle } from "@/shared/lib/use-page-title";

export default function MyApplications() {
  usePageTitle("My applications — Screenwise");
  const { user } = useAuth();
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["my-apps", user?.id],
    enabled: Boolean(user),
    queryFn: () => getMyApplications(),
  });

  return (
    <CandidateShell
      allow={["candidate"]}
      title="My applications"
      description="You'll see your stage here. Scores and other candidates stay private."
    >
      {isLoading ? <LoadingRows rows={2} /> : null}
      {isError ? (
        <ErrorState message="We couldn't load your applications." onRetry={() => refetch()} />
      ) : null}
      {data && data.length === 0 ? (
        <EmptyState
          title="No applications yet"
          description="Once you apply to a role it shows up here."
        />
      ) : null}

      <div className="space-y-4">
        {data?.map(({ app, job }) => {
          const rejected = app.status === "rejected";
          const currentIndex = STATUS_PIPELINE.indexOf(app.status);
          return (
            <Card key={app.id} className="shadow-card">
              <CardContent className="pt-6">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="font-medium">{job?.title ?? "Role"}</div>
                    <div className="text-sm text-muted-foreground">
                      {job?.department} · applied {app.appliedAt}
                    </div>
                  </div>
                  <Badge
                    className={
                      rejected
                        ? "bg-danger-soft font-normal text-destructive"
                        : "bg-primary-soft font-normal text-primary"
                    }
                  >
                    {app.status}
                  </Badge>
                </div>

                <ol className="mt-6 flex flex-wrap gap-2">
                  {STATUS_PIPELINE.map((stage, i) => {
                    const reached = !rejected && i <= currentIndex;
                    return (
                      <li key={stage} className="flex items-center gap-2">
                        <span
                          className={`flex h-6 w-6 items-center justify-center rounded-full text-xs ${
                            reached
                              ? "bg-success text-success-foreground"
                              : "bg-muted text-muted-foreground"
                          }`}
                        >
                          {reached ? <Check className="h-3 w-3" /> : i + 1}
                        </span>
                        <span
                          className={`text-sm capitalize ${
                            reached ? "font-medium" : "text-muted-foreground"
                          }`}
                        >
                          {stage}
                        </span>
                        {i < STATUS_PIPELINE.length - 1 ? (
                          <span className="mx-1 h-px w-6 bg-border" />
                        ) : null}
                      </li>
                    );
                  })}
                </ol>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </CandidateShell>
  );
}
