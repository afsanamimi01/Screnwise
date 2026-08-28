import { Link, useLocation } from "react-router-dom";
import { Button } from "@/shared/components/ui/button";
import { cn } from "@/shared/lib/utils";

const tabs = [
  { segment: "board", label: "Rank board" },
  { segment: "shortlist", label: "Shortlist" },
  { segment: "upload", label: "Upload CVs" },
  { segment: "email", label: "Email" },
  { segment: "edit", label: "Edit job" },
] as const;

export function JobTabs({ jobId }: { jobId: string }) {
  const pathname = useLocation().pathname;
  return (
    <div className="mb-6 flex flex-wrap gap-1 rounded-xl border bg-card p-1">
      {tabs.map((t) => {
        const href = `/jobs/${jobId}/${t.segment}`;
        const active = pathname === href;
        return (
          <Button
            key={t.segment}
            asChild
            variant="ghost"
            size="sm"
            className={cn(active && "bg-primary-soft text-primary hover:bg-primary-soft")}
          >
            <Link to={href}>{t.label}</Link>
          </Button>
        );
      })}
    </div>
  );
}
