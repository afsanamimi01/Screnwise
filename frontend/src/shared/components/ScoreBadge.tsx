import { cn } from "@/shared/lib/utils";

export function scoreBand(score: number) {
  if (score >= 75) return "strong" as const;
  if (score >= 50) return "mid" as const;
  return "low" as const;
}

const bandClasses = {
  strong: "bg-success-soft text-success border-success/30",
  mid: "bg-warning-soft text-warning-foreground border-warning/40",
  low: "bg-muted text-muted-foreground border-border",
};

export function ScoreBadge({
  score,
  size = "md",
  className,
}: {
  score: number;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const band = scoreBand(score);
  return (
    <span
      className={cn(
        "num inline-flex items-center justify-center rounded-lg border font-semibold",
        bandClasses[band],
        size === "sm" && "px-2 py-0.5 text-xs",
        size === "md" && "min-w-14 px-2.5 py-1 text-sm",
        size === "lg" && "min-w-18 px-3 py-1.5 text-lg",
        className,
      )}
    >
      {score}%
    </span>
  );
}
