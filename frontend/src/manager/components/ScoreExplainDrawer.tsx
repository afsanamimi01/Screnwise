import { useEffect } from "react";
import { AlertTriangle, Check, X } from "lucide-react";
import { scoreBand } from "@/shared/components/ScoreBadge";
import type { Application, Job } from "@/shared/lib/types";
import "./ScoreExplainDrawer.css";

/** Rows in the identity dl, in display order. */
const DETAILS: { label: string; value: (a: Application) => string }[] = [
  { label: "Current title", value: (a) => a.currentTitle },
  { label: "Past titles", value: (a) => a.pastTitles.join(", ") || "-" },
  { label: "Education", value: (a) => a.educationLevel },
  { label: "Source", value: (a) => a.source },
];

export function ScoreExplainDrawer({
  application,
  job,
  open,
  onOpenChange,
}: {
  application: Application | null;
  job: Job | undefined;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onOpenChange(false);
    if (open) window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onOpenChange]);

  if (!open || !application) return null;

  return (
    <div className="manager-score-drawer">
      <div className="manager-score-drawer__scrim" onClick={() => onOpenChange(false)} />
      <aside className="manager-score-drawer__panel" role="dialog" aria-modal="true">
        <button
          type="button"
          className="manager-score-drawer__close"
          onClick={() => onOpenChange(false)}
          aria-label="Close"
        >
          <X size={16} />
        </button>

        <header className="manager-score-drawer__head">
          <div className="manager-score-drawer__title-row">
            <h2 className="manager-score-drawer__title">{application.alias}</h2>
            <span
              className={`manager-score-drawer__score manager-score-drawer__score--${scoreBand(
                application.score,
              )}`}
            >
              {application.score}%
            </span>
          </div>
          <p className="manager-score-drawer__desc">
            Why this candidate scored what they scored, dimension by dimension. Identity stays hidden
            until you shortlist.
          </p>
        </header>

        <div className="manager-score-drawer__body">
          {application.needsManualReview ? (
            <div className="manager-score-drawer__notice">
              <AlertTriangle size={16} />
              <div>
                <p className="manager-score-drawer__notice-title">Needs manual review</p>
                <p className="manager-score-drawer__notice-text">
                  The CV ({application.cvFileName}) could not be parsed cleanly, so no score was
                  produced. Open the file and review this candidate by hand - they have not been
                  removed from consideration.
                </p>
              </div>
            </div>
          ) : (
            <div className="manager-score-drawer__dims">
              <p className="manager-score-drawer__summary">
                Matched {application.matchedSkills.length} of{" "}
                {application.matchedSkills.length + application.missingSkills.length} required skills;{" "}
                {application.yearsExperience} years of experience vs. {job?.minYears ?? 0} required.
              </p>
              {application.scoreBreakdown.map((item) => (
                <div key={item.dimension} className="manager-score-drawer__dim">
                  <div className="manager-score-drawer__dim-head">
                    <span className="manager-score-drawer__dim-name">{item.dimension}</span>
                    <span className="manager-score-drawer__dim-num">
                      {item.scored} / {item.weight}
                    </span>
                  </div>
                  <div className="manager-score-drawer__track">
                    <div
                      className="manager-score-drawer__bar"
                      style={{
                        width: `${(item.scored / Math.max(1, item.weight)) * 100}%`,
                      }}
                    />
                  </div>
                  <p className="manager-score-drawer__dim-note">{item.note}</p>
                </div>
              ))}
            </div>
          )}

          <div>
            <h3 className="manager-score-drawer__section-title">Skills</h3>
            <div className="manager-score-drawer__skills">
              {application.matchedSkills.map((s) => (
                <span
                  key={s}
                  className="manager-score-drawer__skill manager-score-drawer__skill--matched"
                >
                  <Check size={12} /> {s}
                </span>
              ))}
              {application.missingSkills.map((s) => (
                <span
                  key={s}
                  className="manager-score-drawer__skill manager-score-drawer__skill--missing"
                >
                  <X size={12} /> {s}
                </span>
              ))}
            </div>
          </div>

          <dl className="manager-score-drawer__details">
            {DETAILS.map((d) => (
              <div key={d.label}>
                <dt className="manager-score-drawer__dt">{d.label}</dt>
                <dd className="manager-score-drawer__dd">{d.value(application)}</dd>
              </div>
            ))}
          </dl>
        </div>
      </aside>
    </div>
  );
}
