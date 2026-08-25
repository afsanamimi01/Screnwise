import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Briefcase, Clock, TrendingUp, Users } from "lucide-react";
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
import { HrLayout } from "@/hr/components/HrLayout";
import { EmptyState, ErrorState, LoadingRows } from "@/shared/components/StateViews";
import { Badge } from "@/shared/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { NewJobButton, CreateJobButton } from "@/hr/components/buttons/Buttons";
import { getDashboard } from "@/shared/lib/api";
import { useAuth } from "@/shared/lib/auth";
import type { Application, Job } from "@/shared/lib/types";
import "./Dashboard.css";

export function Dashboard() {
  useEffect(() => {
    document.title = "Dashboard — Screenwise";
  }, []);

  const { user } = useAuth();
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["dashboard", user?.id],
    enabled: Boolean(user),
    queryFn: getDashboard,
  });

  return (
    <HrLayout
      title={`Welcome back${user ? `, ${user.name.split(" ")[0]}` : ""}`}
      description="Here's where your open roles stand today."
      actions={<NewJobButton />}
    >
      {isLoading ? <LoadingRows rows={4} /> : null}
      {isError ? (
        <ErrorState message="We couldn't load your dashboard." onRetry={() => refetch()} />
      ) : null}
      {data ? <DashboardBody jobs={data.jobs} apps={data.apps} /> : null}
    </HrLayout>
  );
}

function DashboardBody({ jobs, apps }: { jobs: Job[]; apps: Application[] }) {
  const shortlisted = apps.filter((a) => a.status === "shortlisted").length;
  const rate = apps.length ? Math.round((shortlisted / apps.length) * 100) : 0;

  const chartData = jobs.map((job) => {
    const jobApps = apps.filter((a) => a.jobId === job.id);
    return {
      name: job.title.length > 18 ? job.title.slice(0, 17) + "…" : job.title,
      selfApplied: jobApps.filter((a) => a.source === "self-applied").length,
      hrUploaded: jobApps.filter((a) => a.source === "HR-uploaded").length,
    };
  });

  const metrics = [
    { label: "Active jobs", value: jobs.filter((j) => j.status === "open").length, icon: Briefcase },
    { label: "Total applicants", value: apps.length, icon: Users },
    { label: "Shortlist rate", value: `${rate}%`, icon: TrendingUp },
    { label: "Avg. time to screen", value: "1.8 days", icon: Clock },
  ];

  return (
    <div className="dashboard">
      <div className="dashboard__metrics">
        {metrics.map((m) => (
          <Card key={m.label} className="dashboard__metric-card">
            <CardContent className="dashboard__metric-content">
              <div className="dashboard__metric-icon-wrap">
                <m.icon className="dashboard__metric-icon" />
              </div>
              <div>
                <div className="dashboard__metric-value">{m.value}</div>
                <div className="dashboard__metric-label">{m.label}</div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="dashboard__panels">
        <Card className="dashboard__jobs-card">
          <CardHeader>
            <CardTitle className="dashboard__card-title">Your active job postings</CardTitle>
          </CardHeader>
          <CardContent>
            {jobs.length === 0 ? (
              <EmptyState
                title="No jobs yet"
                description="Create your first job posting to start collecting and screening CVs."
                action={<CreateJobButton />}
              />
            ) : (
              <div className="dashboard__jobs-list">
                {jobs.map((job) => {
                  const jobApps = apps.filter((a) => a.jobId === job.id);
                  return (
                    <Link key={job.id} to={`/jobs/${job.id}/board`} className="dashboard__job-row">
                      <div>
                        <div className="dashboard__job-row-title-line">
                          <span className="dashboard__job-row-title">{job.title}</span>
                          {job.newSinceLastVisit > 0 ? (
                            <Badge className="dashboard__new-badge">
                              {job.newSinceLastVisit} new since last visit
                            </Badge>
                          ) : null}
                        </div>
                        <div className="dashboard__job-row-meta">
                          {job.department} · {job.location}
                        </div>
                      </div>
                      <div className="dashboard__job-row-stats">
                        <div>
                          <div className="dashboard__job-row-stat-value">{jobApps.length}</div>
                          <div className="dashboard__job-row-stat-label">applicants</div>
                        </div>
                        <div>
                          <div className="dashboard__job-row-stat-value">
                            {jobApps.filter((a) => a.status === "shortlisted").length}
                          </div>
                          <div className="dashboard__job-row-stat-label">shortlisted</div>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="dashboard__chart-card">
          <CardHeader>
            <CardTitle className="dashboard__card-title">Applicant source</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="dashboard__chart">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ left: -20 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="selfApplied" name="Self-applied" radius={[4, 4, 0, 0]}>
                    {chartData.map((_, i) => (
                      <Cell key={i} fill="rgb(0, 107, 121)" />
                    ))}
                  </Bar>
                  <Bar dataKey="hrUploaded" name="HR-uploaded" radius={[4, 4, 0, 0]}>
                    {chartData.map((_, i) => (
                      <Cell key={i} fill="rgb(0, 160, 147)" />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="dashboard__chart-legend">
              <span className="dashboard__chart-legend-item">
                <span className="dashboard__chart-legend-dot dashboard__chart-legend-dot--1" /> Self-applied
              </span>
              <span className="dashboard__chart-legend-item">
                <span className="dashboard__chart-legend-dot dashboard__chart-legend-dot--2" /> HR-uploaded
              </span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
