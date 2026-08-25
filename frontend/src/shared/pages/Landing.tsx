import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { ArrowRight, EyeOff, ListChecks, Scale, Sparkles } from "lucide-react";
import { Badge } from "@/shared/components/ui/badge";
import { Card, CardContent } from "@/shared/components/ui/card";
import { EmptyState, ErrorState, LoadingRows } from "@/shared/components/StateViews";
import {
  SignInLinkButton,
  CreateAccountLinkButton,
  OpenDemoDashboardButton,
} from "@/shared/components/buttons/Buttons";
import { getPublicJobs } from "@/shared/lib/api";
import "./Landing.css";

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

export function Landing() {
  useEffect(() => {
    document.title = "Screenwise — blind, explainable CV screening";
  }, []);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["public-jobs"],
    queryFn: () => getPublicJobs(),
  });

  return (
    <div className="landing">
      <header className="landing__header">
        <div className="landing__brand">
          <div className="landing__brand-icon">
            <Sparkles className="landing__brand-icon-glyph" />
          </div>
          <span className="landing__brand-name">Screenwise</span>
        </div>
        <div className="landing__header-actions">
          <SignInLinkButton />
          <CreateAccountLinkButton />
        </div>
      </header>

      <section className="landing__hero">
        <Badge variant="outline" className="landing__badge">
          Applicant screening, without the bias
        </Badge>
        <h1 className="landing__title">
          Screen hundreds of CVs fairly, and still make the call yourself.
        </h1>
        <p className="landing__subtitle">
          Screenwise parses every CV, scores it against the job you defined, and ranks candidates on
          a blind board. You shortlist. Only then does the platform show you who they are.
        </p>
        <div className="landing__cta">
          <OpenDemoDashboardButton />
        </div>

        <div className="landing__pillars">
          {pillars.map((p) => (
            <Card key={p.title} className="landing__pillar-card">
              <CardContent className="landing__pillar-content">
                <div className="landing__pillar-icon-wrap">
                  <p.icon className="landing__pillar-icon" />
                </div>
                <h2 className="landing__pillar-title">{p.title}</h2>
                <p className="landing__pillar-body">{p.body}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="landing__roles-section">
        <div className="landing__roles-inner">
          <h2 className="landing__roles-title">Open roles</h2>
          <p className="landing__roles-subtitle">
            Applying takes a couple of minutes and you can track your status afterwards.
          </p>
          <div className="landing__roles-list">
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
              <Link key={job.id} to={`/apply/${job.id}`} className="landing__role-row">
                <div>
                  <div className="landing__role-title">{job.title}</div>
                  <div className="landing__role-meta">
                    {job.department} · {job.location} · {job.employmentType}
                  </div>
                </div>
                <span className="landing__role-apply">
                  Apply <ArrowRight className="landing__role-apply-icon" />
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
