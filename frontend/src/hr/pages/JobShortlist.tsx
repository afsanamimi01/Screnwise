import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import { Eye, Mail } from "lucide-react";
import { HrShell } from "@/hr/components/HrShell";
import { JobTabs } from "@/hr/components/JobTabs";
import { ScoreBadge } from "@/shared/components/ScoreBadge";
import { EmptyState, ErrorState, LoadingRows } from "@/shared/components/StateViews";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent } from "@/shared/components/ui/card";
import { getJob, getShortlist } from "@/shared/lib/api";
import { usePageTitle } from "@/shared/lib/use-page-title";

export default function JobShortlist() {
  usePageTitle("Shortlist — Screenwise");
  const { jobId = "" } = useParams();
  const jobQuery = useQuery({ queryKey: ["job", jobId], queryFn: () => getJob(jobId) });
  const query = useQuery({
    queryKey: ["shortlist", jobId],
    queryFn: () => getShortlist(jobId),
  });

  return (
    <HrShell
      allow={["hr", "admin"]}
      title={jobQuery.data ? `Shortlist — ${jobQuery.data.title}` : "Shortlist"}
      description="Identities are revealed for shortlisted candidates so you can contact them."
      actions={
        <Button asChild>
          <Link to={`/jobs/${jobId}/email`}>
            <Mail className="mr-2 h-4 w-4" /> Compose email
          </Link>
        </Button>
      }
    >
      <JobTabs jobId={jobId} />

      <div className="mb-5 flex items-start gap-3 rounded-xl border border-primary/30 bg-primary-soft p-4 text-sm text-primary">
        <Eye className="mt-0.5 h-4 w-4 shrink-0" />
        <p>
          Screening happened blind. Now that these candidates were shortlisted on their
          qualifications, their names and contact details are visible.
        </p>
      </div>

      {query.isLoading ? <LoadingRows rows={3} /> : null}
      {query.isError ? (
        <ErrorState message="We couldn't load the shortlist." onRetry={() => query.refetch()} />
      ) : null}
      {query.data && query.data.length === 0 ? (
        <EmptyState
          title="Nobody shortlisted yet"
          description="Head to the rank board and shortlist the candidates you want to talk to."
          action={
            <Button asChild>
              <Link to={`/jobs/${jobId}/board`}>Open rank board</Link>
            </Button>
          }
        />
      ) : null}

      <div className="space-y-3">
        {query.data?.map(({ app, candidate }) => (
          <Card key={app.id} className="shadow-card">
            <CardContent className="flex flex-wrap items-center gap-4 pt-6">
              <ScoreBadge score={app.score} size="lg" />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium">{candidate?.name ?? app.alias}</span>
                  <Badge variant="outline" className="font-normal text-muted-foreground">
                    {app.source}
                  </Badge>
                </div>
                <div className="text-sm text-muted-foreground">
                  {candidate?.email} · {candidate?.phone}
                </div>
                <div className="mt-1 text-sm">
                  {app.currentTitle} · <span className="num">{app.yearsExperience}</span> yrs ·{" "}
                  {app.educationLevel}
                </div>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {app.matchedSkills.map((s) => (
                    <Badge key={s} variant="secondary" className="font-normal">
                      {s}
                    </Badge>
                  ))}
                </div>
              </div>
              <Button variant="outline" asChild>
                <Link to={`/jobs/${jobId}/email`}>Message</Link>
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </HrShell>
  );
}
