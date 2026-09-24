import { Link, useLocation } from "react-router-dom";
import { useWorkspaceBase } from "@/shared/lib/workspace";
import "./JobTabs.css";

/**
 * Per-job tab strip - reorder the array to reorder the tabs. Managers are
 * view-only on a job: they don't bulk-upload CVs, send email or edit the
 * job (all HR-only), so only the rank board and shortlist are listed here.
 */
const TABS = [
  { segment: "board", label: "Rank board" },
  { segment: "shortlist", label: "Shortlist" },
] as const;

export function JobTabs({ jobId }: { jobId: string }) {
  const pathname = useLocation().pathname;
  const base = useWorkspaceBase();

  return (
    <div className="manager-job-tabs">
      {TABS.map((t) => {
        const href = `${base}/${jobId}/${t.segment}`;
        const active = pathname === href;
        return (
          <Link
            key={t.segment}
            to={href}
            className={
              "manager-job-tabs__tab" + (active ? " manager-job-tabs__tab--active" : "")
            }
          >
            {t.label}
          </Link>
        );
      })}
    </div>
  );
}
