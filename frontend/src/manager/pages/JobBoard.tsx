import { useQuery } from "@tanstack/react-query";
import { useParams } from "react-router-dom";
import { AlertTriangle, ChevronDown, Copy, EyeOff, Info, Lock } from "lucide-react";
import { useState } from "react";
import { Shell } from "@/manager/components/Shell";
import { JobTabs } from "@/manager/components/JobTabs";
import { ScoreExplainDrawer } from "@/manager/components/ScoreExplainDrawer";
import { scoreBand } from "@/shared/components/ScoreBadge";
import { EmptyState, ErrorState, LoadingRows } from "@/shared/components/StateViews";
import { getManagerApplicationsForJob, getManagerJob } from "@/shared/lib/api";
import { canViewBoard, useAuth } from "@/shared/lib/auth";
import { SCORE_THRESHOLD, type Application, type Job } from "@/shared/lib/types";
import { usePageTitle } from "@/shared/lib/use-page-title";
import "./JobBoard.css";

/**
 * The four tiles in the summary strip above the board, in display order.
 * `value` receives the loaded applications for this job.
 */
const SUMMARY_TILES: { key: string; label: string; value: (apps: Application[]) => number }[] = [
  { key: "total", label: "Total applicants", value: (apps) => apps.length },
  {
    key: "aboveThreshold",
    label: `Above ${SCORE_THRESHOLD}%`,
    value: (apps) => apps.filter((a) => a.score >= SCORE_THRESHOLD).length,
  },
  {
    key: "shortlisted",
    label: "Shortlisted",
    value: (apps) => apps.filter((a) => a.status === "shortlisted").length,
  },
  {
    key: "needsReview",
    label: "Needs manual review",
    value: (apps) => apps.filter((a) => a.needsManualReview).length,
  },
];

/**
 * A manager's rank board is read-only: shortlisting and un-shortlisting are
 * HR-only actions (see `hr/pages/JobBoard.tsx`), since a manager's job here is
 * to review scores, not to run the pipeline.
 */
