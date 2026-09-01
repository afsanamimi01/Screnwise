import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import { ArrowUpDown, Plus } from "lucide-react";
import { useState } from "react";
import { Shell } from "@/hr/components/Shell";
import { EmptyState, ErrorState, LoadingRows } from "@/shared/components/StateViews";
import { getApplicationsForJob, getJobs, getScreenings } from "@/shared/lib/api";
import { useAuth } from "@/shared/lib/auth";
import { usePageTitle } from "@/shared/lib/use-page-title";
import { useWorkspaceBase } from "@/shared/lib/workspace";
import "./Jobs.css";

type SortKey = "title" | "applicants" | "shortlisted" | "createdAt";

export default function Jobs() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const base = useWorkspaceBase();
  const isScreening = base === "/screen";
  usePageTitle(isScreening ? "Screen CVs - Screenwise" : "Jobs - Screenwise");

  const [sort, setSort] = useState<SortKey>("createdAt");
  const [asc, setAsc] = useState(false);

  /** Column set - reorder / rename here; `sortKey` makes a header clickable. */
  const columns: { label: string; sortKey?: SortKey }[] = [
    { label: isScreening ? "Screening" : "Job title", sortKey: "title" },
    { label: "Status" },
    { label: isScreening ? "CVs" : "Applicants", sortKey: "applicants" },
    { label: "Shortlisted", sortKey: "shortlisted" },
    { label: "Created", sortKey: "createdAt" },
  ];

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["jobs-table", isScreening ? "screening" : "job", user?.id],
    enabled: Boolean(user),
    queryFn: async () => {
      const jobs = isScreening ? await getScreenings() : await getJobs();
      return Promise.all(
        jobs.map(async (job) => {
          const apps = await getApplicationsForJob(job.id);
          return {
            job,
            applicants: apps.length,
            shortlisted: apps.filter((a) => a.status === "shortlisted").length,
          };
        }),
      );
    },
  });

  const rows = [...(data ?? [])].sort((a, b) => {
    const dir = asc ? 1 : -1;
    if (sort === "title") return a.job.title.localeCompare(b.job.title) * dir;
    if (sort === "applicants") return (a.applicants - b.applicants) * dir;
    if (sort === "shortlisted") return (a.shortlisted - b.shortlisted) * dir;
    return a.job.createdAt.localeCompare(b.job.createdAt) * dir;
  });

  const sortBy = (key: SortKey) => {
    setAsc(sort === key ? !asc : false);
    setSort(key);
  };

  return (
    <Shell allow={["hr", "manager"]}>
      <div className="hr-jobs">
        <div className="hr-jobs__intro">
          <div>
            <h1 className="hr-jobs__intro-title">{isScreening ? "Screen CVs" : "Jobs"}</h1>
            <p className="hr-jobs__intro-text">
              {isScreening
                ? "Independent CV screenings for roles sourced elsewhere. Open one to see its rank board, shortlist and emails - nothing here touches the public job board."
                : "Every member of your company can open a job's rank board."}
            </p>
          </div>
          <Link to={`${base}/new`} className="hr-jobs__btn">
            <Plus size={16} /> {isScreening ? "New screening" : "New job"}
          </Link>
        </div>

        {isLoading ? <LoadingRows rows={3} /> : null}
        {isError ? (
          <ErrorState
            message={
              isScreening ? "We couldn't load your screenings." : "We couldn't load your jobs."
            }
            onRetry={() => refetch()}
          />
        ) : null}
        {data && data.length === 0 ? (
          <EmptyState
            title={isScreening ? "No screenings yet" : "No job postings yet"}
            description={
              isScreening
                ? "Create one: set the title, role details, skills, hard filters and scoring weights, then upload the CVs you sourced."
                : "Define a role, its hard filters and its scoring weights to get started."
            }
            action={
              <Link to={`${base}/new`} className="hr-jobs__btn">
                {isScreening ? "Create a screening" : "Create a job"}
              </Link>
            }
          />
        ) : null}

        {data && data.length > 0 ? (
          <div className="hr-jobs__table-wrap">
            <table className="hr-jobs__table">
              <thead>
                <tr>
                  {columns.map((col) => (
                    <th key={col.label}>
                      {col.sortKey ? (
                        <button
                          type="button"
                          className="hr-jobs__sort"
                          onClick={() => sortBy(col.sortKey!)}
                        >
                          {col.label} <ArrowUpDown size={12} />
                        </button>
                      ) : (
                        col.label
                      )}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map(({ job, applicants, shortlisted }) => {
                  const sub = [job.department, job.location].filter(Boolean).join(" · ");
                  return (
                    <tr
                      key={job.id}
                      className="hr-jobs__row"
                      onClick={() => navigate(`${base}/${job.id}/board`)}
                    >
                      <td>
                        <div className="hr-jobs__cell--name">{job.title}</div>
                        {sub ? <div className="hr-jobs__cell--sub">{sub}</div> : null}
                      </td>
                      <td>
                        <span
                          className={
                            "hr-jobs__pill" +
                            (job.status === "open" ? " hr-jobs__pill--open" : "")
                          }
                        >
                          {job.status}
                        </span>
                      </td>
                      <td className="hr-jobs__num">{applicants}</td>
                      <td className="hr-jobs__num">{shortlisted}</td>
                      <td className="hr-jobs__cell--muted">{job.createdAt}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : null}
      </div>
    </Shell>
  );
}
