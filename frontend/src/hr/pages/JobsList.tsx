import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { HrLayout } from "@/hr/components/HrLayout";
import { EmptyState, ErrorState, LoadingRows } from "@/shared/components/StateViews";
import { Badge } from "@/shared/components/ui/badge";
import { Card } from "@/shared/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/components/ui/table";
import { NewJobButton, CreateJobButton, SortHeaderButton } from "@/hr/components/buttons/Buttons";
import { getApplicationsForJob, getJobs } from "@/shared/lib/api";
import { useAuth } from "@/shared/lib/auth";
import "./JobsList.css";

type SortKey = "title" | "applicants" | "shortlisted" | "createdAt";

export function JobsList() {
  useEffect(() => {
    document.title = "Jobs — Screenwise";
  }, []);

  const { user } = useAuth();
  const navigate = useNavigate();
  const [sort, setSort] = useState<SortKey>("createdAt");
  const [asc, setAsc] = useState(false);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["jobs-table", user?.id],
    enabled: Boolean(user),
    queryFn: async () => {
      const jobs = await getJobs();
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

  const toggleSort = (key: SortKey) => {
    setAsc(sort === key ? !asc : false);
    setSort(key);
  };

  const header = (key: SortKey, label: string) => (
    <TableHead>
      <SortHeaderButton label={label} onClick={() => toggleSort(key)} />
    </TableHead>
  );

  return (
    <HrLayout
      title="Jobs"
      description="Only the person who created a job can open its rank board."
      actions={<NewJobButton />}
    >
      {isLoading ? <LoadingRows rows={3} /> : null}
      {isError ? <ErrorState message="We couldn't load your jobs." onRetry={() => refetch()} /> : null}
      {data && data.length === 0 ? (
        <EmptyState
          title="No job postings yet"
          description="Define a role, its hard filters and its scoring weights to get started."
          action={<CreateJobButton />}
        />
      ) : null}
      {data && data.length > 0 ? (
        <Card className="jobs-list__card">
          <Table>
            <TableHeader>
              <TableRow>
                {header("title", "Job title")}
                <TableHead>Status</TableHead>
                {header("applicants", "Applicants")}
                {header("shortlisted", "Shortlisted")}
                {header("createdAt", "Created")}
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map(({ job, applicants, shortlisted }) => (
                <TableRow
                  key={job.id}
                  className="jobs-list__row"
                  onClick={() => navigate(`/jobs/${job.id}/board`)}
                >
                  <TableCell>
                    <div className="jobs-list__job-title">{job.title}</div>
                    <div className="jobs-list__job-meta">
                      {job.department} · {job.location}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={
                        job.status === "open"
                          ? "jobs-list__status-badge jobs-list__status-badge--open"
                          : "jobs-list__status-badge jobs-list__status-badge--closed"
                      }
                    >
                      {job.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="jobs-list__numeric">{applicants}</TableCell>
                  <TableCell className="jobs-list__numeric">{shortlisted}</TableCell>
                  <TableCell className="jobs-list__created">{job.createdAt}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      ) : null}
    </HrLayout>
  );
}
