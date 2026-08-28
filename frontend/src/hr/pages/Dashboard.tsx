import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Briefcase, Clock, Plus, TrendingUp, Users } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { HrShell } from "@/hr/components/HrShell";
import { EmptyState, ErrorState, LoadingRows } from "@/shared/components/StateViews";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { getDashboard } from "@/shared/lib/api";
import { useAuth } from "@/shared/lib/auth";
import type { Application, Job } from "@/shared/lib/types";
import { usePageTitle } from "@/shared/lib/use-page-title";

/**
 * The four KPI cards across the top of the dashboard, in display order.
 * Reorder / add / remove entries here — `value` receives the loaded data.
 */
const KPI_CARDS: {
  key: string;
  label: string;
  icon: typeof Briefcase;
  value: (ctx: { jobs: Job[]; apps: Application[] }) => string | number;
}[] = [
  {
    key: "activeJobs",
    label: "Active jobs",
    icon: Briefcase,
    value: ({ jobs }) => jobs.filter((j) => j.status === "open").length,
  },
  {
    key: "applicants",
    label: "Total applicants",
    icon: Users,
    value: ({ apps }) => apps.length,
  },
  {
    key: "shortlistRate",
    label: "Shortlist rate",
    icon: TrendingUp,
    value: ({ apps }) => {
      const shortlisted = apps.filter((a) => a.status === "shortlisted").length;
      return `${apps.length ? Math.round((shortlisted / apps.length) * 100) : 0}%`;
    },
  },
  {
    key: "timeToScreen",
    label: "Avg. time to screen",
    icon: Clock,
    value: () => "1.8 days",
  },
];

export default function Dashboard() {
  usePageTitle("Dashboard — Screenwise");
  const { user } = useAuth();
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["dashboard", user?.id],
    enabled: Boolean(user),
    queryFn: () => getDashboard(),
  });

  return (
    <HrShell
      allow={["hr", "admin"]}
      title={`Welcome back${user ? `, ${user.name.split(" ")[0]}` : ""}`}
      description="Here's where your open roles stand today."
      actions={
        <Button asChild>
          <Link to="/jobs/new">
            <Plus className="mr-2 h-4 w-4" /> New job
          </Link>
        </Button>
      }
    >
      {isLoading ? <LoadingRows rows={4} /> : null}
      {isError ? (
        <ErrorState message="We couldn't load your dashboard." onRetry={() => refetch()} />
      ) : null}
      {data ? <DashboardBody jobs={data.jobs} apps={data.apps} /> : null}
    </HrShell>
  );
}

function DashboardBody({ jobs, apps }: { jobs: Job[]; apps: Application[] }) {
  const chartData = jobs.map((job) => {
    const jobApps = apps.filter((a) => a.jobId === job.id);
    return {
      name: job.title.length > 18 ? job.title.slice(0, 17) + "…" : job.title,
      selfApplied: jobApps.filter((a) => a.source === "self-applied").length,
      hrUploaded: jobApps.filter((a) => a.source === "HR-uploaded").length,
    };
  });

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {KPI_CARDS.map((card) => (
          <Card key={card.key} className="shadow-card">
            <CardContent className="flex items-center gap-4 pt-6">
              <div className="rounded-lg bg-primary-soft p-2.5 text-primary">
                <card.icon className="h-5 w-5" />
              </div>
              <div>
                <div className="num text-2xl font-semibold">{card.value({ jobs, apps })}</div>
                <div className="text-sm text-muted-foreground">{card.label}</div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="shadow-card lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Your active job postings</CardTitle>
          </CardHeader>
          <CardContent>
            {jobs.length === 0 ? (
              <EmptyState
                title="No jobs yet"
                description="Create your first job posting to start collecting and screening CVs."
                action={
                  <Button asChild>
                    <Link to="/jobs/new">Create a job</Link>
                  </Button>
                }
              />
            ) : (
              <div className="space-y-3">
                {jobs.map((job) => {
                  const jobApps = apps.filter((a) => a.jobId === job.id);
                  return (
                    <Link
                      key={job.id}
                      to={`/jobs/${job.id}/board`}
                      className="flex flex-wrap items-center justify-between gap-3 rounded-xl border p-4 transition-colors hover:border-primary/40"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{job.title}</span>
                          {job.newSinceLastVisit > 0 ? (
                            <Badge className="bg-success-soft font-normal text-success">
                              {job.newSinceLastVisit} new since last visit
                            </Badge>
                          ) : null}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {job.department} · {job.location}
                        </div>
                      </div>
                      <div className="flex gap-6 text-sm">
                        <div>
                          <div className="num font-semibold">{jobApps.length}</div>
                          <div className="text-xs text-muted-foreground">applicants</div>
                        </div>
                        <div>
                          <div className="num font-semibold">
                            {jobApps.filter((a) => a.status === "shortlisted").length}
                          </div>
                          <div className="text-xs text-muted-foreground">shortlisted</div>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="text-base">Applicant source</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ left: -20 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="selfApplied" name="Self-applied" radius={[4, 4, 0, 0]}>
                    {chartData.map((_, i) => (
                      <Cell key={i} fill="var(--chart-1)" />
                    ))}
                  </Bar>
                  <Bar dataKey="hrUploaded" name="HR-uploaded" radius={[4, 4, 0, 0]}>
                    {chartData.map((_, i) => (
                      <Cell key={i} fill="var(--chart-2)" />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-2 flex gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-chart-1" /> Self-applied
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-chart-2" /> HR-uploaded
              </span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
