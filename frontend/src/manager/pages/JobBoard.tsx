import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams } from "react-router-dom";
import { AlertTriangle, ChevronDown, Copy, EyeOff, Info, Lock } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Shell } from "@/manager/components/Shell";
import { JobTabs } from "@/manager/components/JobTabs";
import { ScoreExplainDrawer } from "@/manager/components/ScoreExplainDrawer";
import { scoreBand } from "@/shared/components/ScoreBadge";
import { EmptyState, ErrorState, LoadingRows } from "@/shared/components/StateViews";
import { getApplicationsForJob, getJob, shortlistCandidate } from "@/shared/lib/api";
import { canViewBoard, useAuth } from "@/shared/lib/auth";
import { SCORE_THRESHOLD, type Application, type Job } from "@/shared/lib/types";
import { usePageTitle } from "@/shared/lib/use-page-title";
import { useManagerAccess } from "@/manager/lib/access";
import "./JobBoard.css";

/** Options for the "Source" filter dropdown. */
const SOURCE_OPTIONS = [
  { value: "all", label: "All sources" },
  { value: "self-applied", label: "Self-applied" },
  { value: "HR-uploaded", label: "HR-uploaded" },
] as const;

/** Options for the "Sort by" dropdown. */
const SORT_OPTIONS = [
  { value: "score", label: "Match score" },
  { value: "experience", label: "Years of experience" },
  { value: "date", label: "Date applied" },
] as const;

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

