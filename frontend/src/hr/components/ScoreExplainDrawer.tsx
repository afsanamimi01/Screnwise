import { AlertTriangle, Check, X } from "lucide-react";
import { Badge } from "@/shared/components/ui/badge";
import { Progress } from "@/shared/components/ui/progress";
import { ScoreBadge } from "@/shared/components/ScoreBadge";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/shared/components/ui/sheet";
import type { Application, Job } from "@/shared/lib/types";

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
      <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
        {application ? (
          <>
            <SheetHeader>
              <SheetTitle className="flex items-center gap-3">
                {application.alias}
                <ScoreBadge score={application.score} />
              </SheetTitle>
              <SheetDescription>
                Why this candidate scored what they scored, dimension by dimension. Identity stays
                hidden until you shortlist.
              </SheetDescription>
            </SheetHeader>

            <div className="space-y-6 px-4 pb-8">
              {application.needsManualReview ? (
                <div className="flex gap-3 rounded-lg border border-warning/40 bg-warning-soft p-3 text-sm">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning-foreground" />
                  <div>
                    <p className="font-medium">Needs manual review</p>
                    <p className="text-muted-foreground">
                      The CV ({application.cvFileName}) could not be parsed cleanly, so no score was
                      produced. Open the file and review this candidate by hand — they have not been
                      removed from consideration.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Matched {application.matchedSkills.length} of{" "}
                    {application.matchedSkills.length + application.missingSkills.length} required
                    skills; {application.yearsExperience} years of experience vs. {job?.minYears ?? 0}{" "}
                    required.
                  </p>
                  {application.scoreBreakdown.map((item) => (
                    <div key={item.dimension} className="space-y-1.5">
                      <div className="flex items-baseline justify-between text-sm">
                        <span className="font-medium">{item.dimension}</span>
                        <span className="num text-muted-foreground">
                          {item.scored} / {item.weight}
                        </span>
                      </div>
                      <Progress value={(item.scored / Math.max(1, item.weight)) * 100} />
                      <p className="text-xs text-muted-foreground">{item.note}</p>
                    </div>
                  ))}
                </div>
              )}

              <div>
                <h4 className="mb-2 text-sm font-medium">Skills</h4>
                <div className="flex flex-wrap gap-1.5">
                  {application.matchedSkills.map((s) => (
                    <Badge key={s} className="gap-1 bg-success-soft font-normal text-success">
                      <Check className="h-3 w-3" /> {s}
                    </Badge>
                  ))}
                  {application.missingSkills.map((s) => (
                    <Badge key={s} variant="outline" className="gap-1 font-normal text-muted-foreground">
                      <X className="h-3 w-3" /> {s}
                    </Badge>
                  ))}
                </div>
              </div>

              <dl className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <dt className="text-muted-foreground">Current title</dt>
                  <dd className="font-medium">{application.currentTitle}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Past titles</dt>
                  <dd className="font-medium">{application.pastTitles.join(", ") || "—"}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Education</dt>
                  <dd className="font-medium">{application.educationLevel}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Source</dt>
                  <dd className="font-medium">{application.source}</dd>
                </div>
              </dl>
            </div>
          </>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
