import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams } from "react-router-dom";
import { AlertTriangle, Copy, EyeOff, Info, Lock } from "lucide-react";
import { toast } from "sonner";
import { HrLayout } from "@/hr/components/HrLayout";
import { JobTabs } from "@/hr/components/JobTabs";
import { ScoreBadge } from "@/hr/components/ScoreBadge";
import { ScoreExplainDrawer } from "@/hr/components/ScoreExplainDrawer";
import { EmptyState, ErrorState, LoadingRows } from "@/shared/components/StateViews";
import { Badge } from "@/shared/components/ui/badge";
import { Card, CardContent } from "@/shared/components/ui/card";
import { Checkbox } from "@/shared/components/ui/checkbox";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import { Slider } from "@/shared/components/ui/slider";
import {
  ClearSelectionButton,
  ShortlistSelectedButton,
  ShortlistTop20Button,
  WhyThisScoreButton,
  ShortlistButton,
  ToggleBelowThresholdButton,
} from "@/hr/components/buttons/Buttons";
import { getApplicationsForJob, getJob, shortlistCandidate } from "@/shared/lib/api";
import { canViewBoard, useAuth } from "@/shared/lib/auth";
import { SCORE_THRESHOLD, type Application, type Job } from "@/shared/lib/types";
import "./JobBoard.css";

