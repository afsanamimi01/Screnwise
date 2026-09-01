import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { FileText, UploadCloud } from "lucide-react";
import { Shell } from "@/candidate/components/Shell";
import { ErrorState, LoadingRows } from "@/shared/components/StateViews";
import {
  deleteProfileCv,
  getCandidateProfile,
  getProfileCvBlob,
  updateCandidateProfile,
  uploadProfileCv,
  type CandidateProfile,
} from "@/shared/lib/api";
import { usePageTitle } from "@/shared/lib/use-page-title";
import "./Profile.css";

const EDUCATION_LEVELS = [
  "",
  "High school",
  "Diploma",
  "Bachelor's degree",
  "Master's degree",
  "PhD",
];

type Details = {
  headline: string;
  location: string;
  phone: string;
  yearsExperience: number;
  educationLevel: string;
  skills: string;
  summary: string;
  portfolio: string;
  linkedin: string;
  github: string;
};

function toDetails(p: CandidateProfile): Details {
  return {
    headline: p.headline,
    location: p.location,
    phone: p.phone,
    yearsExperience: p.yearsExperience,
    educationLevel: p.educationLevel,
    skills: p.skills.join(", "),
    summary: p.summary,
    portfolio: p.links.portfolio,
    linkedin: p.links.linkedin,
    github: p.links.github,
  };
}

function formatBytes(n: number) {
  if (!n) return "";
  return n < 1024 * 1024 ? `${Math.round(n / 1024)} KB` : `${(n / 1024 / 1024).toFixed(1)} MB`;
}

