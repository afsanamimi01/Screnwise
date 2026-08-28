import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import { CheckCircle2, Sparkles } from "lucide-react";
import { useState } from "react";
import { SiteFooter } from "@/shared/components/SiteFooter";
import { TagInput } from "@/shared/components/TagInput";
import { ErrorState, LoadingRows } from "@/shared/components/StateViews";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Checkbox } from "@/shared/components/ui/checkbox";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { getPublicJob, submitApplication } from "@/shared/lib/api";
import { useAuth } from "@/shared/lib/auth";
import { usePageTitle } from "@/shared/lib/use-page-title";

export default function Apply() {
  usePageTitle("Apply — Screenwise");
  const { jobId = "" } = useParams();
  const { user } = useAuth();
  const canApply = user?.role === "candidate";
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
  const [error, setError] = useState<string | null>(null);

  const set = (k: string, v: unknown) => setForm((p) => ({ ...p, [k]: v }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
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
      setError(err instanceof Error ? err.message : "Could not submit your application.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="border-b bg-card">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-5 py-4">
          <Link to="/" className="flex items-center gap-2">
            <div className="rounded-lg bg-primary p-1.5 text-primary-foreground">
              <Sparkles className="h-4 w-4" />
            </div>
            <span className="font-semibold tracking-tight">Screenwise</span>
          </Link>
          <Button variant="ghost" asChild>
            <Link to="/my-applications">Track my application</Link>
          </Button>
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl flex-1 px-5 py-10">
        {isLoading ? <LoadingRows rows={3} /> : null}
        {isError ? (
          <ErrorState message="We couldn't load this role." onRetry={() => refetch()} />
        ) : null}
        {!isLoading && !data ? (
          <Card>
            <CardContent className="py-14 text-center text-sm text-muted-foreground">
              This role isn't accepting public applications right now.
            </CardContent>
          </Card>
        ) : null}

        {data && done ? (
          <Card className="shadow-card">
            <CardContent className="flex flex-col items-center py-14 text-center">
              <CheckCircle2 className="mb-3 h-8 w-8 text-success" />
              <h1 className="text-xl font-semibold">Application received</h1>
              <p className="mt-2 max-w-md text-sm text-muted-foreground">
                Thanks for applying for {data.title}. Your CV will be screened blind, alongside
                everyone else's. You can follow your status any time.
              </p>
              <Button className="mt-6" asChild>
                <Link to="/my-applications">Track my status</Link>
              </Button>
            </CardContent>
          </Card>
        ) : null}

        {data && !done ? (
          <div className="space-y-6">
            <div>
              <Badge variant="outline" className="mb-3 font-normal">
                {data.employmentType} · {data.location}
              </Badge>
              <h1 className="text-3xl font-semibold">{data.title}</h1>
              <p className="mt-3 whitespace-pre-wrap text-muted-foreground">{data.description}</p>
              <div className="mt-4 flex flex-wrap gap-1.5">
                {data.requiredSkills.map((s) => (
                  <Badge key={s} variant="secondary" className="font-normal">
                    {s}
                  </Badge>
                ))}
              </div>
            </div>

            <Card className="shadow-card">
              <CardHeader>
                <CardTitle className="text-base">Apply</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <Label htmlFor="name">Full name</Label>
                    <Input
                      id="name"
                      required
                      value={form.name}
                      onChange={(e) => set("name", e.target.value)}
                      className="mt-1.5"
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
                      className="mt-1.5"
                    />
                  </div>
                  <div>
                    <Label htmlFor="phone">Phone</Label>
                    <Input
                      id="phone"
                      value={form.phone}
                      onChange={(e) => set("phone", e.target.value)}
                      className="mt-1.5"
                    />
                  </div>
                  <div>
                    <Label htmlFor="title">Current job title</Label>
                    <Input
                      id="title"
                      value={form.currentTitle}
                      onChange={(e) => set("currentTitle", e.target.value)}
                      className="mt-1.5"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <Label>Top skills</Label>
                    <div className="mt-1.5">
                      <TagInput
                        value={skills}
                        onChange={setSkills}
                        placeholder="Add a skill and press enter"
                      />
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
                      className="num mt-1.5"
                    />
                  </div>
                  <div>
                    <Label htmlFor="cv">CV (PDF or DOCX)</Label>
                    <Input
                      id="cv"
                      type="file"
                      accept=".pdf,.docx"
                      className="mt-1.5"
                      onChange={(e) => set("cvFileName", e.target.files?.[0]?.name ?? "")}
                    />
                  </div>
                  <label className="flex items-start gap-3 text-sm sm:col-span-2">
                    <Checkbox
                      checked={form.eligible}
                      onCheckedChange={(c) => set("eligible", Boolean(c))}
                    />
                    <span>Are you legally eligible to work in {data.location}?</span>
                  </label>
                  <label className="flex items-start gap-3 text-sm sm:col-span-2">
                    <Checkbox
                      required
                      checked={form.consent}
                      onCheckedChange={(c) => set("consent", Boolean(c))}
                    />
                    <span>
                      I agree that my CV and the details above may be processed for this application.
                    </span>
                  </label>
                  {error ? (
                    <p className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-destructive sm:col-span-2">
                      {error}
                    </p>
                  ) : null}
                  {canApply ? (
                    <Button type="submit" disabled={submitting} className="sm:col-span-2">
                      {submitting ? "Submitting…" : "Submit application"}
                    </Button>
                  ) : (
                    <div className="rounded-lg border bg-muted/50 p-3 text-sm sm:col-span-2">
                      <Link to="/login" className="font-medium text-primary hover:underline">
                        Sign in as a candidate
                      </Link>{" "}
                      to submit this application.
                    </div>
                  )}
                </form>
              </CardContent>
            </Card>
          </div>
        ) : null}
      </main>

      <SiteFooter role={user?.role} />
    </div>
  );
}
