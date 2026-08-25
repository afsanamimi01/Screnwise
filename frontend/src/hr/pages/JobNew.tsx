import { useEffect } from "react";
import { HrLayout } from "@/hr/components/HrLayout";
import { JobForm, emptyJob } from "@/hr/components/JobForm";
import { useAuth } from "@/shared/lib/auth";
import "./JobNew.css";

export function JobNew() {
  useEffect(() => {
    document.title = "Create a job — Screenwise";
  }, []);

  const { user } = useAuth();

  return (
    <HrLayout
      title="Create a job posting"
      description="Hard filters are pass/fail gates. Scoring weights rank the survivors on a spectrum."
    >
      {user ? <JobForm mode="create" initial={emptyJob(user.id)} /> : null}
    </HrLayout>
  );
}
