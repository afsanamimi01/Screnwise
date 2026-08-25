import { useNavigate } from "react-router-dom";
import { Info } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { TagInput } from "@/shared/components/TagInput";
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
import { JobFormSubmitButton, JobFormCancelButton } from "@/hr/components/buttons/Buttons";
import { createJob, updateJob } from "@/shared/lib/api";
import { useAuth } from "@/shared/lib/auth";
import { DEFAULT_WEIGHTS, type Job, type ScoringWeights } from "@/shared/lib/types";
import "./JobForm.css";

const weightLabels: Record<keyof ScoringWeights, string> = {
  skills: "Skills match",
  experience: "Experience",
  education: "Education",
  certifications: "Certifications",
  keywords: "Keyword match",
};

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
    const actor = user?.name ?? "HR";
    if (mode === "create") await createJob(job, actor);
    else await updateJob(job, actor);
    setSaving(false);
    toast.success(mode === "create" ? "Job posted." : "Job updated.");
    navigate("/jobs");
  };

  return (
    <div className="job-form">
      <div className="job-form__main">
        <Card>
          <CardHeader>
            <CardTitle className="job-form__card-title">Role details</CardTitle>
          </CardHeader>
          <CardContent className="job-form__grid">
            <div className="job-form__field job-form__field--full">
              <Label htmlFor="title">Job title</Label>
              <Input
                id="title"
                value={job.title}
                onChange={(e) => set("title", e.target.value)}
                placeholder="Senior backend engineer"
                className="job-form__input"
              />
            </div>
            <div className="job-form__field">
              <Label htmlFor="department">Department</Label>
              <Input
                id="department"
                value={job.department}
                onChange={(e) => set("department", e.target.value)}
                className="job-form__input"
              />
            </div>
            <div className="job-form__field">
              <Label htmlFor="location">Location</Label>
              <Input
                id="location"
                value={job.location}
                onChange={(e) => set("location", e.target.value)}
                className="job-form__input"
              />
            </div>
            <div className="job-form__field">
              <Label htmlFor="type">Employment type</Label>
              <Select value={job.employmentType} onValueChange={(v) => set("employmentType", v)}>
                <SelectTrigger id="type" className="job-form__input">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {["Full-time", "Part-time", "Contract", "Internship"].map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="job-form__field">
              <Label htmlFor="education">Required education level</Label>
              <Select value={job.educationLevel} onValueChange={(v) => set("educationLevel", v)}>
                <SelectTrigger id="education" className="job-form__input">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {["Any", "High school", "Bachelor's degree", "Master's degree", "PhD"].map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="job-form__field job-form__field--full">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={job.description}
                onChange={(e) => set("description", e.target.value)}
                rows={7}
                className="job-form__input"
                placeholder="What the role involves, who they'll work with, what success looks like."
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="job-form__card-title">Skills and requirements</CardTitle>
            <CardDescription>
              These feed the score. Nothing here removes a candidate on its own.
            </CardDescription>
          </CardHeader>
          <CardContent className="job-form__grid">
            <div className="job-form__field">
              <Label>Required skills</Label>
              <div className="job-form__input">
                <TagInput
                  value={job.requiredSkills}
                  onChange={(v) => set("requiredSkills", v)}
                  placeholder="Add a skill and press enter"
                />
              </div>
            </div>
            <div className="job-form__field">
              <Label>Nice-to-have skills</Label>
              <div className="job-form__input">
                <TagInput
                  value={job.niceToHaveSkills}
                  onChange={(v) => set("niceToHaveSkills", v)}
                  placeholder="Add a skill and press enter"
                />
              </div>
            </div>
            <div className="job-form__field">
              <Label htmlFor="minYears">Minimum years of experience</Label>
              <Input
                id="minYears"
                type="number"
                min={0}
                value={job.minYears}
                onChange={(e) => set("minYears", Number(e.target.value))}
                className="job-form__input job-form__input--numeric"
              />
            </div>
            <div className="job-form__field">
              <Label>Certifications</Label>
              <div className="job-form__input">
                <TagInput
                  value={job.certifications}
                  onChange={(v) => set("certifications", v)}
                  placeholder="e.g. AWS Solutions Architect"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="job-form__hard-filters-card">
          <CardHeader>
            <CardTitle className="job-form__card-title">Hard filters — pass/fail gates</CardTitle>
            <CardDescription>
              These remove a candidate from consideration. Use them sparingly: unlike scoring
              weights, they are not a spectrum.
            </CardDescription>
          </CardHeader>
          <CardContent className="job-form__hard-filters-content">
            <label className="job-form__checkbox-label">
              <Checkbox
                checked={job.hardFilters.workPermitRequired}
                onCheckedChange={(c) =>
                  set("hardFilters", { ...job.hardFilters, workPermitRequired: Boolean(c) })
                }
              />
              <span>Must hold a valid work permit for {job.location || "this location"}</span>
            </label>
            <div className="job-form__gate-years">
              <Label htmlFor="gateYears">Absolute minimum years of experience</Label>
              <Input
                id="gateYears"
                type="number"
                min={0}
                value={job.hardFilters.minYears}
                onChange={(e) =>
                  set("hardFilters", { ...job.hardFilters, minYears: Number(e.target.value) })
                }
                className="job-form__input job-form__input--numeric"
              />
            </div>
            <div className="job-form__field">
              <Label>Must-have skills</Label>
              <div className="job-form__input">
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

      <div className="job-form__sidebar">
        <Card>
          <CardHeader>
            <CardTitle className="job-form__card-title">Scoring weights</CardTitle>
            <CardDescription>
              How much each dimension counts when ranking the candidates who pass the hard filters.
            </CardDescription>
          </CardHeader>
          <CardContent className="job-form__weights">
            {(Object.keys(weightLabels) as (keyof ScoringWeights)[]).map((key) => (
              <div key={key}>
                <div className="job-form__weight-row">
                  <Label>{weightLabels[key]}</Label>
                  <span className="job-form__weight-value">{job.weights[key]}%</span>
                </div>
                <Slider
                  className="job-form__weight-slider"
                  value={[job.weights[key]]}
                  min={0}
                  max={100}
                  step={5}
                  onValueChange={([v]) => set("weights", { ...job.weights, [key]: v ?? 0 })}
                />
              </div>
            ))}
            <div
              className={
                weightTotal === 100
                  ? "job-form__weight-total job-form__weight-total--ok"
                  : "job-form__weight-total job-form__weight-total--warn"
              }
            >
              Total: {weightTotal}% {weightTotal === 100 ? "— ready" : "— must equal 100%"}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="job-form__card-title">Public application page</CardTitle>
          </CardHeader>
          <CardContent className="job-form__public-apply">
            <div className="job-form__public-apply-row">
              <span className="job-form__public-apply-label">Let candidates apply themselves</span>
              <Switch
                checked={job.publicApplyEnabled}
                onCheckedChange={(v) => set("publicApplyEnabled", v)}
              />
            </div>
            <p className="job-form__public-apply-note">
              <Info className="job-form__public-apply-note-icon" />
              Self-applied and HR-uploaded candidates land on the same rank board and are treated
              identically apart from their source tag.
            </p>
          </CardContent>
        </Card>

        <div className="job-form__actions">
          <JobFormSubmitButton saving={saving} mode={mode} onClick={submit} />
          <JobFormCancelButton onClick={() => navigate("/jobs")} />
        </div>
      </div>
    </div>
  );
}