export function JobBoard() {
  const { jobId = "" } = useParams<{ jobId: string }>();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  useEffect(() => {
    document.title = "Rank board — Screenwise";
  }, []);

  const jobQuery = useQuery({ queryKey: ["job", jobId], queryFn: () => getJob(jobId) });
  const appsQuery = useQuery({
    queryKey: ["applications", jobId],
    queryFn: () => getApplicationsForJob(jobId),
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
    await shortlistCandidate(ids, user?.name ?? "HR");
    await queryClient.invalidateQueries({ queryKey: ["applications", jobId] });
    setSelected([]);
    toast.success(
      `${ids.length} candidate${ids.length > 1 ? "s" : ""} shortlisted. Identities are now visible on the shortlist page.`,
    );
  };

  const denied = job && !canViewBoard(user, job.createdBy);

  return (
    <HrLayout
      title={job ? job.title : "Rank board"}
      description="Screening is blind: identity stays hidden until you shortlist."
    >
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
        <Card className="job-board__denied-card">
          <CardContent className="job-board__denied-content">
            <Lock className="job-board__denied-icon" />
            <h3 className="job-board__denied-title">This board isn't yours</h3>
            <p className="job-board__denied-text">
              A job's rank board is visible only to the recruiter who created it, and to admins.
            </p>
          </CardContent>
        </Card>
      ) : null}

      {job && !denied ? (
        <div className="job-board">
          <SummaryStrip apps={apps} />

          <Card className="job-board__filters-card">
            <CardContent className="job-board__filters-grid">
              <div>
                <Label className="job-board__filter-label">
                  Minimum score: <span className="job-board__filter-value">{minScore}%</span>
                </Label>
                <Slider
                  className="job-board__filter-slider"
                  value={[minScore]}
                  max={100}
                  step={5}
                  onValueChange={([v]) => setMinScore(v ?? 0)}
                />
              </div>
              <div>
                <Label className="job-board__filter-label">Source</Label>
                <Select value={source} onValueChange={setSource}>
                  <SelectTrigger className="job-board__filter-input">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All sources</SelectItem>
                    <SelectItem value="self-applied">Self-applied</SelectItem>
                    <SelectItem value="HR-uploaded">HR-uploaded</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="job-board__filter-label" htmlFor="skill">
                  Skill
                </Label>
                <Input
                  id="skill"
                  value={skill}
                  onChange={(e) => setSkill(e.target.value)}
                  placeholder="e.g. Docker"
                  className="job-board__filter-input"
                />
              </div>
              <div>
                <Label className="job-board__filter-label">Sort by</Label>
                <Select value={sort} onValueChange={setSort}>
                  <SelectTrigger className="job-board__filter-input">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="score">Match score</SelectItem>
                    <SelectItem value="experience">Years of experience</SelectItem>
                    <SelectItem value="date">Date applied</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {selected.length > 0 ? (
            <div className="job-board__selection-bar">
              <span className="job-board__selection-count">{selected.length} selected</span>
              <div className="job-board__selection-actions">
                <ClearSelectionButton onClick={() => setSelected([])} />
                <ShortlistSelectedButton onClick={() => shortlist(selected)} />
              </div>
            </div>
          ) : (
            <div className="job-board__toolbar">
              <p className="job-board__blind-note">
                <EyeOff className="job-board__blind-note-icon" /> Names, photos, age, address,
                nationality and university are hidden while screening.
              </p>
              <ShortlistTop20Button onClick={() => shortlist(above.slice(0, 20).map((a) => a.id))} />
            </div>
          )}

          {above.length === 0 && below.length === 0 ? (
            <EmptyState
              title="No candidates match these filters"
              description="Loosen the minimum score or clear the skill filter — nobody has been removed from the board."
            />
          ) : null}

          <div className="job-board__rows">
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
            <div className="job-board__below-panel">
              <ToggleBelowThresholdButton
                expanded={showBelow}
                count={below.length}
                onClick={() => setShowBelow((s) => !s)}
              />
              {showBelow ? (
                <div className="job-board__below-list">
                  <p className="job-board__below-note">
                    These candidates scored under {SCORE_THRESHOLD}%. They are collapsed, never
                    removed — you can shortlist any of them.
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
    </HrLayout>
  );
}

function SummaryStrip({ apps }: { apps: Application[] }) {
  const above = apps.filter((a) => a.score >= SCORE_THRESHOLD).length;
  const shortlisted = apps.filter((a) => a.status === "shortlisted").length;
  const review = apps.filter((a) => a.needsManualReview).length;
  const stats = [
    { label: "Total applicants", value: apps.length },
    { label: `Above ${SCORE_THRESHOLD}%`, value: above },
    { label: "Shortlisted", value: shortlisted },
    { label: "Needs manual review", value: review },
  ];
  return (
    <div className="job-board__summary-strip">
      {stats.map((s) => (
        <div key={s.label} className="job-board__summary-stat">
          <div className="job-board__summary-stat-value">{s.value}</div>
          <div className="job-board__summary-stat-label">{s.label}</div>
        </div>
      ))}
    </div>
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
  return (
    <div className="job-board__candidate-row">
      <Checkbox checked={selected} onCheckedChange={onToggle} aria-label={`Select ${app.alias}`} />
      <span className="job-board__candidate-rank">{rank}</span>
      {app.needsManualReview ? (
        <span className="job-board__na-badge">n/a</span>
      ) : (
        <ScoreBadge score={app.score} />
      )}

      <div className="job-board__candidate-main">
        <div className="job-board__candidate-title-line">
          <span className="job-board__candidate-alias">{app.alias}</span>
          <Badge variant="outline" className="job-board__source-badge">
            {app.source}
          </Badge>
          {app.needsManualReview ? (
            <Badge className="job-board__review-badge">
              <AlertTriangle className="job-board__review-badge-icon" /> Needs manual review
            </Badge>
          ) : null}
          {app.duplicateOf ? (
            <Badge variant="secondary" className="job-board__duplicate-badge">
              <Copy className="job-board__duplicate-badge-icon" /> Possible duplicate
            </Badge>
          ) : null}
          {app.status === "shortlisted" ? (
            <Badge className="job-board__shortlisted-badge">Shortlisted</Badge>
          ) : null}
        </div>
        <div className="job-board__candidate-meta">
          {app.currentTitle} · <span className="job-board__numeric">{app.yearsExperience}</span> yrs
          experience · <span className="job-board__numeric">{app.matchedSkills.length}</span>/
          <span className="job-board__numeric">{job.requiredSkills.length}</span> required skills
        </div>
        <div className="job-board__candidate-skills">
          {app.matchedSkills.slice(0, 5).map((s) => (
            <Badge key={s} variant="secondary" className="job-board__skill-badge">
              {s}
            </Badge>
          ))}
        </div>
      </div>

      <div className="job-board__candidate-actions">
        <WhyThisScoreButton onClick={onExplain} />
        <ShortlistButton shortlisted={app.status === "shortlisted"} onClick={onShortlist} />
      </div>
    </div>
  );
}
