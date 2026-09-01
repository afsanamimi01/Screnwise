import { useQuery } from "@tanstack/react-query";
import { Link, Navigate, useParams } from "react-router-dom";
import { CheckCircle2, FileText } from "lucide-react";
import { useState } from "react";
import { Shell } from "@/candidate/components/Shell";
import { ErrorState, LoadingRows } from "@/shared/components/StateViews";
import {
  getCandidateProfile,
  getProfileCvBlob,
  getPublicJob,
  submitApplication,
} from "@/shared/lib/api";
import { homeForRole, useAuth } from "@/shared/lib/auth";
import { usePageTitle } from "@/shared/lib/use-page-title";
import "./Apply.css";

export default function Apply() {
  const { jobId = "" } = useParams();
  const { user, ready } = useAuth();

  const job = useQuery({
    queryKey: ["public-job", jobId],
    queryFn: () => getPublicJob(jobId),
    enabled: Boolean(jobId),
  });
  const profile = useQuery({
    queryKey: ["candidate-profile"],
    queryFn: getCandidateProfile,
    enabled: Boolean(user && user.role === "candidate"),
  });

  usePageTitle(`${job.data?.title ? `Apply · ${job.data.title}` : "Apply"} - Screenwise`);

  const [phone, setPhone] = useState("");
  const [override, setOverride] = useState<File | null>(null);
  const [replacing, setReplacing] = useState(false);
  const [consent, setConsent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const profileCv = profile.data?.cv ?? null;
  const phoneValue = phone || profile.data?.phone || "";

  const viewProfileCv = async () => {
    try {
      const blob = await getProfileCvBlob();
      const url = URL.createObjectURL(blob);
      window.open(url, "_blank", "noopener");
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch {
      /* ignore - the button is a convenience only */
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await submitApplication({
        jobId,
        phone: phoneValue,
        // No file needed when the profile already has one and we're not replacing it.
        cv: !profileCv || replacing ? override : null,
      });
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not submit your application.");
    } finally {
      setSubmitting(false);
    }
  };

  if (!ready) return <div className="apply__gate" />;
  if (!user) {
    return <Navigate to={`/login?next=${encodeURIComponent(`/apply/${jobId}`)}`} replace />;
  }
  if (user.role !== "candidate") {
    return <Navigate to={homeForRole(user.role)} replace />;
  }

  const needsFile = !profileCv || replacing;
  const canSubmit = consent && (!needsFile || Boolean(override));

  return (
    <Shell allow={["candidate"]}>
      <main className="apply">
        {job.isLoading ? <LoadingRows rows={3} /> : null}
        {job.isError ? (
          <ErrorState message="We couldn't load this role." onRetry={() => job.refetch()} />
        ) : null}

        {!job.isLoading && !job.isError && !job.data ? (
          <div className="apply__notice">
            This role isn't accepting applications right now.{" "}
            <Link to="/open-roles" className="apply__notice-link">
              Back to open roles
            </Link>
          </div>
        ) : null}

        {job.data && done ? (
          <div className="apply__done">
            <CheckCircle2 className="apply__done-icon" size={32} />
            <h2 className="apply__done-title">Application received</h2>
            <p className="apply__done-text">
              Thanks for applying for {job.data.title}. Your CV has been screened blind, alongside
              everyone else's. You can follow your status any time.
            </p>
            <Link to="/my-applications" className="apply__btn">
              Track my status
            </Link>
          </div>
        ) : null}

        {job.data && !done ? (
          <div className="apply__body">
            <div className="apply__lead">
              <h1 className="apply__title">{job.data.title}</h1>
              <p className="apply__meta">
                {job.data.employmentType} · {job.data.location}
              </p>
              <p className="apply__desc">{job.data.description}</p>
              {job.data.requiredSkills.length ? (
                <div className="apply__skills">
                  {job.data.requiredSkills.map((s) => (
                    <span key={s} className="apply__skill">
                      {s}
                    </span>
                  ))}
                </div>
              ) : null}
            </div>

            <div className="apply__card">
              <div className="apply__card-title">Your application</div>
              <form onSubmit={submit} className="apply__form">
                <div className="apply__field apply__field--full">
                  <span className="apply__label">Applying as</span>
                  <div className="apply__identity">
                    {user.name} · {user.email}
                  </div>
                </div>

                <div className="apply__field apply__field--full">
                  <label className="apply__label" htmlFor="phone">
                    Phone <span className="apply__hint">optional</span>
                  </label>
                  <input
                    id="phone"
                    className="apply__input"
                    value={phoneValue}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                </div>

                {/* --- CV: from profile, or upload --------------------- */}
                <div className="apply__field apply__field--full">
                  <span className="apply__label">CV</span>

                  {profileCv && !replacing ? (
                    <div className="apply__cv">
                      <FileText size={18} className="apply__cv-icon" />
                      <div className="apply__cv-meta">
                        <span className="apply__cv-name">{profileCv.fileName}</span>
                        <span className="apply__cv-sub">from your profile</span>
                      </div>
                      <div className="apply__cv-actions">
                        <button
                          type="button"
                          className="apply__cv-link"
                          onClick={viewProfileCv}
                        >
                          View
                        </button>
                        <button
                          type="button"
                          className="apply__cv-link"
                          onClick={() => setReplacing(true)}
                        >
                          Use a different file
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <input
                        className="apply__input"
                        type="file"
                        accept=".pdf,.docx,.txt"
                        onChange={(e) => setOverride(e.target.files?.[0] ?? null)}
                      />
                      {profileCv ? (
                        <button
                          type="button"
                          className="apply__cv-link apply__cv-link--back"
                          onClick={() => {
                            setReplacing(false);
                            setOverride(null);
                          }}
                        >
                          Keep using my profile CV ({profileCv.fileName})
                        </button>
                      ) : (
                        <span className="apply__hint apply__hint--block">
                          Tip: add a CV to your{" "}
                          <Link to="/profile" className="apply__notice-link">
                            profile
                          </Link>{" "}
                          to skip this next time.
                        </span>
                      )}
                    </>
                  )}
                </div>

                <label className="apply__check apply__field--full">
                  <input
                    type="checkbox"
                    className="apply__checkbox"
                    required
                    checked={consent}
                    onChange={(e) => setConsent(e.target.checked)}
                  />
                  <span>
                    I agree that my CV and profile details may be processed for this application.
                  </span>
                </label>

                {error ? <p className="apply__error apply__field--full">{error}</p> : null}

                <button
                  type="submit"
                  className="apply__btn apply__submit apply__field--full"
                  disabled={submitting || !canSubmit}
                >
                  {submitting ? "Submitting…" : "Submit application"}
                </button>
              </form>
            </div>
          </div>
        ) : null}
      </main>
    </Shell>
  );
}
