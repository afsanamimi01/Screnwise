import { Shell } from "@/hr/components/Shell";
import { JobForm, emptyJob } from "@/hr/components/JobForm";
import { useAuth } from "@/shared/lib/auth";
import { usePageTitle } from "@/shared/lib/use-page-title";
import { useWorkspaceBase } from "@/shared/lib/workspace";
import "./JobNew.css";

export default function JobNew() {
  const { user } = useAuth();
  const isScreening = useWorkspaceBase() === "/screen";
  usePageTitle(isScreening ? "New CV screening - Screenwise" : "Create a job - Screenwise");

  return (
    <Shell allow={["hr", "manager"]}>
      <div className="hr-job-new">
        <div className="hr-job-new__intro">
          <h1 className="hr-job-new__intro-title">
            {isScreening ? "New CV screening" : "Create a job posting"}
          </h1>
          <p className="hr-job-new__intro-text">
            {isScreening
              ? "Define the role you're screening for - CVs you upload next are ranked against exactly these skills, weights and hard filters. This never appears on the public board."
              : "Hard filters are pass/fail gates. Scoring weights rank the survivors on a spectrum."}
          </p>
        </div>

        {user ? (
          <JobForm
            mode="create"
            kind={isScreening ? "screening" : "job"}
            initial={emptyJob(user.id, isScreening ? "screening" : "job")}
          />
        ) : null}
      </div>
    </Shell>
  );
}
