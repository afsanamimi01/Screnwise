import { type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { ArrowRight, Building2, MapPin } from "lucide-react";
import { Shell } from "@/candidate/components/Shell";
import { EmptyState, ErrorState, LoadingRows } from "@/shared/components/StateViews";
import { getMyApplications, getPublicJobs } from "@/shared/lib/api";
import { useAuth } from "@/shared/lib/auth";
import type { Job } from "@/shared/lib/types";
import { usePageTitle } from "@/shared/lib/use-page-title";
import "./OpenRoles.css";

/**
 * Quick facts shown under a role's title. The array order is the display order —
 * move an entry to rearrange. Each `render` returns `null` when it has nothing.
 */
const JOB_FACTS: { key: string; render: (job: Job) => ReactNode }[] = [
  {
    key: "company",
    render: (job) =>
      job.companyName ? (
        <>
          <Building2 size={14} />
          {job.companyName}
        </>
      ) : null,
  },
  {
    key: "location",
    render: (job) =>
      job.location ? (
        <>
          <MapPin size={14} />
          {job.location}
        </>
      ) : null,
  },
  { key: "type", render: (job) => job.employmentType || null },
  { key: "department", render: (job) => job.department || null },
];

/** Smaller stats at the foot of each card — same array-ordered idea. */
const JOB_STATS: { key: string; render: (job: Job) => ReactNode }[] = [
  { key: "years", render: (job) => (job.minYears > 0 ? <span>{job.minYears}+ yrs experience</span> : null) },
  {
    key: "education",
    render: (job) =>
      job.educationLevel && !["Any", "—"].includes(job.educationLevel) ? (
        <span>{job.educationLevel}</span>
      ) : null,
  },
  {
    key: "nice",
    render: (job) =>
      job.niceToHaveSkills.length ? (
        <span>Nice to have: {job.niceToHaveSkills.join(", ")}</span>
      ) : null,
  },
];

export default function OpenRoles() {
  usePageTitle("Open roles — Screenwise");
  const { user } = useAuth();

  const jobs = useQuery({ queryKey: ["public-jobs"], queryFn: () => getPublicJobs() });
  const mine = useQuery({
    queryKey: ["my-apps", user?.id],
    enabled: Boolean(user),
    queryFn: () => getMyApplications(),
  });

  const appliedJobIds = new Set(
    (mine.data ?? []).map((row) => row.job?.id).filter(Boolean) as string[],
  );

  return (
    <Shell allow={["candidate"]}>
      <main className="open-roles">
        <div className="open-roles__intro">
          <h1 className="open-roles__intro-title">Open roles</h1>
          <p className="open-roles__intro-text">
            Every role currently open for applications. Your CV is screened blind against the job
            you pick.
          </p>
        </div>

        {jobs.isLoading ? <LoadingRows rows={3} /> : null}
        {jobs.isError ? (
          <ErrorState message="We couldn't load the open roles." onRetry={() => jobs.refetch()} />
        ) : null}
        {jobs.data && jobs.data.length === 0 ? (
          <EmptyState
            title="No open roles right now"
            description="Check back soon — new roles are published regularly."
          />
        ) : null}

        <div className="open-roles__list">
          {jobs.data?.map((job) => {
          const applied = appliedJobIds.has(job.id);
          return (
            <article key={job.id} className="open-roles__card">
              <div className="open-roles__head">
                <div className="open-roles__headline">
                  <div className="open-roles__title-row">
                    <h2 className="open-roles__title">{job.title}</h2>
                    {applied ? <span className="open-roles__applied">Applied</span> : null}
                  </div>
                  <div className="open-roles__facts">
                    {JOB_FACTS.map((fact) => {
                      const node = fact.render(job);
                      return node ? (
                        <span key={fact.key} className="open-roles__fact">
                          {node}
                        </span>
                      ) : null;
                    })}
                  </div>
                </div>

                {applied ? (
                  <Link to="/my-applications" className="open-roles__btn open-roles__btn--ghost">
                    View status
                  </Link>
                ) : (
                  <Link to={`/apply/${job.id}`} className="open-roles__btn">
                    Apply <ArrowRight size={16} />
                  </Link>
                )}
              </div>

              {job.description ? <p className="open-roles__desc">{job.description}</p> : null}

              {job.requiredSkills.length ? (
                <div className="open-roles__skills">
                  <div className="open-roles__skills-title">Required skills</div>
                  <div className="open-roles__skill-list">
                    {job.requiredSkills.map((skill) => (
                      <span key={skill} className="open-roles__skill">
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              ) : null}

              <div className="open-roles__stats">
                {JOB_STATS.map((stat) => {
                  const node = stat.render(job);
                  return node ? <span key={stat.key}>{node}</span> : null;
                })}
              </div>
            </article>
          );
        })}
        </div>
      </main>
    </Shell>
  );
}
