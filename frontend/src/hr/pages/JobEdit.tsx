import { useQuery } from "@tanstack/react-query";
import { useParams } from "react-router-dom";
import { HrShell } from "@/hr/components/HrShell";
import { JobForm } from "@/hr/components/JobForm";
import { ErrorState, LoadingRows } from "@/shared/components/StateViews";
import { getJob } from "@/shared/lib/api";
import { usePageTitle } from "@/shared/lib/use-page-title";

export default function JobEdit() {
  usePageTitle("Edit job — Screenwise");
  const { jobId = "" } = useParams();
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["job", jobId],
    queryFn: () => getJob(jobId),
  });

  return (
    <HrShell
      allow={["hr", "admin"]}
      title={data ? `Edit: ${data.title}` : "Edit job"}
      description="Changes to weights apply to future scoring runs on your backend."
    >
      {isLoading ? <LoadingRows rows={3} /> : null}
      {isError ? <ErrorState message="We couldn't load this job." onRetry={() => refetch()} /> : null}
      {data ? <JobForm mode="edit" initial={data} /> : null}
    </HrShell>
  );
}