export default function Profile() {
  usePageTitle("Your profile - Screenwise");
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["candidate-profile"],
    queryFn: getCandidateProfile,
  });

  const [details, setDetails] = useState<Details | null>(null);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState(0);
  const [cvBusy, setCvBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (data && !details) setDetails(toDetails(data));
  }, [data, details]);

  const set = (k: keyof Details, v: string | number) =>
    setDetails((d) => (d ? { ...d, [k]: v } : d));

  const saveDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!details) return;
    setError(null);
    setSaving(true);
    try {
      await updateCandidateProfile({
        headline: details.headline,
        location: details.location,
        phone: details.phone,
        yearsExperience: Number(details.yearsExperience) || 0,
        educationLevel: details.educationLevel,
        skills: details.skills
          .split(/[,\n]/)
          .map((s) => s.trim())
          .filter(Boolean),
        summary: details.summary,
        links: {
          portfolio: details.portfolio,
          linkedin: details.linkedin,
          github: details.github,
        },
      });
      await refetch();
      setSavedAt(Date.now());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save your profile.");
    } finally {
      setSaving(false);
    }
  };

  const onCvPicked = async (file: File | undefined) => {
    if (!file) return;
    setError(null);
    setCvBusy(true);
    try {
      await uploadProfileCv(file);
      await refetch();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not upload that file.");
    } finally {
      setCvBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const removeCv = async () => {
    setError(null);
    setCvBusy(true);
    try {
      await deleteProfileCv();
      await refetch();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not remove your CV.");
    } finally {
      setCvBusy(false);
    }
  };

  const viewCv = async () => {
    try {
      const blob = await getProfileCvBlob();
      const url = URL.createObjectURL(blob);
      window.open(url, "_blank", "noopener");
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not open your CV.");
    }
  };

  return (
    <Shell allow={["candidate"]}>
      <main className="candidate-profile">
        <div className="candidate-profile__intro">
          <h1 className="candidate-profile__intro-title">Your profile</h1>
          <p className="candidate-profile__intro-text">
            Set this up once. Your CV and details are reused automatically every time you apply.
          </p>
        </div>

        {isLoading ? <LoadingRows rows={3} /> : null}
        {isError ? (
          <ErrorState message="We couldn't load your profile." onRetry={() => refetch()} />
        ) : null}

        {data && details ? (
          <>
            {/* --- CV ------------------------------------------------ */}
            <section className="candidate-profile__cv">
              <div className="candidate-profile__section-title">CV / resume</div>
              {data.cv ? (
                <div className="candidate-profile__cv-file">
                  <FileText size={20} className="candidate-profile__cv-icon" />
                  <div className="candidate-profile__cv-meta">
                    <span className="candidate-profile__cv-name">{data.cv.fileName}</span>
                    <span className="candidate-profile__cv-sub">
                      {formatBytes(data.cv.size)} · added{" "}
                      {new Date(data.cv.uploadedAt).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="candidate-profile__cv-actions">
                    <button type="button" className="candidate-profile__ghost" onClick={viewCv}>
                      View
                    </button>
                    <button
                      type="button"
                      className="candidate-profile__ghost"
                      disabled={cvBusy}
                      onClick={() => fileRef.current?.click()}
                    >
                      Replace
                    </button>
                    <button
                      type="button"
                      className="candidate-profile__ghost candidate-profile__ghost--danger"
                      disabled={cvBusy}
                      onClick={removeCv}
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  className="candidate-profile__drop"
                  disabled={cvBusy}
                  onClick={() => fileRef.current?.click()}
                >
                  <UploadCloud size={24} className="candidate-profile__drop-icon" />
                  <span className="candidate-profile__drop-title">
                    {cvBusy ? "Uploading…" : "Upload your CV"}
                  </span>
                  <span className="candidate-profile__drop-hint">PDF, DOCX or TXT, up to 8 MB</span>
                </button>
              )}
              <input
                ref={fileRef}
                type="file"
                accept=".pdf,.docx,.txt"
                className="candidate-profile__file"
                onChange={(e) => onCvPicked(e.target.files?.[0])}
              />
            </section>

            {/* --- details --------------------------------------------- */}
            <form className="candidate-profile__form" onSubmit={saveDetails}>
              <div className="candidate-profile__section-title">Details</div>

              <div className="candidate-profile__grid">
                <div className="candidate-profile__field candidate-profile__field--full">
                  <label className="candidate-profile__label">Name</label>
                  <input className="candidate-profile__input" value={data.name} readOnly />
                </div>
                <div className="candidate-profile__field candidate-profile__field--full">
                  <label className="candidate-profile__label">Email</label>
                  <input className="candidate-profile__input" value={data.email} readOnly />
                </div>

                <div className="candidate-profile__field candidate-profile__field--full">
                  <label className="candidate-profile__label" htmlFor="headline">
                    Headline
                  </label>
                  <input
                    id="headline"
                    className="candidate-profile__input"
                    placeholder="e.g. Senior Backend Engineer"
                    value={details.headline}
                    onChange={(e) => set("headline", e.target.value)}
                  />
                </div>

                <div className="candidate-profile__field">
                  <label className="candidate-profile__label" htmlFor="location">
                    Location
                  </label>
                  <input
                    id="location"
                    className="candidate-profile__input"
                    value={details.location}
                    onChange={(e) => set("location", e.target.value)}
                  />
                </div>
                <div className="candidate-profile__field">
                  <label className="candidate-profile__label" htmlFor="phone">
                    Phone
                  </label>
                  <input
                    id="phone"
                    className="candidate-profile__input"
                    value={details.phone}
                    onChange={(e) => set("phone", e.target.value)}
                  />
                </div>

                <div className="candidate-profile__field">
                  <label className="candidate-profile__label" htmlFor="years">
                    Years of experience
                  </label>
                  <input
                    id="years"
                    type="number"
                    min={0}
                    className="candidate-profile__input candidate-profile__input--num"
                    value={details.yearsExperience}
                    onChange={(e) => set("yearsExperience", Number(e.target.value))}
                  />
                </div>
                <div className="candidate-profile__field">
                  <label className="candidate-profile__label" htmlFor="education">
                    Highest education
                  </label>
                  <select
                    id="education"
                    className="candidate-profile__input"
                    value={details.educationLevel}
                    onChange={(e) => set("educationLevel", e.target.value)}
                  >
                    {EDUCATION_LEVELS.map((l) => (
                      <option key={l} value={l}>
                        {l || "Not specified"}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="candidate-profile__field candidate-profile__field--full">
                  <label className="candidate-profile__label" htmlFor="skills">
                    Skills <span className="candidate-profile__hint">comma separated</span>
                  </label>
                  <input
                    id="skills"
                    className="candidate-profile__input"
                    placeholder="React, TypeScript, PostgreSQL"
                    value={details.skills}
                    onChange={(e) => set("skills", e.target.value)}
                  />
                </div>

                <div className="candidate-profile__field candidate-profile__field--full">
                  <label className="candidate-profile__label" htmlFor="summary">
                    Summary
                  </label>
                  <textarea
                    id="summary"
                    className="candidate-profile__textarea"
                    rows={4}
                    value={details.summary}
                    onChange={(e) => set("summary", e.target.value)}
                  />
                </div>

                <div className="candidate-profile__field">
                  <label className="candidate-profile__label" htmlFor="portfolio">
                    Portfolio
                  </label>
                  <input
                    id="portfolio"
                    className="candidate-profile__input"
                    placeholder="https://"
                    value={details.portfolio}
                    onChange={(e) => set("portfolio", e.target.value)}
                  />
                </div>
                <div className="candidate-profile__field">
                  <label className="candidate-profile__label" htmlFor="linkedin">
                    LinkedIn
                  </label>
                  <input
                    id="linkedin"
                    className="candidate-profile__input"
                    placeholder="https://"
                    value={details.linkedin}
                    onChange={(e) => set("linkedin", e.target.value)}
                  />
                </div>
                <div className="candidate-profile__field">
                  <label className="candidate-profile__label" htmlFor="github">
                    GitHub
                  </label>
                  <input
                    id="github"
                    className="candidate-profile__input"
                    placeholder="https://"
                    value={details.github}
                    onChange={(e) => set("github", e.target.value)}
                  />
                </div>
              </div>

              {error ? <p className="candidate-profile__error">{error}</p> : null}

              <div className="candidate-profile__actions">
                {savedAt && !saving ? (
                  <span className="candidate-profile__saved">Saved</span>
                ) : null}
                <button type="submit" className="candidate-profile__save" disabled={saving}>
                  {saving ? "Saving…" : "Save profile"}
                </button>
              </div>
            </form>
          </>
        ) : null}
      </main>
    </Shell>
  );
}
