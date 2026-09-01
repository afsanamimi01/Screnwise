import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Briefcase, Clock, Plus, TrendingUp, UploadCloud, Users } from "lucide-react";
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
import { Shell } from "@/hr/components/Shell";
import { EmptyState, ErrorState, LoadingRows } from "@/shared/components/StateViews";
import { getDashboard } from "@/shared/lib/api";
import { useAuth } from "@/shared/lib/auth";
import type { Application, Job } from "@/shared/lib/types";
import { usePageTitle } from "@/shared/lib/use-page-title";
import { useWorkspaceBase } from "@/shared/lib/workspace";
import "./Dashboard.css";

/** KPI cards across the top, in display order - reorder the array to reorder. */
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
  { key: "applicants", label: "Total applicants", icon: Users, value: ({ apps }) => apps.length },
  {
    key: "shortlistRate",
    label: "Shortlist rate",
    icon: TrendingUp,
    value: ({ apps }) => {
      const s = apps.filter((a) => a.status === "shortlisted").length;
      return `${apps.length ? Math.round((s / apps.length) * 100) : 0}%`;
    },
  },
  { key: "timeToScreen", label: "Avg. time to screen", icon: Clock, value: () => "1.8 days" },
];

export default function Dashboard() {
  usePageTitle("Dashboard - Screenwise");
  const { user } = useAuth();
  const base = useWorkspaceBase();
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["dashboard", user?.id],
    enabled: Boolean(user),
    queryFn: () => getDashboard(),
  });

  return (
    <Shell>
      <div className="hr-dashboard">
        <div className="hr-dashboard__intro">
          <div>
            <h1 className="hr-dashboard__intro-title">
              Welcome back{user ? `, ${user.name.split(" ")[0]}` : ""}
            </h1>
            <p className="hr-dashboard__intro-text">Here's where your open roles stand today.</p>
          </div>
          <div className="hr-dashboard__actions">
            <Link to="/screen" className="hr-dashboard__btn hr-dashboard__btn--ghost">
              <UploadCloud size={16} /> Upload CVs
            </Link>
            <Link to={`${base}/new`} className="hr-dashboard__btn">
              <Plus size={16} /> New job
            </Link>
          </div>
        </div>

        {isLoading ? <LoadingRows rows={4} /> : null}
        {isError ? (
          <ErrorState message="We couldn't load your dashboard." onRetry={() => refetch()} />
        ) : null}
        {data ? <Body jobs={data.jobs} apps={data.apps} /> : null}
      </div>
    </Shell>
  );
}

function Body({ jobs, apps }: { jobs: Job[]; apps: Application[] }) {
  const base = useWorkspaceBase();
  const chartData = jobs.map((job) => {
    const jobApps = apps.filter((a) => a.jobId === job.id);
    return {
      name: job.title.length > 18 ? job.title.slice(0, 17) + "…" : job.title,
      selfApplied: jobApps.filter((a) => a.source === "self-applied").length,
      hrUploaded: jobApps.filter((a) => a.source === "HR-uploaded").length,
    };
  });

  return (
    <>
      <div className="hr-dashboard__kpis">
        {KPI_CARDS.map((card) => (
          <div key={card.key} className="hr-dashboard__kpi">
            <span className="hr-dashboard__kpi-icon">
              <card.icon size={20} />
            </span>
            <div>
              <div className="hr-dashboard__kpi-value">{card.value({ jobs, apps })}</div>
              <div className="hr-dashboard__kpi-label">{card.label}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="hr-dashboard__panels">
        <section className="hr-dashboard__panel">
          <div className="hr-dashboard__panel-title">Your active job postings</div>
          {jobs.length === 0 ? (
            <EmptyState
              title="No jobs yet"
              description="Create your first job posting to start collecting and screening CVs."
            />
          ) : (
            <div className="hr-dashboard__jobs">
              {jobs.map((job) => {
                const jobApps = apps.filter((a) => a.jobId === job.id);
                return (
                  <Link key={job.id} to={`${base}/${job.id}/board`} className="hr-dashboard__job">
                    <div>
                      <div className="hr-dashboard__job-title-row">
                        <span className="hr-dashboard__job-title">{job.title}</span>
                        {job.newSinceLastVisit > 0 ? (
                          <span className="hr-dashboard__new">
                            {job.newSinceLastVisit} new since last visit
                          </span>
                        ) : null}
                      </div>
                      <div className="hr-dashboard__job-meta">
                        {job.department} · {job.location}
                      </div>
                    </div>
                    <div className="hr-dashboard__job-stats">
                      <div>
                        <div className="hr-dashboard__stat-value">{jobApps.length}</div>
                        <div className="hr-dashboard__stat-label">applicants</div>
                      </div>
                      <div>
                        <div className="hr-dashboard__stat-value">
                          {jobApps.filter((a) => a.status === "shortlisted").length}
                        </div>
                        <div className="hr-dashboard__stat-label">shortlisted</div>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </section>

        <section className="hr-dashboard__panel">
          <div className="hr-dashboard__panel-title">Applicant source</div>
          <div className="hr-dashboard__chart">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ left: -20 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="selfApplied" name="Self-applied" radius={[4, 4, 0, 0]}>
                  {chartData.map((_, i) => (
                    <Cell key={i} fill="#006b79" />
                  ))}
                </Bar>
                <Bar dataKey="hrUploaded" name="HR-uploaded" radius={[4, 4, 0, 0]}>
                  {chartData.map((_, i) => (
                    <Cell key={i} fill="#00a093" />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="hr-dashboard__legend">
            <span>
              <span className="hr-dashboard__dot" style={{ background: "#006b79" }} /> Self-applied
            </span>
            <span>
              <span className="hr-dashboard__dot" style={{ background: "#00a093" }} /> HR-uploaded
            </span>
          </div>
        </section>
      </div>
    </>
  );
}
