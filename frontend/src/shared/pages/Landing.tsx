import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { ArrowRight, EyeOff, ListChecks, Scale, Sparkles } from "lucide-react";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent } from "@/shared/components/ui/card";
import { SiteFooter } from "@/shared/components/SiteFooter";
import { EmptyState, ErrorState, LoadingRows } from "@/shared/components/StateViews";
import { getPublicJobs } from "@/shared/lib/api";
import { usePageTitle } from "@/shared/lib/use-page-title";

const pillars = [
  {
    icon: EyeOff,
    title: "Blind by default",
    body: "Names, photos, age, address and university are hidden while you screen. Identity is revealed only after you shortlist.",
  },
  {
    icon: Scale,
    title: "Explainable scores",
    body: "Every match score opens into a breakdown: skills matched, experience gap, education, certifications, keywords.",
  },
  {
    icon: ListChecks,
    title: "Nobody is auto-rejected",
    body: "Below-threshold candidates are collapsed, never deleted. The system suggests, you decide.",
  },
];

export default function Landing() {
  usePageTitle("Screenwise — blind, explainable CV screening");
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["public-jobs"],
    queryFn: () => getPublicJobs(),
  });

  return (
    <div className="min-h-screen bg-background">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5">
        <div className="flex items-center gap-2">
          <div className="rounded-lg bg-primary p-1.5 text-primary-foreground">
            <Sparkles className="h-4 w-4" />
          </div>
          <span className="font-semibold tracking-tight">Screenwise</span>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" asChild>
            <Link to="/login">Sign in</Link>
          </Button>
          <Button asChild>
            <Link to="/register">Create account</Link>
          </Button>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-5 pt-10 pb-16">
        <Badge variant="outline" className="mb-4 font-normal">
          Applicant screening, without the bias
        </Badge>
        <h1 className="max-w-3xl text-4xl font-semibold tracking-tight sm:text-5xl">
          Screen hundreds of CVs fairly, and still make the call yourself.
        </h1>
        <p className="mt-4 max-w-2xl text-lg text-muted-foreground">
          Screenwise parses every CV, scores it against the job you defined, and ranks candidates on
          a blind board. You shortlist. Only then does the platform show you who they are.
        </p>
        <div className="mt-7 flex flex-wrap gap-3">
          <Button size="lg" asChild>
            <Link to="/login">
              Open the demo dashboard <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>

        <div className="mt-14 grid gap-4 md:grid-cols-3">
          {pillars.map((p) => (
            <Card key={p.title} className="shadow-card">
              <CardContent className="pt-6">
                <div className="mb-3 w-fit rounded-lg bg-primary-soft p-2 text-primary">
                  <p.icon className="h-5 w-5" />
                </div>
                <h2 className="text-base font-semibold">{p.title}</h2>
                <p className="mt-1.5 text-sm text-muted-foreground">{p.body}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="border-t bg-card">
        <div className="mx-auto max-w-6xl px-5 py-14">
          <h2 className="text-2xl font-semibold">Open roles</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Applying takes a couple of minutes and you can track your status afterwards.
          </p>
          <div className="mt-6 space-y-3">
            {isLoading ? <LoadingRows rows={2} /> : null}
            {isError ? (
              <ErrorState message="We couldn't load the open roles." onRetry={() => refetch()} />
            ) : null}
            {data && data.length === 0 ? (
              <EmptyState
                title="No public roles right now"
                description="Check back soon — new roles are published regularly."
              />
            ) : null}
            {data?.map((job) => (
              <Link
                key={job.id}
                to={`/apply/${job.id}`}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-background p-4 transition-colors hover:border-primary/40"
              >
                <div>
                  <div className="font-medium">{job.title}</div>
                  <div className="text-sm text-muted-foreground">
                    {job.department} · {job.location} · {job.employmentType}
                  </div>
                </div>
                <span className="flex items-center gap-1 text-sm font-medium text-primary">
                  Apply <ArrowRight className="h-4 w-4" />
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
