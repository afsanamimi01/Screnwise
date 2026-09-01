import { useNavigate } from "react-router-dom";
import { Info } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { TagInput } from "@/shared/components/TagInput";
import { createJob, createScreening, updateJob } from "@/shared/lib/api";
import { DEFAULT_WEIGHTS, type Job, type ScoringWeights } from "@/shared/lib/types";
import { useWorkspaceBase } from "@/shared/lib/workspace";
import "./JobForm.css";

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

export function emptyJob(userId: string, kind: "job" | "screening" = "job"): Job {
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
    publicApplyEnabled: kind !== "screening",
    status: "open",
    kind,
    createdAt: new Date().toISOString().slice(0, 10),
    // companyId + createdBy are assigned server-side from the signed-in user.
    companyId: "",
    createdBy: userId,
    newSinceLastVisit: 0,
  };
}

export function JobForm({
  initial,
  mode,
  kind = "job",
}: {
  initial: Job;
  mode: "create" | "edit";
  kind?: "job" | "screening";
}) {
  const navigate = useNavigate();
  const base = useWorkspaceBase();
  const [job, setJob] = useState<Job>(initial);
  const [saving, setSaving] = useState(false);

  const isScreening = kind === "screening";
  const noun = isScreening ? "screening" : "job";

  const set = <K extends keyof Job>(key: K, value: Job[K]) =>
    setJob((prev) => ({ ...prev, [key]: value }));

  const weightTotal = Object.values(job.weights).reduce((a, b) => a + b, 0);

  const submit = async () => {
    if (!job.title.trim()) {
      toast.error(`Give the ${noun} a title first.`);
      return;
    }
    if (weightTotal !== 100) {
      toast.error("Scoring weights must add up to 100% before saving.");
      return;
    }

    setSaving(true);
    try {
      if (mode === "edit") {
        await updateJob(job);
        toast.success(isScreening ? "Screening updated." : "Job updated.");
        navigate(base);
      } else {
        const created = isScreening ? await createScreening(job) : await createJob(job);
        toast.success(isScreening ? "Screening created - now add the CVs." : "Job posted.");
        navigate(isScreening ? `${base}/${created.id}/upload` : base);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : `Could not save the ${noun}.`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="hr-job-form">
      <div className="hr-job-form__col">
        <section className="hr-job-form__card">
          <div className="hr-job-form__card-head">
            <h2 className="hr-job-form__card-title">Role details</h2>
          </div>
          <div className="hr-job-form__grid">
            <div className="hr-job-form__field hr-job-form__field--wide">
              <label className="hr-job-form__label" htmlFor="title">
                Job title
              </label>
              <input
                id="title"
                className="hr-job-form__input"
                value={job.title}
                onChange={(e) => set("title", e.target.value)}
                placeholder="Senior backend engineer"
              />
            </div>
            <div className="hr-job-form__field">
              <label className="hr-job-form__label" htmlFor="department">
                Department
              </label>
              <input
                id="department"
                className="hr-job-form__input"
                value={job.department}
                onChange={(e) => set("department", e.target.value)}
              />
            </div>
            <div className="hr-job-form__field">
              <label className="hr-job-form__label" htmlFor="location">
                Location
              </label>
              <input
                id="location"
                className="hr-job-form__input"
                value={job.location}
                onChange={(e) => set("location", e.target.value)}
              />
            </div>
            <div className="hr-job-form__field">
              <label className="hr-job-form__label" htmlFor="type">
                Employment type
              </label>
              <select
                id="type"
                className="hr-job-form__input"
                value={job.employmentType}
                onChange={(e) => set("employmentType", e.target.value)}
              >
                {EMPLOYMENT_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
            <div className="hr-job-form__field">
              <label className="hr-job-form__label" htmlFor="education">
                Required education level
              </label>
              <select
                id="education"
                className="hr-job-form__input"
                value={job.educationLevel}
                onChange={(e) => set("educationLevel", e.target.value)}
              >
                {EDUCATION_LEVELS.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
            <div className="hr-job-form__field hr-job-form__field--wide">
              <label className="hr-job-form__label" htmlFor="description">
                Description
              </label>
              <textarea
                id="description"
                className="hr-job-form__textarea"
                value={job.description}
                onChange={(e) => set("description", e.target.value)}
                rows={7}
                placeholder="What the role involves, who they'll work with, what success looks like."
              />
            </div>
          </div>
        </section>

        <section className="hr-job-form__card">
          <div className="hr-job-form__card-head">
            <h2 className="hr-job-form__card-title">Skills and requirements</h2>
            <p className="hr-job-form__card-desc">
              These feed the score. Nothing here removes a candidate on its own.
            </p>
          </div>
          <div className="hr-job-form__grid">
            <div className="hr-job-form__field">
              <span className="hr-job-form__label">Required skills</span>
              <TagInput
                value={job.requiredSkills}
                onChange={(v) => set("requiredSkills", v)}
                placeholder="Add a skill and press enter"
              />
            </div>
            <div className="hr-job-form__field">
              <span className="hr-job-form__label">Nice-to-have skills</span>
              <TagInput
                value={job.niceToHaveSkills}
                onChange={(v) => set("niceToHaveSkills", v)}
                placeholder="Add a skill and press enter"
              />
            </div>
            <div className="hr-job-form__field">
              <label className="hr-job-form__label" htmlFor="minYears">
                Minimum years of experience
              </label>
              <input
                id="minYears"
                type="number"
                min={0}
                className="hr-job-form__input hr-job-form__input--num"
                value={job.minYears}
                onChange={(e) => set("minYears", Number(e.target.value))}
              />
            </div>
            <div className="hr-job-form__field">
              <span className="hr-job-form__label">Certifications</span>
              <TagInput
                value={job.certifications}
                onChange={(v) => set("certifications", v)}
                placeholder="e.g. AWS Solutions Architect"
              />
            </div>
          </div>
        </section>

        <section className="hr-job-form__card hr-job-form__card--gate">
          <div className="hr-job-form__card-head">
            <h2 className="hr-job-form__card-title">Hard filters - pass/fail gates</h2>
            <p className="hr-job-form__card-desc">
              These remove a candidate from consideration. Use them sparingly: unlike scoring
              weights, they are not a spectrum.
            </p>
          </div>
          <div className="hr-job-form__gate-body">
            <label className="hr-job-form__check">
              <input
                type="checkbox"
                checked={job.hardFilters.workPermitRequired}
                onChange={(e) =>
                  set("hardFilters", {
                    ...job.hardFilters,
                    workPermitRequired: e.target.checked,
                  })
                }
              />
              <span>Must hold a valid work permit for {job.location || "this location"}</span>
            </label>
            <div className="hr-job-form__field hr-job-form__field--narrow">
              <label className="hr-job-form__label" htmlFor="gateYears">
                Absolute minimum years of experience
              </label>
              <input
                id="gateYears"
                type="number"
                min={0}
                className="hr-job-form__input hr-job-form__input--num"
                value={job.hardFilters.minYears}
                onChange={(e) =>
                  set("hardFilters", { ...job.hardFilters, minYears: Number(e.target.value) })
                }
              />
            </div>
            <div className="hr-job-form__field">
              <span className="hr-job-form__label">Must-have skills</span>
              <TagInput
                value={job.hardFilters.mustHaveSkills}
                onChange={(v) => set("hardFilters", { ...job.hardFilters, mustHaveSkills: v })}
                placeholder="A skill the candidate cannot be without"
              />
            </div>
          </div>
        </section>
      </div>

      <div className="hr-job-form__col">
        <section className="hr-job-form__card">
          <div className="hr-job-form__card-head">
            <h2 className="hr-job-form__card-title">Scoring weights</h2>
            <p className="hr-job-form__card-desc">
              How much each dimension counts when ranking the candidates who pass the hard filters.
            </p>
          </div>
          <div className="hr-job-form__weights">
            {(Object.keys(weightLabels) as (keyof ScoringWeights)[]).map((key) => (
              <div key={key} className="hr-job-form__weight">
                <div className="hr-job-form__weight-head">
                  <span className="hr-job-form__label">{weightLabels[key]}</span>
                  <span className="hr-job-form__weight-value">{job.weights[key]}%</span>
                </div>
                <input
                  type="range"
                  className="hr-job-form__range"
                  value={job.weights[key]}
                  min={0}
                  max={100}
                  step={5}
                  onChange={(e) =>
                    set("weights", { ...job.weights, [key]: Number(e.target.value) })
                  }
                />
              </div>
            ))}
            <div
              className={
                "hr-job-form__total" +
                (weightTotal === 100
                  ? " hr-job-form__total--ok"
                  : " hr-job-form__total--warn")
              }
            >
              Total: {weightTotal}% {weightTotal === 100 ? "- ready" : "- must equal 100%"}
            </div>
          </div>
        </section>

        {isScreening ? null : (
          <section className="hr-job-form__card">
            <div className="hr-job-form__card-head">
              <h2 className="hr-job-form__card-title">Public application page</h2>
            </div>
            <div className="hr-job-form__public">
              <div className="hr-job-form__switch-row">
                <span>Let candidates apply themselves</span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={job.publicApplyEnabled}
                  className={
                    "hr-job-form__switch" +
                    (job.publicApplyEnabled ? " hr-job-form__switch--on" : "")
                  }
                  onClick={() => set("publicApplyEnabled", !job.publicApplyEnabled)}
                >
                  <span className="hr-job-form__switch-knob" />
                </button>
              </div>
              <p className="hr-job-form__hint">
                <Info size={14} />
                Self-applied and HR-uploaded candidates land on the same rank board and are treated
                identically apart from their source tag.
              </p>
            </div>
          </section>
        )}

        <div className="hr-job-form__actions">
          <button
            type="button"
            className="hr-job-form__btn"
            onClick={submit}
            disabled={saving}
          >
            {saving
              ? "Saving…"
              : mode === "create"
                ? isScreening
                  ? "Create screening"
                  : "Post job"
                : "Save changes"}
          </button>
          <button
            type="button"
            className="hr-job-form__btn hr-job-form__btn--ghost"
            onClick={() => navigate(base)}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
