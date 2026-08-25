import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams } from "react-router-dom";
import { Eye } from "lucide-react";
import { HrLayout } from "@/hr/components/HrLayout";
import { JobTabs } from "@/hr/components/JobTabs";
import { ScoreBadge } from "@/hr/components/ScoreBadge";
import { EmptyState, ErrorState, LoadingRows } from "@/shared/components/StateViews";
import { Badge } from "@/shared/components/ui/badge";
import { Card, CardContent } from "@/shared/components/ui/card";
import { ComposeEmailButton, OpenRankBoardButton, MessageButton } from "@/hr/components/buttons/Buttons";
import { getApplicationsForJob, getCandidates, getJob } from "@/shared/lib/api";
import "./JobShortlist.css";

export function JobShortlist() {
  const { jobId = "" } = useParams<{ jobId: string }>();

  useEffect(() => {
    document.title = "Shortlist — Screenwise";
  }, []);

  const jobQuery = useQuery({ queryKey: ["job", jobId], queryFn: () => getJob(jobId) });
  const query = useQuery({
    queryKey: ["shortlist", jobId],
    queryFn: async () => {
      const [apps, candidates] = await Promise.all([getApplicationsForJob(jobId), getCandidates()]);
      return apps
        .filter((a) => a.status === "shortlisted")
        .map((a) => ({ app: a, candidate: candidates.find((c) => c.id === a.candidateId) }));
    },
  });

  return (
    <HrLayout
      title={jobQuery.data ? `Shortlist — ${jobQuery.data.title}` : "Shortlist"}
      description="Identities are revealed for shortlisted candidates so you can contact them."
      actions={<ComposeEmailButton jobId={jobId} />}
    >
      <JobTabs jobId={jobId} />

      <div className="job-shortlist__notice">
        <Eye className="job-shortlist__notice-icon" />
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
          action={<OpenRankBoardButton jobId={jobId} />}
        />
      ) : null}

      <div className="job-shortlist__list">
        {query.data?.map(({ app, candidate }) => (
          <Card key={app.id} className="job-shortlist__card">
            <CardContent className="job-shortlist__card-content">
              <ScoreBadge score={app.score} size="lg" />
              <div className="job-shortlist__main">
                <div className="job-shortlist__title-line">
                  <span className="job-shortlist__name">{candidate?.name ?? app.alias}</span>
                  <Badge variant="outline" className="job-shortlist__source-badge">
                    {app.source}
                  </Badge>
                </div>
                <div className="job-shortlist__contact">
                  {candidate?.email} · {candidate?.phone}
                </div>
                <div className="job-shortlist__facts">
                  {app.currentTitle} · <span className="job-shortlist__numeric">{app.yearsExperience}</span>{" "}
                  yrs · {app.educationLevel}
                </div>
                <div className="job-shortlist__skills">
                  {app.matchedSkills.map((s) => (
                    <Badge key={s} variant="secondary" className="job-shortlist__skill-badge">
                      {s}
                    </Badge>
                  ))}
                </div>
              </div>
              <MessageButton jobId={jobId} />
            </CardContent>
          </Card>
        ))}
      </div>
    </HrLayout>
  );
}
