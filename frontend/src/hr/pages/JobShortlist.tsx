import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import { Eye, FileText, Mail } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { JobTabs } from "@/hr/components/JobTabs";
import { scoreBand } from "@/shared/components/ScoreBadge";
import { EmptyState, ErrorState, LoadingRows } from "@/shared/components/StateViews";
import { Shell } from "@/hr/components/Shell";
import { fetchApplicationCv, getJob, getShortlist } from "@/shared/lib/api";
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

  const [opening, setOpening] = useState<string | null>(null);

  /**
   * The CV is served as bytes behind the JWT, so it can't be a plain link:
   * fetch it, hand the tab an object URL, and release it once the viewer has
   * had time to load.
   */
  const openCv = async (applicationId: string) => {
    setOpening(applicationId);
    try {
      const url = await fetchApplicationCv(applicationId);
      window.open(url, "_blank", "noopener");
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "We couldn't open that CV.");
    } finally {
      setOpening(null);
    }
  };

  return (
    <Shell allow={["hr", "manager"]}>
      <div className="hr-shortlist">
        <div className="hr-shortlist__intro">
          <div>
            <h1 className="hr-shortlist__intro-title">
              {jobQuery.data ? `Shortlist - ${jobQuery.data.title}` : "Shortlist"}
            </h1>
            <p className="hr-shortlist__intro-text">
              Identities are revealed for shortlisted candidates so you can contact them.
            </p>
          </div>
          <Link to={`${base}/${jobId}/email`} className="hr-shortlist__btn">
            <Mail size={16} /> Compose email
          </Link>
        </div>

        <JobTabs jobId={jobId} />

        <div className="hr-shortlist__note">
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
              <Link to={`${base}/${jobId}/board`} className="hr-shortlist__btn">
                Open rank board
              </Link>
            }
          />
        ) : null}

        <div className="hr-shortlist__list">
          {query.data?.map(({ app, candidate }) => (
            <div key={app.id} className="hr-shortlist__card">
              <span
                className={`hr-shortlist__score hr-shortlist__score--${scoreBand(app.score)}`}
              >
                {app.score}%
              </span>
              <div className="hr-shortlist__body">
                <div className="hr-shortlist__name-row">
                  <span className="hr-shortlist__name">{candidate?.name ?? app.alias}</span>
                  <span className="hr-shortlist__source">{app.source}</span>
                </div>
                <div className="hr-shortlist__contact">
                  {candidate?.email} · {candidate?.phone}
                </div>
                <div className="hr-shortlist__facts">
                  {app.currentTitle} · <span className="hr-shortlist__num">{app.yearsExperience}</span>{" "}
                  yrs · {app.educationLevel}
                </div>
                <div className="hr-shortlist__skills">
                  {app.matchedSkills.map((s) => (
                    <span key={s} className="hr-shortlist__skill">
                      {s}
                    </span>
                  ))}
                </div>
              </div>
              <div className="hr-shortlist__actions">
                {candidate?.cvAvailable ? (
                  <button
                    type="button"
                    className="hr-shortlist__btn hr-shortlist__btn--ghost"
                    onClick={() => openCv(app.id)}
                    disabled={opening === app.id}
                    title={candidate.cvFileName || "Open the full CV"}
                  >
                    <FileText size={16} />
                    {opening === app.id ? "Opening…" : "View CV"}
                  </button>
                ) : null}
                <Link
                  to={`${base}/${jobId}/email`}
                  className="hr-shortlist__btn hr-shortlist__btn--ghost"
                >
                  Message
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </Shell>
  );
}
