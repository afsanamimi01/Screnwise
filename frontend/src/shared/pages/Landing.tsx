import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { ArrowRight, EyeOff, ListChecks, Scale, Sparkles } from "lucide-react";
import { SiteFooter } from "@/shared/components/SiteFooter";
import { getPublicJobs } from "@/shared/lib/api";
import { homeForRole, roleLabels, useAuth, workspaceLabels } from "@/shared/lib/auth";
import { usePageTitle } from "@/shared/lib/use-page-title";
import "./Landing.css";

const pillars = [
  {
    icon: EyeOff,
    title: "Blind by default",
    body: "Names, photos, age, address and university are hidden while you screen. Identity is revealed only after you shortlist.",
  },
  {
    icon: Scale,
    title: "Explainable scores",
    body: "Every match score opens into a breakdown: skills matched, experience gap, education, certifications, keywords.",
  },
  {
    icon: ListChecks,
    title: "Nobody is auto-rejected",
    body: "Below-threshold candidates are collapsed, never deleted. The system suggests, you decide.",
  },
];

export default function Landing() {
  usePageTitle("Screenwise - blind, explainable CV screening");
  // The landing page is public, but a signed-in session survives here: show the
  // actor their account and a way back into their workspace instead of the
  // guest "Sign in / Create account" pair, which reads as a silent logout.
  // Signing out stays in the workspace sidebar - it is not offered here.
  const { user, ready } = useAuth();
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["public-jobs"],
    queryFn: () => getPublicJobs(),
  });

  // Applying requires a candidate session - route guests to sign in first.
  const applyHref = (jobId: string) =>
    user ? `/apply/${jobId}` : `/login?next=${encodeURIComponent(`/apply/${jobId}`)}`;

  return (
    <div className="landing">
      <header className="landing__header">
        <div className="landing__brand">
          <span className="landing__logo">
            <Sparkles size={16} />
          </span>
          <span className="landing__wordmark">Screenwise</span>
        </div>
        <div className="landing__nav">
          {/* `ready` is false until the stored session is read - render neither
              state yet so a signed-in actor never sees a guest-nav flash. */}
          {!ready ? null : user ? (
            <>
              <span className="landing__session">
                <span className="landing__session-name">{user.name}</span>
                <span className="landing__session-role">{roleLabels[user.role]}</span>
              </span>
              <Link to={homeForRole(user.role)} className="landing__btn">
                {workspaceLabels[user.role]} <ArrowRight size={16} />
              </Link>
            </>
          ) : (
            <>
              <Link to="/login" className="landing__nav-link">
                Sign in
              </Link>
              <Link to="/register" className="landing__btn">
                Create account
              </Link>
            </>
          )}
        </div>
      </header>

      <section className="landing__hero">
        <span className="landing__eyebrow">
          {user
            ? `Signed in as ${user.name} · ${roleLabels[user.role]}`
            : "Applicant screening, without the bias"}
        </span>
        <h1 className="landing__title">
          Screen hundreds of CVs fairly, and still make the call yourself.
        </h1>
        <p className="landing__lede">
          Screenwise parses every CV, scores it against the job you defined, and ranks candidates on
          a blind board. You shortlist. Only then does the platform show you who they are.
        </p>
        <div className="landing__cta">
          {user ? (
            <Link to={homeForRole(user.role)} className="landing__btn landing__btn--lg">
              Continue to {workspaceLabels[user.role].toLowerCase()} <ArrowRight size={16} />
            </Link>
          ) : (
            <Link to="/login" className="landing__btn landing__btn--lg">
              Open the demo dashboard <ArrowRight size={16} />
            </Link>
          )}
        </div>

        <div className="landing__pillars">
          {pillars.map((p) => (
            <article key={p.title} className="landing__pillar">
              <span className="landing__pillar-icon">
                <p.icon size={20} />
              </span>
              <h2 className="landing__pillar-title">{p.title}</h2>
              <p className="landing__pillar-body">{p.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="landing__roles">
        <div className="landing__roles-inner">
          <h2 className="landing__roles-title">Open roles</h2>
          <p className="landing__roles-text">
            Applying takes a couple of minutes and you can track your status afterwards.
          </p>
          <div className="landing__roles-list">
            {isLoading ? <p className="landing__state">Loading open roles…</p> : null}
            {isError ? (
              <div className="landing__state landing__state--error">
                <span>We couldn't load the open roles.</span>
                <button type="button" className="landing__retry" onClick={() => refetch()}>
                  Try again
                </button>
              </div>
            ) : null}
            {data && data.length === 0 ? (
              <p className="landing__state">No public roles right now - check back soon.</p>
            ) : null}
            {data?.map((job) => (
              <Link key={job.id} to={applyHref(job.id)} className="landing__role">
                <span className="landing__role-main">
                  <span className="landing__role-title">{job.title}</span>
                  <span className="landing__role-meta">
                    {job.department} · {job.location} · {job.employmentType}
                  </span>
                </span>
                <span className="landing__role-cta">
                  {user ? "Apply" : "Sign in to apply"} <ArrowRight size={16} />
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <SiteFooter role={user?.role} />
    </div>
  );
}