export default function JobBoard() {
  usePageTitle("Rank board - Screenwise");
  const { jobId = "" } = useParams();
  const { user } = useAuth();

  const jobQuery = useQuery({ queryKey: ["job", jobId], queryFn: () => getManagerJob(jobId) });
  const canView = canViewBoard(user, jobQuery.data?.companyId ?? "");
  const appsQuery = useQuery({
    queryKey: ["applications", jobId],
    queryFn: () => getManagerApplicationsForJob(jobId),
    enabled: Boolean(jobQuery.data) && canView,
  });

  const [showBelow, setShowBelow] = useState(false);
  const [drawerApp, setDrawerApp] = useState<Application | null>(null);

  const job = jobQuery.data;
  // Already sorted by score, highest first - see SORT_BY in the board controller.
  const apps = appsQuery.data ?? [];

  const above = apps.filter((a) => a.score >= SCORE_THRESHOLD || a.needsManualReview);
  const below = apps.filter((a) => a.score < SCORE_THRESHOLD && !a.needsManualReview);

  const denied = job && !canView;

  return (
    <Shell allow={["manager"]}>
      <div className="manager-board">
        <div className="manager-board__intro">
          <h1 className="manager-board__intro-title">{job ? job.title : "Rank board"}</h1>
          <p className="manager-board__intro-text">
            Screening is blind: identity stays hidden until HR shortlists a candidate.
          </p>
        </div>

        <JobTabs jobId={jobId} />

        {jobQuery.isLoading || appsQuery.isLoading ? <LoadingRows rows={6} /> : null}
        {jobQuery.isError || appsQuery.isError ? (
          <ErrorState
            message="We couldn't load this rank board."
            onRetry={() => {
              jobQuery.refetch();
              appsQuery.refetch();
            }}
          />
        ) : null}

        {denied ? (
          <div className="manager-board__denied">
            <Lock size={24} />
            <h3 className="manager-board__denied-title">This board isn't yours</h3>
            <p className="manager-board__denied-text">
              A job's rank board is visible only to members of the company that owns it.
            </p>
          </div>
        ) : null}

        {job && !denied ? (
          <div className="manager-board__main">
            <div className="manager-board__tiles">
              {SUMMARY_TILES.map((tile) => (
                <div key={tile.key} className="manager-board__tile">
                  <div className="manager-board__tile-value">{tile.value(apps)}</div>
                  <div className="manager-board__tile-label">{tile.label}</div>
                </div>
              ))}
            </div>

            <div className="manager-board__hintbar">
              <p className="manager-board__hintbar-text">
                <EyeOff size={16} /> Names, photos, age, address, nationality and university are
                hidden while screening.
              </p>
            </div>

            {above.length === 0 && below.length === 0 ? (
              <EmptyState
                title="No candidates yet"
                description="Nobody has applied to this job yet."
              />
            ) : null}

            <div className="manager-board__rows">
              {above.map((app, i) => (
                <CandidateRow
                  key={app.id}
                  app={app}
                  job={job}
                  rank={i + 1}
                  onExplain={() => setDrawerApp(app)}
                />
              ))}
            </div>

            {below.length > 0 ? (
              <div className="manager-board__below">
                <button
                  type="button"
                  className="manager-board__below-toggle"
                  onClick={() => setShowBelow((s) => !s)}
                >
                  <span className="manager-board__below-label">
                    <Info size={16} />
                    {showBelow ? "Hide" : "Show"} below-threshold candidates
                    <span className="manager-board__below-count">{below.length}</span>
                  </span>
                  <ChevronDown
                    size={16}
                    className={
                      "manager-board__below-chev" +
                      (showBelow ? " manager-board__below-chev--open" : "")
                    }
                  />
                </button>
                {showBelow ? (
                  <div className="manager-board__below-body">
                    <p className="manager-board__below-note">
                      These candidates scored under {SCORE_THRESHOLD}%. They are collapsed, never
                      removed from the board.
                    </p>
                    {below.map((app, i) => (
                      <CandidateRow
                        key={app.id}
                        app={app}
                        job={job}
                        rank={above.length + i + 1}
                        onExplain={() => setDrawerApp(app)}
                      />
                    ))}
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
        ) : null}

        <ScoreExplainDrawer
          application={drawerApp}
          job={job}
          open={Boolean(drawerApp)}
          onOpenChange={(o) => !o && setDrawerApp(null)}
        />
      </div>
    </Shell>
  );
}

function CandidateRow({
  app,
  job,
  rank,
  onExplain,
}: {
  app: Application;
  job: Job;
  rank: number;
  onExplain: () => void;
}) {
  return (
    <div className="manager-board__row">
      <span className="manager-board__row-rank">{rank}</span>
      {app.needsManualReview ? (
        <span className="manager-board__score manager-board__score--na">n/a</span>
      ) : (
        <span className={`manager-board__score manager-board__score--${scoreBand(app.score)}`}>
          {app.score}%
        </span>
      )}

      <div className="manager-board__row-body">
        <div className="manager-board__row-head">
          <span className="manager-board__row-name">{app.alias}</span>
          <span className="manager-board__chip">{app.source}</span>
          {app.needsManualReview ? (
            <span className="manager-board__chip manager-board__chip--warn">
              <AlertTriangle size={12} /> Needs manual review
            </span>
          ) : null}
          {app.duplicateOf ? (
            <span className="manager-board__chip">
              <Copy size={12} /> Possible duplicate
            </span>
          ) : null}
          {app.status === "shortlisted" ? (
            <span className="manager-board__chip manager-board__chip--ok">Shortlisted</span>
          ) : null}
        </div>
        <div className="manager-board__row-meta">
          {app.currentTitle} · <span className="manager-board__num">{app.yearsExperience}</span> yrs
          experience · <span className="manager-board__num">{app.matchedSkills.length}</span>/
          <span className="manager-board__num">{job.requiredSkills.length}</span> required skills
        </div>
        <div className="manager-board__row-skills">
          {app.matchedSkills.slice(0, 5).map((s) => (
            <span key={s} className="manager-board__skill">
              {s}
            </span>
          ))}
        </div>
      </div>

      <div className="manager-board__row-actions">
        <button
          type="button"
          className="manager-board__btn manager-board__btn--ghost"
          onClick={onExplain}
        >
          Why this score
        </button>
      </div>
    </div>
  );
}
