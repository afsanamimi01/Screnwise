import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams } from "react-router-dom";
import { HrLayout } from "@/hr/components/HrLayout";
import { JobForm } from "@/hr/components/JobForm";
import { ErrorState, LoadingRows } from "@/shared/components/StateViews";
import { getJob } from "@/shared/lib/api";
import "./JobEdit.css";

export function JobEdit() {
  const { jobId = "" } = useParams<{ jobId: string }>();

  useEffect(() => {
    document.title = "Edit job — Screenwise";
  }, []);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["job", jobId],
    queryFn: () => getJob(jobId),
  });

  return (
    <HrLayout
      title={data ? `Edit: ${data.title}` : "Edit job"}
      description="Changes to weights apply to future scoring runs on your backend."
    >
      {isLoading ? <LoadingRows rows={3} /> : null}
      {isError ? <ErrorState message="We couldn't load this job." onRetry={() => refetch()} /> : null}
      {data ? <JobForm mode="edit" initial={data} /> : null}
    </HrLayout>
  );
}
