import { useQuery } from "@tanstack/react-query";
import { Link, Navigate, useParams } from "react-router-dom";
import { CheckCircle2 } from "lucide-react";
import { useEffect, useState } from "react";
import { Shell } from "@/candidate/components/Shell";
import { ErrorState, LoadingRows } from "@/shared/components/StateViews";
import { getPublicJob, submitApplication } from "@/shared/lib/api";
import { homeForRole, useAuth } from "@/shared/lib/auth";
import { usePageTitle } from "@/shared/lib/use-page-title";
import "./Apply.css";

export default function Apply() {
  const { jobId = "" } = useParams();
  const { user, ready } = useAuth();

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["public-job", jobId],
    queryFn: () => getPublicJob(jobId),
    enabled: Boolean(jobId),
  });

  usePageTitle(`${data?.title ? `Apply · ${data.title}` : "Apply"} — Screenwise`);

  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    years: 0,
    currentTitle: "",
    cvFileName: "",
    eligible: false,
    consent: false,
  });
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Prefill what we already know about the signed-in candidate.
  useEffect(() => {
    if (!user) return;
    setForm((p) => ({ ...p, name: p.name || user.name, email: p.email || user.email }));
  }, [user]);

  const set = (k: string, v: unknown) => setForm((p) => ({ ...p, [k]: v }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await submitApplication({
        jobId,
        name: form.name,
        email: form.email,
        phone: form.phone,
        // Skills are extracted from the uploaded CV during screening, not typed here.
        skills: [],
        years: form.years,
        currentTitle: form.currentTitle,
        cvFileName: form.cvFileName || "cv.pdf",
      });
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not submit your application.");
    } finally {
      setSubmitting(false);
    }
  };

  // Applying is a signed-in candidate action: send guests to sign in (and back
  // here afterwards), and bounce staff to their own workspace.
  if (!ready) return <div className="apply__gate" />;
  if (!user) {
    return <Navigate to={`/login?next=${encodeURIComponent(`/apply/${jobId}`)}`} replace />;
  }
  if (user.role !== "candidate") {
    return <Navigate to={homeForRole(user.role)} replace />;
  }

  return (
    <Shell allow={["candidate"]}>
      <main className="apply">
        {isLoading ? <LoadingRows rows={3} /> : null}
        {isError ? (
          <ErrorState message="We couldn't load this role." onRetry={() => refetch()} />
        ) : null}

        {!isLoading && !isError && !data ? (
          <div className="apply__notice">
            This role isn't accepting applications right now.{" "}
            <Link to="/open-roles" className="apply__notice-link">
              Back to open roles
            </Link>
          </div>
        ) : null}

        {data && done ? (
          <div className="apply__done">
            <CheckCircle2 className="apply__done-icon" size={32} />
            <h2 className="apply__done-title">Application received</h2>
            <p className="apply__done-text">
              Thanks for applying for {data.title}. Your CV will be screened blind, alongside
              everyone else's. You can follow your status any time.
            </p>
            <Link to="/my-applications" className="apply__btn">
              Track my status
            </Link>
          </div>
        ) : null}

        {data && !done ? (
          <div className="apply__body">
            <div className="apply__lead">
              <h1 className="apply__title">{data.title}</h1>
              <p className="apply__meta">
                {data.employmentType} · {data.location}
              </p>
              <p className="apply__desc">{data.description}</p>
              {data.requiredSkills.length ? (
                <div className="apply__skills">
                  {data.requiredSkills.map((s) => (
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
                <div className="apply__field">
                  <label className="apply__label" htmlFor="name">
                    Full name
                  </label>
                  <input
                    id="name"
                    className="apply__input"
                    required
                    value={form.name}
                    onChange={(e) => set("name", e.target.value)}
                  />
                </div>
                <div className="apply__field">
                  <label className="apply__label" htmlFor="email">
                    Email
                  </label>
                  <input
                    id="email"
                    className="apply__input"
                    type="email"
                    required
                    value={form.email}
                    onChange={(e) => set("email", e.target.value)}
                  />
                </div>
                <div className="apply__field">
                  <label className="apply__label" htmlFor="phone">
                    Phone
                  </label>
                  <input
                    id="phone"
                    className="apply__input"
                    value={form.phone}
                    onChange={(e) => set("phone", e.target.value)}
                  />
                </div>
                <div className="apply__field">
                  <label className="apply__label" htmlFor="title">
                    Current job title
                  </label>
                  <input
                    id="title"
                    className="apply__input"
                    value={form.currentTitle}
                    onChange={(e) => set("currentTitle", e.target.value)}
                  />
                </div>
                <div className="apply__field">
                  <label className="apply__label" htmlFor="years">
                    Total years of experience
                  </label>
                  <input
                    id="years"
                    className="apply__input apply__input--num"
                    type="number"
                    min={0}
                    value={form.years}
                    onChange={(e) => set("years", Number(e.target.value))}
                  />
                </div>
                <div className="apply__field">
                  <label className="apply__label" htmlFor="cv">
                    CV (PDF or DOCX)
                  </label>
                  <input
                    id="cv"
                    className="apply__input"
                    type="file"
                    accept=".pdf,.docx"
                    onChange={(e) => set("cvFileName", e.target.files?.[0]?.name ?? "")}
                  />
                </div>

                <label className="apply__check apply__field--full">
                  <input
                    type="checkbox"
                    className="apply__checkbox"
                    checked={form.eligible}
                    onChange={(e) => set("eligible", e.target.checked)}
                  />
                  <span>Are you legally eligible to work in {data.location}?</span>
                </label>
                <label className="apply__check apply__field--full">
                  <input
                    type="checkbox"
                    className="apply__checkbox"
                    required
                    checked={form.consent}
                    onChange={(e) => set("consent", e.target.checked)}
                  />
                  <span>
                    I agree that my CV and the details above may be processed for this application.
                  </span>
                </label>

                {error ? <p className="apply__error apply__field--full">{error}</p> : null}

                <button
                  type="submit"
                  className="apply__btn apply__submit apply__field--full"
                  disabled={submitting}
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
