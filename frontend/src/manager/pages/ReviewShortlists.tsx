import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { ManagerShell } from "@/manager/components/ManagerShell";
import { ScoreBadge } from "@/shared/components/ScoreBadge";
import { EmptyState, ErrorState, LoadingRows } from "@/shared/components/StateViews";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Textarea } from "@/shared/components/ui/textarea";
import { getManagerShortlists, sendManagerFeedback } from "@/shared/lib/api";
import { useAuth } from "@/shared/lib/auth";
import { usePageTitle } from "@/shared/lib/use-page-title";

export default function ReviewShortlists() {
  usePageTitle("Shortlists to review — Screenwise");
  const { user } = useAuth();
  const [feedback, setFeedback] = useState<Record<string, string>>({});
  const [sending, setSending] = useState<string | null>(null);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["manager-shortlists", user?.id],
    enabled: Boolean(user),
    queryFn: () => getManagerShortlists(),
  });

  const submitFeedback = async (jobId: string) => {
    setSending(jobId);
    try {
      await sendManagerFeedback(jobId, feedback[jobId] ?? "");
      toast.success("Feedback shared with the recruiter.");
      setFeedback((p) => ({ ...p, [jobId]: "" }));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not send feedback.");
    } finally {
      setSending(null);
    }
  };

  return (
    <ManagerShell
      allow={["manager"]}
      title="Shortlists to review"
      description="Read-only view of the shortlists for roles you're attached to."
    >
      {isLoading ? <LoadingRows rows={3} /> : null}
      {isError ? (
        <ErrorState message="We couldn't load your shortlists." onRetry={() => refetch()} />
      ) : null}
      {data && data.length === 0 ? (
        <EmptyState
          title="Nothing to review"
          description="You'll see shortlists here once you're attached to a role."
        />
      ) : null}

      <div className="space-y-6">
        {data?.map(({ job, entries }) => (
          <Card key={job.id} className="shadow-card">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">{job.title}</CardTitle>
              <Badge variant="outline" className="font-normal text-muted-foreground">
                {job.department} · {job.location}
              </Badge>
            </CardHeader>
            <CardContent className="space-y-3">
              {entries.length === 0 ? (
                <p className="text-sm text-muted-foreground">No shortlisted candidates yet.</p>
              ) : (
                entries.map(({ app, candidate }) => (
                  <div
                    key={app.id}
                    className="flex flex-wrap items-center gap-4 rounded-lg border p-3"
                  >
                    <ScoreBadge score={app.score} />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium">{candidate?.name ?? app.alias}</span>
                        <Badge className="bg-primary-soft font-normal capitalize text-primary">
                          {app.status}
                        </Badge>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {app.currentTitle} · <span className="num">{app.yearsExperience}</span> yrs ·{" "}
                        {candidate?.email}
                      </div>
                    </div>
                  </div>
                ))
              )}
              <div>
                <Textarea
                  rows={3}
                  placeholder="Feedback for the recruiter…"
                  value={feedback[job.id] ?? ""}
                  onChange={(e) => setFeedback((p) => ({ ...p, [job.id]: e.target.value }))}
                />
                <Button
                  className="mt-2"
                  size="sm"
                  disabled={sending === job.id}
                  onClick={() => submitFeedback(job.id)}
                >
                  {sending === job.id ? "Sending…" : "Send feedback"}
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </ManagerShell>
  );
}
