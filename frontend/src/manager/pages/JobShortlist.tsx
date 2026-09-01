import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import { Eye, Mail } from "lucide-react";
import { JobTabs } from "@/manager/components/JobTabs";
import { Shell } from "@/manager/components/Shell";
import { scoreBand } from "@/shared/components/ScoreBadge";
import { EmptyState, ErrorState, LoadingRows } from "@/shared/components/StateViews";
import { getJob, getShortlist } from "@/shared/lib/api";
import { usePageTitle } from "@/shared/lib/use-page-title";
import { useWorkspaceBase } from "@/shared/lib/workspace";
import "./JobShortlist.css";

export default function JobShortlist() {
  usePageTitle("Shortlist - Screenwise");
  const { jobId = "" } = useParams();
  const base = useWorkspaceBase();
  const jobQuery = useQuery({ queryKey: ["job", jobId], queryFn: () => getJob(jobId) });
  const query = useQuery({
    queryKey: ["shortlist", jobId],
    queryFn: () => getShortlist(jobId),
  });

  return (
    <Shell allow={["manager"]}>
      <div className="manager-shortlist">
        <div className="manager-shortlist__intro">
          <div>
            <h1 className="manager-shortlist__intro-title">
              {jobQuery.data ? `Shortlist - ${jobQuery.data.title}` : "Shortlist"}
            </h1>
            <p className="manager-shortlist__intro-text">
              Identities are revealed for shortlisted candidates so you can contact them.
            </p>
          </div>
          <Link to={`${base}/${jobId}/email`} className="manager-shortlist__btn">
            <Mail size={16} /> Compose email
          </Link>
        </div>

        <JobTabs jobId={jobId} />

        <div className="manager-shortlist__note">
          <Eye size={16} />
          <p>
            Screening happened blind. Now that these candidates were shortlisted on their
            qualifications, their names and contact details are visible.
          </p>
        </div>

        {query.isLoading ? <LoadingRows rows={3} /> : null}
        {query.isError ? (
          <ErrorState message="We couldn't load the shortlist." onRetry={() => query.refetch()} />
        ) : null}
        {query.data && query.data.length === 0 ? (
          <EmptyState
            title="Nobody shortlisted yet"
            description="Head to the rank board and shortlist the candidates you want to talk to."
            action={
              <Link to={`${base}/${jobId}/board`} className="manager-shortlist__btn">
                Open rank board
              </Link>
            }
          />
        ) : null}

        <div className="manager-shortlist__list">
          {query.data?.map(({ app, candidate }) => (
            <div key={app.id} className="manager-shortlist__card">
              <span
                className={`manager-shortlist__score manager-shortlist__score--${scoreBand(
                  app.score,
                )}`}
              >
                {app.score}%
              </span>
              <div className="manager-shortlist__body">
                <div className="manager-shortlist__name-row">
                  <span className="manager-shortlist__name">{candidate?.name ?? app.alias}</span>
                  <span className="manager-shortlist__source">{app.source}</span>
                </div>
                <div className="manager-shortlist__contact">
                  {candidate?.email} · {candidate?.phone}
                </div>
                <div className="manager-shortlist__facts">
                  {app.currentTitle} ·{" "}
                  <span className="manager-shortlist__num">{app.yearsExperience}</span> yrs ·{" "}
                  {app.educationLevel}
                </div>
                <div className="manager-shortlist__skills">
                  {app.matchedSkills.map((s) => (
                    <span key={s} className="manager-shortlist__skill">
                      {s}
                    </span>
                  ))}
                </div>
              </div>
              <Link
                to={`${base}/${jobId}/email`}
                className="manager-shortlist__btn manager-shortlist__btn--ghost"
              >
                Message
              </Link>
            </div>
          ))}
        </div>
      </div>
    </Shell>
  );
}
