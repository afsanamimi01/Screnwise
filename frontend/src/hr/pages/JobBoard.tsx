import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams } from "react-router-dom";
import { AlertTriangle, ChevronDown, Copy, EyeOff, Info, Lock } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { HrShell } from "@/hr/components/HrShell";
import { JobTabs } from "@/hr/components/JobTabs";
import { ScoreBadge } from "@/shared/components/ScoreBadge";
import { ScoreExplainDrawer } from "@/hr/components/ScoreExplainDrawer";
import { EmptyState, ErrorState, LoadingRows } from "@/shared/components/StateViews";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
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
import { getApplicationsForJob, getJob, shortlistCandidate } from "@/shared/lib/api";
import { canViewBoard, useAuth } from "@/shared/lib/auth";
import { SCORE_THRESHOLD, type Application, type Job } from "@/shared/lib/types";
import { usePageTitle } from "@/shared/lib/use-page-title";

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
  usePageTitle("Rank board — Screenwise");
  const { jobId = "" } = useParams();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const jobQuery = useQuery({ queryKey: ["job", jobId], queryFn: () => getJob(jobId) });
  const canView = canViewBoard(user, jobQuery.data?.createdBy ?? "");
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
    <HrShell
      allow={["hr", "admin"]}
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
        <Card className="shadow-card">
          <CardContent className="flex flex-col items-center gap-3 py-14 text-center">
            <Lock className="h-6 w-6 text-muted-foreground" />
            <h3 className="text-base font-semibold">This board isn't yours</h3>
            <p className="max-w-sm text-sm text-muted-foreground">
              A job's rank board is visible only to the recruiter who created it, and to admins.
            </p>
          </CardContent>
        </Card>
      ) : null}

      {job && !denied ? (
        <div className="space-y-5">
          <SummaryStrip apps={apps} />

          <Card className="shadow-card">
            <CardContent className="grid gap-4 pt-6 md:grid-cols-4">
              <div>
                <Label className="text-xs">
                  Minimum score: <span className="num">{minScore}%</span>
                </Label>
                <Slider
                  className="mt-3"
                  value={[minScore]}
                  max={100}
                  step={5}
                  onValueChange={([v]) => setMinScore(v ?? 0)}
                />
              </div>
              <div>
                <Label className="text-xs">Source</Label>
                <Select value={source} onValueChange={setSource}>
                  <SelectTrigger className="mt-1.5">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SOURCE_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs" htmlFor="skill">
                  Skill
                </Label>
                <Input
                  id="skill"
                  value={skill}
                  onChange={(e) => setSkill(e.target.value)}
                  placeholder="e.g. Docker"
                  className="mt-1.5"
                />
              </div>
              <div>
                <Label className="text-xs">Sort by</Label>
                <Select value={sort} onValueChange={setSort}>
                  <SelectTrigger className="mt-1.5">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SORT_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {selected.length > 0 ? (
            <div className="sticky top-16 z-10 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-primary/30 bg-primary-soft px-4 py-3">
              <span className="text-sm font-medium text-primary">{selected.length} selected</span>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={() => setSelected([])}>
                  Clear
                </Button>
                <Button size="sm" onClick={() => shortlist(selected)}>
                  Shortlist selected
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="flex items-center gap-2 text-sm text-muted-foreground">
                <EyeOff className="h-4 w-4" /> Names, photos, age, address, nationality and
                university are hidden while screening.
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => shortlist(above.slice(0, 20).map((a) => a.id))}
              >
                Shortlist top 20
              </Button>
            </div>
          )}

          {above.length === 0 && below.length === 0 ? (
            <EmptyState
              title="No candidates match these filters"
              description="Loosen the minimum score or clear the skill filter — nobody has been removed from the board."
            />
          ) : null}

          <div className="space-y-2">
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
            <div className="rounded-xl border bg-card">
              <button
                onClick={() => setShowBelow((s) => !s)}
                className="flex w-full items-center justify-between gap-3 px-4 py-3 text-sm"
              >
                <span className="flex items-center gap-2">
                  <Info className="h-4 w-4 text-muted-foreground" />
                  {showBelow ? "Hide" : "Show"} below-threshold candidates
                  <Badge variant="secondary" className="num font-normal">
                    {below.length}
                  </Badge>
                </span>
                <ChevronDown
                  className={`h-4 w-4 transition-transform ${showBelow ? "rotate-180" : ""}`}
                />
              </button>
              {showBelow ? (
                <div className="space-y-2 border-t p-3">
                  <p className="px-1 pb-1 text-xs text-muted-foreground">
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
    </HrShell>
  );
}

function SummaryStrip({ apps }: { apps: Application[] }) {
  return (
    <div className="grid gap-3 sm:grid-cols-4">
      {SUMMARY_TILES.map((tile) => (
        <div key={tile.key} className="rounded-xl border bg-card px-4 py-3">
          <div className="num text-xl font-semibold">{tile.value(apps)}</div>
          <div className="text-xs text-muted-foreground">{tile.label}</div>
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
    <div className="flex flex-wrap items-center gap-4 rounded-xl border bg-card p-4 shadow-card transition-colors hover:border-primary/30">
      <Checkbox checked={selected} onCheckedChange={onToggle} aria-label={`Select ${app.alias}`} />
      <span className="num w-6 text-sm text-muted-foreground">{rank}</span>
      {app.needsManualReview ? (
        <span className="num inline-flex min-w-14 items-center justify-center rounded-lg border border-warning/40 bg-warning-soft px-2.5 py-1 text-xs font-semibold text-warning-foreground">
          n/a
        </span>
      ) : (
        <ScoreBadge score={app.score} />
      )}

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-medium">{app.alias}</span>
          <Badge variant="outline" className="font-normal text-muted-foreground">
            {app.source}
          </Badge>
          {app.needsManualReview ? (
            <Badge className="gap-1 bg-warning-soft font-normal text-warning-foreground">
              <AlertTriangle className="h-3 w-3" /> Needs manual review
            </Badge>
          ) : null}
          {app.duplicateOf ? (
            <Badge variant="secondary" className="gap-1 font-normal">
              <Copy className="h-3 w-3" /> Possible duplicate
            </Badge>
          ) : null}
          {app.status === "shortlisted" ? (
            <Badge className="bg-success-soft font-normal text-success">Shortlisted</Badge>
          ) : null}
        </div>
        <div className="mt-1 text-sm text-muted-foreground">
          {app.currentTitle} · <span className="num">{app.yearsExperience}</span> yrs experience ·{" "}
          <span className="num">{app.matchedSkills.length}</span>/
          <span className="num">{job.requiredSkills.length}</span> required skills
        </div>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {app.matchedSkills.slice(0, 5).map((s) => (
            <Badge key={s} variant="secondary" className="font-normal">
              {s}
            </Badge>
          ))}
        </div>
      </div>

      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={onExplain}>
          Why this score
        </Button>
        <Button size="sm" onClick={onShortlist} disabled={app.status === "shortlisted"}>
          {app.status === "shortlisted" ? "On shortlist" : "Shortlist"}
        </Button>
      </div>
    </div>
  );
}
