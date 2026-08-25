import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Check } from "lucide-react";
import { CandidateLayout } from "@/candidate/components/CandidateLayout";
import { EmptyState, ErrorState, LoadingRows } from "@/shared/components/StateViews";
import { Badge } from "@/shared/components/ui/badge";
import { Card, CardContent } from "@/shared/components/ui/card";
import { getApplicationsForCandidate } from "@/shared/lib/api";
import { useAuth } from "@/shared/lib/auth";
import { STATUS_PIPELINE } from "@/shared/lib/types";
import "./MyApplications.css";

export function MyApplications() {
  useEffect(() => {
    document.title = "My applications — Screenwise";
  }, []);

  const { user } = useAuth();
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["my-apps", user?.id],
    enabled: Boolean(user),
    queryFn: () => getApplicationsForCandidate(),
  });

  return (
    <CandidateLayout
      title="My applications"
      description="You'll see your stage here. Scores and other candidates stay private."
    >
      {isLoading ? <LoadingRows rows={2} /> : null}
      {isError ? <ErrorState message="We couldn't load your applications." onRetry={() => refetch()} /> : null}
      {data && data.length === 0 ? (
        <EmptyState title="No applications yet" description="Once you apply to a role it shows up here." />
      ) : null}

      <div className="my-applications__list">
        {data?.map(({ app, job }) => {
          const rejected = app.status === "rejected";
          const currentIndex = STATUS_PIPELINE.indexOf(app.status);
          return (
            <Card key={app.id} className="my-applications__card">
              <CardContent className="my-applications__card-content">
                <div className="my-applications__card-header">
                  <div>
                    <div className="my-applications__job-title">{job?.title ?? "Role"}</div>
                    <div className="my-applications__job-meta">
                      {job?.department} · applied {app.appliedAt}
                    </div>
                  </div>
                  <Badge
                    className={
                      rejected
                        ? "my-applications__status-badge my-applications__status-badge--rejected"
                        : "my-applications__status-badge my-applications__status-badge--active"
                    }
                  >
                    {app.status}
                  </Badge>
                </div>

                <ol className="my-applications__pipeline">
                  {STATUS_PIPELINE.map((stage, i) => {
                    const reached = !rejected && i <= currentIndex;
                    return (
                      <li key={stage} className="my-applications__pipeline-step">
                        <span
                          className={
                            reached
                              ? "my-applications__pipeline-dot my-applications__pipeline-dot--reached"
                              : "my-applications__pipeline-dot my-applications__pipeline-dot--pending"
                          }
                        >
                          {reached ? <Check className="my-applications__pipeline-check" /> : i + 1}
                        </span>
                        <span
                          className={
                            reached
                              ? "my-applications__pipeline-label my-applications__pipeline-label--reached"
                              : "my-applications__pipeline-label my-applications__pipeline-label--pending"
                          }
                        >
                          {stage}
                        </span>
                        {i < STATUS_PIPELINE.length - 1 ? (
                          <span className="my-applications__pipeline-connector" />
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
    </CandidateLayout>
  );
}
