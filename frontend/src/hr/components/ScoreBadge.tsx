import { cn } from "@/shared/lib/utils";
import "./ScoreBadge.css";

export function scoreBand(score: number) {
  if (score >= 75) return "strong" as const;
  if (score >= 50) return "mid" as const;
  return "low" as const;
}

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
        "score-badge",
        `score-badge--${band}`,
        `score-badge--${size}`,
        className,
      )}
    >
      {score}%
    </span>
  );
}
