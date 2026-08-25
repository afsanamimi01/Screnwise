import { Link, useLocation } from "react-router-dom";
import { cn } from "@/shared/lib/utils";
import "./JobTabs.css";

const tabs = [
  { suffix: "board", label: "Rank board" },
  { suffix: "shortlist", label: "Shortlist" },
  { suffix: "upload", label: "Upload CVs" },
  { suffix: "email", label: "Email" },
  { suffix: "edit", label: "Edit job" },
] as const;

export function JobTabs({ jobId }: { jobId: string }) {
  const { pathname } = useLocation();
  return (
    <div className="job-tabs">
      {tabs.map((t) => {
        const href = `/jobs/${jobId}/${t.suffix}`;
        const active = pathname === href;
        return (
          <Link
            key={t.suffix}
            to={href}
            className={cn("job-tabs__tab", active && "job-tabs__tab--active")}
          >
            {t.label}
          </Link>
        );
      })}
    </div>
  );
}
