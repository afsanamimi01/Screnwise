import { useQuery } from "@tanstack/react-query";
import { Check } from "lucide-react";
import { Shell } from "@/candidate/components/Shell";
import { EmptyState, ErrorState, LoadingRows } from "@/shared/components/StateViews";
import { getMyApplications } from "@/shared/lib/api";
import { useAuth } from "@/shared/lib/auth";
import { STATUS_PIPELINE, normalizeStatus } from "@/shared/lib/types";
import { usePageTitle } from "@/shared/lib/use-page-title";
import "./MyApplications.css";

export default function MyApplications() {
  usePageTitle("My applications");
  const { user } = useAuth();
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["my-apps", user?.id],
    enabled: Boolean(user),
    queryFn: () => getMyApplications(),
  });

  return (
    <Shell allow={["candidate"]}>
      <main className="my-applications">
        <div className="my-applications__intro">
          <h1 className="my-applications__intro-title">My applications</h1>
          <p className="my-applications__intro-text">
            You'll see your stage here. Scores and other candidates stay private.
          </p>
        </div>

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

        <div className="my-applications__list">
          {data?.map(({ app, job }) => {
          const status = normalizeStatus(app.status);
          const rejected = status === "rejected";
          const currentIndex = STATUS_PIPELINE.indexOf(status);
          return (
            <article key={app.id} className="my-applications__card">
              <div className="my-applications__head">
                <div>
                  <div className="my-applications__role">{job?.title ?? "Role"}</div>
                  <div className="my-applications__meta">
                    {job?.department ? `${job.department} · ` : ""}applied {app.appliedAt}
                  </div>
                </div>
                <span
                  className={
                    "my-applications__status" +
                    (rejected ? " my-applications__status--rejected" : "")
                  }
                >
                  {status}
                </span>
              </div>

              {/* Progress tracker — stages come from STATUS_PIPELINE, so reordering
                  that array reorders the tracker. */}
              <ol className="my-applications__pipeline">
                {STATUS_PIPELINE.map((stage, i) => {
                  const reached = !rejected && i <= currentIndex;
                  return (
                    <li key={stage} className="my-applications__step">
                      <span
                        className={
                          "my-applications__step-dot" +
                          (reached ? " my-applications__step-dot--done" : "")
                        }
                      >
                        {reached ? <Check size={12} /> : i + 1}
                      </span>
                      <span
                        className={
                          "my-applications__step-label" +
                          (reached ? " my-applications__step-label--done" : "")
                        }
                      >
                        {stage}
                      </span>
                      {i < STATUS_PIPELINE.length - 1 ? (
                        <span className="my-applications__step-bar" />
                      ) : null}
                    </li>
                  );
                })}
              </ol>
            </article>
          );
        })}
        </div>
      </main>
    </Shell>
  );
}
