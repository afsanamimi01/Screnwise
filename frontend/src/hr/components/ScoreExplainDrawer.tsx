import { AlertTriangle, Check, X } from "lucide-react";
import { Badge } from "@/shared/components/ui/badge";
import { Progress } from "@/shared/components/ui/progress";
import { ScoreBadge } from "@/hr/components/ScoreBadge";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/shared/components/ui/sheet";
import type { Application, Job } from "@/shared/lib/types";
import "./ScoreExplainDrawer.css";

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
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="score-explain-drawer">
        {application ? (
          <>
            <SheetHeader>
              <SheetTitle className="score-explain-drawer__title">
                {application.alias}
                <ScoreBadge score={application.score} />
              </SheetTitle>
              <SheetDescription>
                Why this candidate scored what they scored, dimension by dimension. Identity stays
                hidden until you shortlist.
              </SheetDescription>
            </SheetHeader>

            <div className="score-explain-drawer__body">
              {application.needsManualReview ? (
                <div className="score-explain-drawer__review-notice">
                  <AlertTriangle className="score-explain-drawer__review-icon" />
                  <div>
                    <p className="score-explain-drawer__review-title">Needs manual review</p>
                    <p className="score-explain-drawer__review-text">
                      The CV ({application.cvFileName}) could not be parsed cleanly, so no score was
                      produced. Open the file and review this candidate by hand — they have not been
                      removed from consideration.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="score-explain-drawer__breakdown">
                  <p className="score-explain-drawer__summary">
                    Matched {application.matchedSkills.length} of{" "}
                    {application.matchedSkills.length + application.missingSkills.length} required
                    skills; {application.yearsExperience} years of experience vs. {job?.minYears ?? 0}{" "}
                    required.
                  </p>
                  {application.scoreBreakdown.map((item) => (
                    <div key={item.dimension} className="score-explain-drawer__dimension">
                      <div className="score-explain-drawer__dimension-row">
                        <span className="score-explain-drawer__dimension-name">{item.dimension}</span>
                        <span className="score-explain-drawer__dimension-score">
                          {item.scored} / {item.weight}
                        </span>
                      </div>
                      <Progress value={(item.scored / Math.max(1, item.weight)) * 100} />
                      <p className="score-explain-drawer__dimension-note">{item.note}</p>
                    </div>
                  ))}
                </div>
              )}

              <div>
                <h4 className="score-explain-drawer__section-title">Skills</h4>
                <div className="score-explain-drawer__skills">
                  {application.matchedSkills.map((s) => (
                    <Badge key={s} className="score-explain-drawer__skill-matched">
                      <Check className="score-explain-drawer__skill-icon" /> {s}
                    </Badge>
                  ))}
                  {application.missingSkills.map((s) => (
                    <Badge variant="outline" key={s} className="score-explain-drawer__skill-missing">
                      <X className="score-explain-drawer__skill-icon" /> {s}
                    </Badge>
                  ))}
                </div>
              </div>

              <dl className="score-explain-drawer__facts">
                <div>
                  <dt className="score-explain-drawer__fact-label">Current title</dt>
                  <dd className="score-explain-drawer__fact-value">{application.currentTitle}</dd>
                </div>
                <div>
                  <dt className="score-explain-drawer__fact-label">Past titles</dt>
                  <dd className="score-explain-drawer__fact-value">
                    {application.pastTitles.join(", ") || "—"}
                  </dd>
                </div>
                <div>
                  <dt className="score-explain-drawer__fact-label">Education</dt>
                  <dd className="score-explain-drawer__fact-value">{application.educationLevel}</dd>
                </div>
                <div>
                  <dt className="score-explain-drawer__fact-label">Source</dt>
                  <dd className="score-explain-drawer__fact-value">{application.source}</dd>
                </div>
              </dl>
            </div>
          </>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
