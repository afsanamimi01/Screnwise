import { HrShell } from "@/hr/components/HrShell";
import { JobForm, emptyJob } from "@/hr/components/JobForm";
import { useAuth } from "@/shared/lib/auth";
import { usePageTitle } from "@/shared/lib/use-page-title";

export default function JobNew() {
  usePageTitle("Create a job — Screenwise");
  const { user } = useAuth();
  return (
    <HrShell
      allow={["hr", "admin"]}
      title="Create a job posting"
      description="Hard filters are pass/fail gates. Scoring weights rank the survivors on a spectrum."
    >
      {user ? <JobForm mode="create" initial={emptyJob(user.id)} /> : null}
    </HrShell>
  );
}
