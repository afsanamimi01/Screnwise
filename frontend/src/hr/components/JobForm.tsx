import { useNavigate } from "react-router-dom";
import { Info } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { TagInput } from "@/shared/components/TagInput";
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/components/ui/card";
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
import { Switch } from "@/shared/components/ui/switch";
import { Textarea } from "@/shared/components/ui/textarea";
import { createJob, updateJob } from "@/shared/lib/api";
import { useAuth } from "@/shared/lib/auth";
import { DEFAULT_WEIGHTS, type Job, type ScoringWeights } from "@/shared/lib/types";

/** Labels for the scoring-weight sliders. Reorder to reorder the sliders. */
const weightLabels: Record<keyof ScoringWeights, string> = {
  skills: "Skills match",
  experience: "Experience",
  education: "Education",
  certifications: "Certifications",
  keywords: "Keyword match",
};

/** Options for the "Employment type" select. */
const EMPLOYMENT_TYPES = ["Full-time", "Part-time", "Contract", "Internship"] as const;

/** Options for the "Required education level" select. */
const EDUCATION_LEVELS = [
  "Any",
  "High school",
  "Bachelor's degree",
  "Master's degree",
  "PhD",
] as const;

export function emptyJob(userId: string): Job {
  return {
    id: `job-${Date.now()}`,
    title: "",
    department: "",
    location: "",
    employmentType: "Full-time",
    description: "",
    requiredSkills: [],
    niceToHaveSkills: [],
    minYears: 3,
    educationLevel: "Bachelor's degree",
    certifications: [],
    hardFilters: { workPermitRequired: false, minYears: 0, mustHaveSkills: [] },
    weights: { ...DEFAULT_WEIGHTS },
    publicApplyEnabled: true,
    status: "open",
    createdAt: new Date().toISOString().slice(0, 10),
    createdBy: userId,
    managerIds: [],
    newSinceLastVisit: 0,
  };
}

