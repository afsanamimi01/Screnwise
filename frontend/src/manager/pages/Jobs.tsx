import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { ArrowUpDown } from "lucide-react";
import { useState } from "react";
import { Shell } from "@/manager/components/Shell";
import { EmptyState, ErrorState, LoadingRows } from "@/shared/components/StateViews";
import { getManagerJobs, getManagerScreenings } from "@/shared/lib/api";
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
    // Applicant and shortlisted counts come pre-computed on each job - the
    // table itself does no per-job fetching or math.
    queryFn: () => (isScreening ? getManagerScreenings() : getManagerJobs()),
  });

  const rows = [...(data ?? [])].sort((a, b) => {
    const dir = asc ? 1 : -1;
    if (sort === "title") return a.title.localeCompare(b.title) * dir;
    if (sort === "applicants") return (a.applicantCount - b.applicantCount) * dir;
    if (sort === "shortlisted") return (a.shortlistedCount - b.shortlistedCount) * dir;
    return a.createdAt.localeCompare(b.createdAt) * dir;
  });

  const sortBy = (key: SortKey) => {
    setAsc(sort === key ? !asc : false);
    setSort(key);
  };

  return (
    <Shell allow={["manager"]}>
      <div className="manager-jobs">
        <div className="manager-jobs__intro">
          <div>
            <h1 className="manager-jobs__intro-title">{isScreening ? "Screen CVs" : "Jobs"}</h1>
            <p className="manager-jobs__intro-text">
              {isScreening
                ? "Independent CV screenings for roles sourced elsewhere. Open one to see its rank board, shortlist and emails - nothing here touches the public job board."
                : "Every member of your company can open a job's rank board."}
            </p>
          </div>
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
          />
        ) : null}

        {data && data.length > 0 ? (
          <div className="manager-jobs__table-wrap">
            <table className="manager-jobs__table">
              <thead>
                <tr>
                  {columns.map((col) => (
                    <th key={col.label}>
                      {col.sortKey ? (
                        <button
                          type="button"
                          className="manager-jobs__sort"
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
                {rows.map((job) => {
                  const sub = [job.department, job.location].filter(Boolean).join(" · ");
                  return (
                    <tr
                      key={job.id}
                      className="manager-jobs__row"
                      onClick={() => navigate(`${base}/${job.id}/board`)}
                    >
                      <td>
                        <div className="manager-jobs__cell--name">{job.title}</div>
                        {sub ? <div className="manager-jobs__cell--sub">{sub}</div> : null}
                      </td>
                      <td>
                        <span
                          className={
                            "manager-jobs__pill" +
                            (job.status === "open" ? " manager-jobs__pill--open" : "")
                          }
                        >
                          {job.status}
                        </span>
                      </td>
                      <td className="manager-jobs__num">{job.applicantCount}</td>
                      <td className="manager-jobs__num">{job.shortlistedCount}</td>
                      <td className="manager-jobs__cell--muted">{job.createdAt}</td>
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
