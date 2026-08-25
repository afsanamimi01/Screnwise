import { useEffect, useState, type FormEvent } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import { CheckCircle2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { TagInput } from "@/shared/components/TagInput";
import { ErrorState, LoadingRows } from "@/shared/components/StateViews";
import { Badge } from "@/shared/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Checkbox } from "@/shared/components/ui/checkbox";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import {
  TrackMyApplicationButton,
  TrackMyStatusButton,
  SubmitApplicationButton,
} from "@/candidate/components/buttons/Buttons";
import { getPublicJob, submitApplication } from "@/shared/lib/api";
import "./ApplyForm.css";

export function ApplyForm() {
  const { jobId = "" } = useParams<{ jobId: string }>();

  useEffect(() => {
    document.title = "Apply — Screenwise";
  }, []);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["public-job", jobId],
    queryFn: () => getPublicJob(jobId),
  });

  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    years: 0,
    currentTitle: "",
    cvFileName: "",
    eligible: false,
    consent: false,
  });
  const [skills, setSkills] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const set = (k: string, v: unknown) => setForm((p) => ({ ...p, [k]: v }));

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await submitApplication({
        jobId,
        name: form.name,
        email: form.email,
        phone: form.phone,
        skills,
        years: form.years,
        currentTitle: form.currentTitle,
        cvFileName: form.cvFileName || "cv.pdf",
      });
      setDone(true);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not submit application");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="apply-form-page">
      <header className="apply-form-page__header">
        <div className="apply-form-page__header-inner">
          <Link to="/" className="apply-form-page__brand">
            <div className="apply-form-page__brand-icon">
              <Sparkles className="apply-form-page__brand-icon-glyph" />
            </div>
            <span className="apply-form-page__brand-name">Screenwise</span>
          </Link>
          <TrackMyApplicationButton />
        </div>
      </header>

      <main className="apply-form-page__main">
        {isLoading ? <LoadingRows rows={3} /> : null}
        {isError ? <ErrorState message="We couldn't load this role." onRetry={() => refetch()} /> : null}
        {!isLoading && !data ? (
          <Card>
            <CardContent className="apply-form-page__unavailable-msg">
              This role isn't accepting public applications right now.
            </CardContent>
          </Card>
        ) : null}

        {data && done ? (
          <Card className="apply-form-page__form-card">
            <CardContent className="apply-form-page__success-content">
              <CheckCircle2 className="apply-form-page__success-icon" />
              <h1 className="apply-form-page__success-title">Application received</h1>
              <p className="apply-form-page__success-body">
                Thanks for applying for {data.title}. Your CV will be screened blind, alongside
                everyone else's. You can follow your status any time.
              </p>
              <TrackMyStatusButton />
            </CardContent>
          </Card>
        ) : null}

        {data && !done ? (
          <div className="apply-form-page__job-and-form">
            <div>
              <Badge variant="outline" className="apply-form-page__job-badge">
                {data.employmentType} · {data.location}
              </Badge>
              <h1 className="apply-form-page__job-title">{data.title}</h1>
              <p className="apply-form-page__job-description">{data.description}</p>
              <div className="apply-form-page__job-skills">
                {data.requiredSkills.map((s) => (
                  <Badge key={s} variant="secondary" className="apply-form-page__job-skill-badge">
                    {s}
                  </Badge>
                ))}
              </div>
            </div>

            <Card className="apply-form-page__form-card">
              <CardHeader>
                <CardTitle className="apply-form-page__form-title">Apply</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={submit} className="apply-form-page__form-grid">
                  <div>
                    <Label htmlFor="name">Full name</Label>
                    <Input
                      id="name"
                      required
                      value={form.name}
                      onChange={(e) => set("name", e.target.value)}
                      className="apply-form-page__field-input"
                    />
                  </div>
                  <div>
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      required
                      value={form.email}
                      onChange={(e) => set("email", e.target.value)}
                      className="apply-form-page__field-input"
                    />
                  </div>
                  <div>
                    <Label htmlFor="phone">Phone</Label>
                    <Input
                      id="phone"
                      value={form.phone}
                      onChange={(e) => set("phone", e.target.value)}
                      className="apply-form-page__field-input"
                    />
                  </div>
                  <div>
                    <Label htmlFor="title">Current job title</Label>
                    <Input
                      id="title"
                      value={form.currentTitle}
                      onChange={(e) => set("currentTitle", e.target.value)}
                      className="apply-form-page__field-input"
                    />
                  </div>
                  <div className="apply-form-page__skills-field">
                    <Label>Top skills</Label>
                    <div className="apply-form-page__skills-input-wrap">
                      <TagInput value={skills} onChange={setSkills} placeholder="Add a skill and press enter" />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="years">Total years of experience</Label>
                    <Input
                      id="years"
                      type="number"
                      min={0}
                      value={form.years}
                      onChange={(e) => set("years", Number(e.target.value))}
                      className="apply-form-page__years-input"
                    />
                  </div>
                  <div>
                    <Label htmlFor="cv">CV (PDF or DOCX)</Label>
                    <Input
                      id="cv"
                      type="file"
                      accept=".pdf,.docx"
                      className="apply-form-page__field-input"
                      onChange={(e) => set("cvFileName", e.target.files?.[0]?.name ?? "")}
                    />
                  </div>
                  <label className="apply-form-page__checkbox-label">
                    <Checkbox checked={form.eligible} onCheckedChange={(c) => set("eligible", Boolean(c))} />
                    <span>Are you legally eligible to work in {data.location}?</span>
                  </label>
                  <label className="apply-form-page__checkbox-label">
                    <Checkbox required checked={form.consent} onCheckedChange={(c) => set("consent", Boolean(c))} />
                    <span>
                      I agree that my CV and the details above may be processed for this application.
                    </span>
                  </label>
                  <SubmitApplicationButton submitting={submitting} />
                </form>
              </CardContent>
            </Card>
          </div>
        ) : null}
      </main>
    </div>
  );
}