export function JobForm({ initial, mode }: { initial: Job; mode: "create" | "edit" }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [job, setJob] = useState<Job>(initial);
  const [saving, setSaving] = useState(false);

  const set = <K extends keyof Job>(key: K, value: Job[K]) =>
    setJob((prev) => ({ ...prev, [key]: value }));

  const weightTotal = Object.values(job.weights).reduce((a, b) => a + b, 0);

  const submit = async () => {
    if (!job.title.trim()) {
      toast.error("Give the job a title first.");
      return;
    }
    if (weightTotal !== 100) {
      toast.error("Scoring weights must add up to 100% before saving.");
      return;
    }

    setSaving(true);
    try {
      if (mode === "create") await createJob(job);
      else await updateJob(job);
      toast.success(mode === "create" ? "Job posted." : "Job updated.");
      navigate("/jobs");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save the job.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <div className="space-y-6 lg:col-span-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Role details</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Label htmlFor="title">Job title</Label>
              <Input
                id="title"
                value={job.title}
                onChange={(e) => set("title", e.target.value)}
                placeholder="Senior backend engineer"
                className="mt-1.5"
              />
            </div>
            <div>
              <Label htmlFor="department">Department</Label>
              <Input
                id="department"
                value={job.department}
                onChange={(e) => set("department", e.target.value)}
                className="mt-1.5"
              />
            </div>
            <div>
              <Label htmlFor="location">Location</Label>
              <Input
                id="location"
                value={job.location}
                onChange={(e) => set("location", e.target.value)}
                className="mt-1.5"
              />
            </div>
            <div>
              <Label htmlFor="type">Employment type</Label>
              <Select
                value={job.employmentType}
                onValueChange={(v) => set("employmentType", v)}
              >
                <SelectTrigger id="type" className="mt-1.5">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {EMPLOYMENT_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="education">Required education level</Label>
              <Select value={job.educationLevel} onValueChange={(v) => set("educationLevel", v)}>
                <SelectTrigger id="education" className="mt-1.5">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {EDUCATION_LEVELS.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={job.description}
                onChange={(e) => set("description", e.target.value)}
                rows={7}
                className="mt-1.5"
                placeholder="What the role involves, who they'll work with, what success looks like."
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Skills and requirements</CardTitle>
            <CardDescription>
              These feed the score. Nothing here removes a candidate on its own.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label>Required skills</Label>
              <div className="mt-1.5">
                <TagInput
                  value={job.requiredSkills}
                  onChange={(v) => set("requiredSkills", v)}
                  placeholder="Add a skill and press enter"
                />
              </div>
            </div>
            <div>
              <Label>Nice-to-have skills</Label>
              <div className="mt-1.5">
                <TagInput
                  value={job.niceToHaveSkills}
                  onChange={(v) => set("niceToHaveSkills", v)}
                  placeholder="Add a skill and press enter"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="minYears">Minimum years of experience</Label>
              <Input
                id="minYears"
                type="number"
                min={0}
                value={job.minYears}
                onChange={(e) => set("minYears", Number(e.target.value))}
                className="num mt-1.5"
              />
            </div>
            <div>
              <Label>Certifications</Label>
              <div className="mt-1.5">
                <TagInput
                  value={job.certifications}
                  onChange={(v) => set("certifications", v)}
                  placeholder="e.g. AWS Solutions Architect"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-destructive/30">
          <CardHeader>
            <CardTitle className="text-base">Hard filters — pass/fail gates</CardTitle>
            <CardDescription>
              These remove a candidate from consideration. Use them sparingly: unlike scoring
              weights, they are not a spectrum.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 rounded-b-xl bg-danger-soft/40 pt-6">
            <label className="flex items-start gap-3 text-sm">
              <Checkbox
                checked={job.hardFilters.workPermitRequired}
                onCheckedChange={(c) =>
                  set("hardFilters", { ...job.hardFilters, workPermitRequired: Boolean(c) })
                }
              />
              <span>
                Must hold a valid work permit for {job.location || "this location"}
              </span>
            </label>
            <div className="max-w-xs">
              <Label htmlFor="gateYears">Absolute minimum years of experience</Label>
              <Input
                id="gateYears"
                type="number"
                min={0}
                value={job.hardFilters.minYears}
                onChange={(e) =>
                  set("hardFilters", { ...job.hardFilters, minYears: Number(e.target.value) })
                }
                className="num mt-1.5"
              />
            </div>
            <div>
              <Label>Must-have skills</Label>
              <div className="mt-1.5">
                <TagInput
                  value={job.hardFilters.mustHaveSkills}
                  onChange={(v) => set("hardFilters", { ...job.hardFilters, mustHaveSkills: v })}
                  placeholder="A skill the candidate cannot be without"
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Scoring weights</CardTitle>
            <CardDescription>
              How much each dimension counts when ranking the candidates who pass the hard filters.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            {(Object.keys(weightLabels) as (keyof ScoringWeights)[]).map((key) => (
              <div key={key}>
                <div className="flex items-baseline justify-between text-sm">
                  <Label>{weightLabels[key]}</Label>
                  <span className="num text-muted-foreground">{job.weights[key]}%</span>
                </div>
                <Slider
                  className="mt-2"
                  value={[job.weights[key]]}
                  min={0}
                  max={100}
                  step={5}
                  onValueChange={([v]) =>
                    set("weights", { ...job.weights, [key]: v ?? 0 })
                  }
                />
              </div>
            ))}
            <div
              className={`num rounded-lg px-3 py-2 text-sm ${
                weightTotal === 100
                  ? "bg-success-soft text-success"
                  : "bg-warning-soft text-warning-foreground"
              }`}
            >
              Total: {weightTotal}% {weightTotal === 100 ? "— ready" : "— must equal 100%"}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Public application page</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between gap-4">
              <span className="text-sm">Let candidates apply themselves</span>
              <Switch
                checked={job.publicApplyEnabled}
                onCheckedChange={(v) => set("publicApplyEnabled", v)}
              />
            </div>
            <p className="flex gap-2 text-xs text-muted-foreground">
              <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              Self-applied and HR-uploaded candidates land on the same rank board and are treated
              identically apart from their source tag.
            </p>
          </CardContent>
        </Card>

        <div className="flex gap-2">
          <Button onClick={submit} disabled={saving} className="flex-1">
            {saving ? "Saving…" : mode === "create" ? "Post job" : "Save changes"}
          </Button>
          <Button variant="outline" onClick={() => navigate("/jobs")}>
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
}
