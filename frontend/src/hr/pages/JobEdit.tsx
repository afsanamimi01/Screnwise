import { useQuery } from "@tanstack/react-query";
import { useParams } from "react-router-dom";
import { Shell } from "@/hr/components/Shell";
import { JobForm } from "@/hr/components/JobForm";
import { ErrorState, LoadingRows } from "@/shared/components/StateViews";
import { getJob } from "@/shared/lib/api";
import { usePageTitle } from "@/shared/lib/use-page-title";
import "./JobEdit.css";

export default function JobEdit() {
  usePageTitle("Edit job - Screenwise");
  const { jobId = "" } = useParams();
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["job", jobId],
    queryFn: () => getJob(jobId),
  });

  return (
    <Shell allow={["hr", "manager"]}>
      <div className="hr-job-edit">
        <div className="hr-job-edit__intro">
          <h1 className="hr-job-edit__intro-title">{data ? `Edit: ${data.title}` : "Edit job"}</h1>
          <p className="hr-job-edit__intro-text">
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