export default function JobBoard() {
  usePageTitle("Rank board - Screenwise");
  const { jobId = "" } = useParams();
  const { user } = useAuth();
  const { locked } = useManagerAccess();
  const queryClient = useQueryClient();

  const jobQuery = useQuery({ queryKey: ["job", jobId], queryFn: () => getJob(jobId) });
  const canView = canViewBoard(user, jobQuery.data?.companyId ?? "");
  const appsQuery = useQuery({
    queryKey: ["applications", jobId],
    queryFn: () => getApplicationsForJob(jobId),
    enabled: Boolean(jobQuery.data) && canView,
  });

  const [minScore, setMinScore] = useState(0);
  const [source, setSource] = useState("all");
  const [skill, setSkill] = useState("");
  const [sort, setSort] = useState("score");
  const [showBelow, setShowBelow] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [drawerApp, setDrawerApp] = useState<Application | null>(null);

  const job = jobQuery.data;
  const apps = appsQuery.data ?? [];

  const filtered = useMemo(() => {
    const list = apps.filter((a) => {
      if (a.score < minScore) return false;
      if (source !== "all" && a.source !== source) return false;
      if (skill && !a.matchedSkills.some((s) => s.toLowerCase().includes(skill.toLowerCase())))
        return false;
      return true;
    });
    return list.sort((a, b) => {
      if (sort === "experience") return b.yearsExperience - a.yearsExperience;
      if (sort === "date") return b.appliedAt.localeCompare(a.appliedAt);
      return b.score - a.score;
    });
  }, [apps, minScore, source, skill, sort]);

  const above = filtered.filter((a) => a.score >= SCORE_THRESHOLD || a.needsManualReview);
  const below = filtered.filter((a) => a.score < SCORE_THRESHOLD && !a.needsManualReview);

  const toggle = (id: string) =>
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const shortlist = async (ids: string[]) => {
    if (!ids.length) return;
    await shortlistCandidate(ids);
    await queryClient.invalidateQueries({ queryKey: ["applications", jobId] });
    setSelected([]);
    toast.success(
      `${ids.length} candidate${ids.length > 1 ? "s" : ""} shortlisted. Identities are now visible on the shortlist page.`,
    );
  };

  const denied = job && !canView;

  return (
    <Shell allow={["manager"]}>
      <div className="manager-board">
        <div className="manager-board__intro">
          <h1 className="manager-board__intro-title">{job ? job.title : "Rank board"}</h1>
          <p className="manager-board__intro-text">
            Screening is blind: identity stays hidden until you shortlist.
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

            <div className="manager-board__filters">
              <div className="manager-board__filter">
                <span className="manager-board__filter-label">
                  Minimum score: <span className="manager-board__num">{minScore}%</span>
                </span>
                <input
                  type="range"
                  className="manager-board__range"
                  value={minScore}
                  max={100}
                  step={5}
                  onChange={(e) => setMinScore(Number(e.target.value))}
                />
              </div>
              <div className="manager-board__filter">
                <span className="manager-board__filter-label">Source</span>
                <select
                  className="manager-board__select"
                  value={source}
                  onChange={(e) => setSource(e.target.value)}
                >
                  {SOURCE_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="manager-board__filter">
                <label className="manager-board__filter-label" htmlFor="skill">
                  Skill
                </label>
                <input
                  id="skill"
                  className="manager-board__input"
                  value={skill}
                  onChange={(e) => setSkill(e.target.value)}
                  placeholder="e.g. Docker"
                />
              </div>
              <div className="manager-board__filter">
                <span className="manager-board__filter-label">Sort by</span>
                <select
                  className="manager-board__select"
                  value={sort}
                  onChange={(e) => setSort(e.target.value)}
                >
                  {SORT_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {selected.length > 0 ? (
              <div className="manager-board__bulkbar">
                <span className="manager-board__bulkbar-count">{selected.length} selected</span>
                <div className="manager-board__bulkbar-actions">
                  <button
                    type="button"
                    className="manager-board__btn manager-board__btn--ghost"
                    onClick={() => setSelected([])}
                  >
                    Clear
                  </button>
                  <button
                    type="button"
                    className="manager-board__btn"
                    onClick={() => shortlist(selected)}
                    disabled={locked}
                    title={locked ? "Activate a plan to shortlist" : undefined}
                  >
                    Shortlist selected
                  </button>
                </div>
              </div>
            ) : (
              <div className="manager-board__hintbar">
                <p className="manager-board__hintbar-text">
                  <EyeOff size={16} /> Names, photos, age, address, nationality and university are
                  hidden while screening.
                </p>
                <button
                  type="button"
                  className="manager-board__btn manager-board__btn--ghost"
                  onClick={() => shortlist(above.slice(0, 20).map((a) => a.id))}
                  disabled={locked}
                  title={locked ? "Activate a plan to shortlist" : undefined}
                >
                  Shortlist top 20
                </button>
              </div>
            )}

            {above.length === 0 && below.length === 0 ? (
              <EmptyState
                title="No candidates match these filters"
                description="Loosen the minimum score or clear the skill filter - nobody has been removed from the board."
              />
            ) : null}

            <div className="manager-board__rows">
              {above.map((app, i) => (
                <CandidateRow
                  key={app.id}
                  app={app}
                  job={job}
                  rank={i + 1}
                  selected={selected.includes(app.id)}
                  onToggle={() => toggle(app.id)}
                  onExplain={() => setDrawerApp(app)}
                  onShortlist={() => shortlist([app.id])}
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
                      removed - you can shortlist any of them.
                    </p>
                    {below.map((app, i) => (
                      <CandidateRow
                        key={app.id}
                        app={app}
                        job={job}
                        rank={above.length + i + 1}
                        selected={selected.includes(app.id)}
                        onToggle={() => toggle(app.id)}
                        onExplain={() => setDrawerApp(app)}
                        onShortlist={() => shortlist([app.id])}
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
  selected,
  onToggle,
  onExplain,
  onShortlist,
}: {
  app: Application;
  job: Job;
  rank: number;
  selected: boolean;
  onToggle: () => void;
  onExplain: () => void;
  onShortlist: () => void;
}) {
  const { locked } = useManagerAccess();
  return (
    <div className="manager-board__row">
      <input
        type="checkbox"
        className="manager-board__row-check"
        checked={selected}
        onChange={onToggle}
        aria-label={`Select ${app.alias}`}
      />
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
        <button
          type="button"
          className="manager-board__btn"
          onClick={onShortlist}
          disabled={app.status === "shortlisted" || locked}
          title={locked ? "Activate a plan to shortlist" : undefined}
        >
          {app.status === "shortlisted" ? "On shortlist" : "Shortlist"}
        </button>
      </div>
    </div>
  );
}
