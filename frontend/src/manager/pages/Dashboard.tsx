import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Briefcase, TrendingUp, Users } from "lucide-react";
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
import { Shell } from "@/manager/components/Shell";
import { EmptyState, ErrorState, LoadingRows } from "@/shared/components/StateViews";
import { getManagerDashboard } from "@/shared/lib/api";
import { useAuth } from "@/shared/lib/auth";
import type { RecruiterDashboard } from "@/shared/lib/types";
import { usePageTitle } from "@/shared/lib/use-page-title";
import { useWorkspaceBase } from "@/shared/lib/workspace";
import "./Dashboard.css";

/** KPI cards across the top, in display order - reorder the array to reorder.
 *  Values come straight from the backend's `kpis` object - no math here. */
const KPI_CARDS: {
  key: string;
  label: string;
  icon: typeof Briefcase;
  value: (kpis: RecruiterDashboard["kpis"]) => string | number;
}[] = [
  { key: "activeJobs", label: "Active jobs", icon: Briefcase, value: (k) => k.activeJobs },
  { key: "applicants", label: "Total applicants", icon: Users, value: (k) => k.totalApplicants },
  {
    key: "shortlistRate",
    label: "Shortlist rate",
    icon: TrendingUp,
    value: (k) => `${k.shortlistRate}%`,
  },
];

export default function Dashboard() {
  usePageTitle("Dashboard - Screenwise");
  const { user } = useAuth();
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["dashboard", user?.id],
    enabled: Boolean(user),
    queryFn: () => getManagerDashboard(),
  });

  return (
    <Shell allow={["manager"]}>
      <div className="manager-dashboard">
        <div className="manager-dashboard__intro">
          <div>
            <h1 className="manager-dashboard__intro-title">
              Welcome back{user ? `, ${user.name.split(" ")[0]}` : ""}
            </h1>
            <p className="manager-dashboard__intro-text">
              Here's where your open roles stand today.
            </p>
          </div>
        </div>

        {isLoading ? <LoadingRows rows={4} /> : null}
        {isError ? (
          <ErrorState message="We couldn't load your dashboard." onRetry={() => refetch()} />
        ) : null}
        {data ? <Body kpis={data.kpis} jobs={data.jobs} chart={data.chart} /> : null}
      </div>
    </Shell>
  );
}

function Body({ kpis, jobs, chart }: RecruiterDashboard) {
  const base = useWorkspaceBase();
  // Truncating a long title for the chart's x-axis label is display-only,
  // so it stays here rather than in the backend's data.
  const chartData = chart.map((point) => ({
    ...point,
    name: point.name.length > 18 ? point.name.slice(0, 17) + "…" : point.name,
  }));

  return (
    <>
      <div className="manager-dashboard__kpis">
        {KPI_CARDS.map((card) => (
          <div key={card.key} className="manager-dashboard__kpi">
            <span className="manager-dashboard__kpi-icon">
              <card.icon size={20} />
            </span>
            <div>
              <div className="manager-dashboard__kpi-value">{card.value(kpis)}</div>
              <div className="manager-dashboard__kpi-label">{card.label}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="manager-dashboard__panels">
        <section className="manager-dashboard__panel manager-dashboard__panel--wide">
          <div className="manager-dashboard__panel-title">Your active job postings</div>
          {jobs.length === 0 ? (
            <EmptyState
              title="No jobs yet"
              description="Create your first job posting to start collecting and screening CVs."
            />
          ) : (
            <div className="manager-dashboard__jobs">
              {jobs.map((job) => (
                <Link
                  key={job.id}
                  to={`${base}/${job.id}/board`}
                  className="manager-dashboard__job"
                >
                  <div>
                    <div className="manager-dashboard__job-title-row">
                      <span className="manager-dashboard__job-title">{job.title}</span>
                      {job.newSinceLastVisit > 0 ? (
                        <span className="manager-dashboard__new">
                          {job.newSinceLastVisit} new since last visit
                        </span>
                      ) : null}
                    </div>
                    <div className="manager-dashboard__job-meta">
                      {job.department} · {job.location}
                    </div>
                  </div>
                  <div className="manager-dashboard__job-stats">
                    <div>
                      <div className="manager-dashboard__stat-value">{job.applicantCount}</div>
                      <div className="manager-dashboard__stat-label">applicants</div>
                    </div>
                    <div>
                      <div className="manager-dashboard__stat-value">{job.shortlistedCount}</div>
                      <div className="manager-dashboard__stat-label">shortlisted</div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>

        <section className="manager-dashboard__panel">
          <div className="manager-dashboard__panel-title">Applicant source</div>
          <div className="manager-dashboard__chart">
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
          <div className="manager-dashboard__legend">
            <span>
              <span className="manager-dashboard__dot" style={{ background: "#006b79" }} />
              Self-applied
            </span>
            <span>
              <span className="manager-dashboard__dot" style={{ background: "#00a093" }} />
              HR-uploaded
            </span>
          </div>
        </section>
      </div>
    </>
  );
}
