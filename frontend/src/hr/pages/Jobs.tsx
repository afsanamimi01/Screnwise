import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import { ArrowUpDown, Plus } from "lucide-react";
import { useState } from "react";
import { HrShell } from "@/hr/components/HrShell";
import { EmptyState, ErrorState, LoadingRows } from "@/shared/components/StateViews";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { Card } from "@/shared/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/components/ui/table";
import { getApplicationsForJob, getJobs } from "@/shared/lib/api";
import { useAuth } from "@/shared/lib/auth";
import { usePageTitle } from "@/shared/lib/use-page-title";

type SortKey = "title" | "applicants" | "shortlisted" | "createdAt";

/**
 * Columns of the jobs table, left to right. Set `sortKey` to make a column
 * sortable; drop it (like "Status") for a plain header. Reorder to reorder.
 */
const COLUMNS: { label: string; sortKey?: SortKey }[] = [
  { label: "Job title", sortKey: "title" },
  { label: "Status" },
  { label: "Applicants", sortKey: "applicants" },
  { label: "Shortlisted", sortKey: "shortlisted" },
  { label: "Created", sortKey: "createdAt" },
];

export default function Jobs() {
  usePageTitle("Jobs — Screenwise");
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

  const sortBy = (key: SortKey) => {
    setAsc(sort === key ? !asc : false);
    setSort(key);
  };

  return (
    <HrShell
      allow={["hr", "admin"]}
      title="Jobs"
      description="Only the person who created a job can open its rank board."
      actions={
        <Button asChild>
          <Link to="/jobs/new">
            <Plus className="mr-2 h-4 w-4" /> New job
          </Link>
        </Button>
      }
    >
      {isLoading ? <LoadingRows rows={3} /> : null}
      {isError ? <ErrorState message="We couldn't load your jobs." onRetry={() => refetch()} /> : null}
      {data && data.length === 0 ? (
        <EmptyState
          title="No job postings yet"
          description="Define a role, its hard filters and its scoring weights to get started."
          action={
            <Button asChild>
              <Link to="/jobs/new">Create a job</Link>
            </Button>
          }
        />
      ) : null}
      {data && data.length > 0 ? (
        <Card className="overflow-hidden p-0 shadow-card">
          <Table>
            <TableHeader>
              <TableRow>
                {COLUMNS.map((col) => (
                  <TableHead key={col.label}>
                    {col.sortKey ? (
                      <button
                        className="flex items-center gap-1 hover:text-foreground"
                        onClick={() => sortBy(col.sortKey!)}
                      >
                        {col.label} <ArrowUpDown className="h-3 w-3" />
                      </button>
                    ) : (
                      col.label
                    )}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map(({ job, applicants, shortlisted }) => (
                <TableRow
                  key={job.id}
                  className="cursor-pointer"
                  onClick={() => navigate(`/jobs/${job.id}/board`)}
                >
                  <TableCell>
                    <div className="font-medium">{job.title}</div>
                    <div className="text-xs text-muted-foreground">
                      {job.department} · {job.location}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={
                        job.status === "open"
                          ? "border-success/40 bg-success-soft font-normal text-success"
                          : "font-normal text-muted-foreground"
                      }
                    >
                      {job.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="num">{applicants}</TableCell>
                  <TableCell className="num">{shortlisted}</TableCell>
                  <TableCell className="text-muted-foreground">{job.createdAt}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      ) : null}
    </HrShell>
  );
}
