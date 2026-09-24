import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate, useParams } from "react-router-dom";
import { Shell } from "@/manager/components/Shell";
import { JobForm } from "@/manager/components/JobForm";
import { ErrorState, LoadingRows } from "@/shared/components/StateViews";
import { getManagerJob } from "@/shared/lib/api";
import { useAuth } from "@/shared/lib/auth";
import { usePageTitle } from "@/shared/lib/use-page-title";
import { useWorkspaceBase } from "@/shared/lib/workspace";
import "./JobEdit.css";

/** Managers are view-only on a job - editing it is HR-only. */
export default function JobEdit() {
  usePageTitle("Edit job - Screenwise");
  const { jobId = "" } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const base = useWorkspaceBase();
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["job", jobId],
    queryFn: () => getManagerJob(jobId),
  });

  useEffect(() => {
    if (user?.role === "manager") navigate(`${base}/${jobId}/board`, { replace: true });
  }, [user, base, jobId, navigate]);

  if (user?.role === "manager") return null;

  return (
    <Shell allow={["manager"]}>
      <div className="manager-job-edit">
        <div className="manager-job-edit__intro">
          <h1 className="manager-job-edit__intro-title">
            {data ? `Edit: ${data.title}` : "Edit job"}
          </h1>
          <p className="manager-job-edit__intro-text">
            Changes to weights apply to future scoring runs on your backend.
          </p>
        </div>

        {isLoading ? <LoadingRows rows={3} /> : null}
        {isError ? (
          <ErrorState message="We couldn't load this job." onRetry={() => refetch()} />
        ) : null}
        {data ? <JobForm mode="edit" kind={data.kind} initial={data} /> : null}
      </div>
    </Shell>
  );
}
