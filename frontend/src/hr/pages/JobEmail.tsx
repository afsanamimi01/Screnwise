import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams } from "react-router-dom";
import { FlaskConical, Send } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { HrShell } from "@/hr/components/HrShell";
import { JobTabs } from "@/hr/components/JobTabs";
import { EmptyState, ErrorState, LoadingRows } from "@/shared/components/StateViews";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Checkbox } from "@/shared/components/ui/checkbox";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import { Textarea } from "@/shared/components/ui/textarea";
import { getJob, getSentEmails, getShortlist, sendShortlistEmails } from "@/shared/lib/api";
import { useAuth } from "@/shared/lib/auth";
import { usePageTitle } from "@/shared/lib/use-page-title";

const templates: Record<string, { subject: string; body: string }> = {
  "Invite to interview": {
    subject: "Interview invitation — {{job_title}}",
    body: "Hi {{candidate_name}},\n\nThank you for applying for {{job_title}}. We'd love to talk further — could you share a few times that work for you next week?\n\nBest,\nThe hiring team",
  },
  "Request more info": {
    subject: "A quick follow-up on your {{job_title}} application",
    body: "Hi {{candidate_name}},\n\nThanks for your application for {{job_title}}. Could you tell us a little more about your recent work, and share any portfolio or code samples?\n\nBest,\nThe hiring team",
  },
  "Rejection with feedback": {
    subject: "Update on your {{job_title}} application",
    body: "Hi {{candidate_name}},\n\nThank you for the time you put into your application for {{job_title}}. We've decided to move forward with other candidates this time. Here's the feedback from our review: ...\n\nWe'd genuinely welcome a future application.\n\nBest,\nThe hiring team",
  },
};

export default function JobEmail() {
  usePageTitle("Email composer — Screenwise");
  const { jobId = "" } = useParams();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const jobQuery = useQuery({ queryKey: ["job", jobId], queryFn: () => getJob(jobId) });
  const query = useQuery({
    queryKey: ["shortlist", jobId],
    queryFn: () => getShortlist(jobId),
  });
  const sentQuery = useQuery({ queryKey: ["emails", jobId], queryFn: () => getSentEmails(jobId) });

  const [template, setTemplate] = useState("Invite to interview");
  const [subject, setSubject] = useState(templates["Invite to interview"]!.subject);
  const [body, setBody] = useState(templates["Invite to interview"]!.body);
  const [selected, setSelected] = useState<string[]>([]);
  const [sending, setSending] = useState(false);

  const applyTemplate = (name: string) => {
    setTemplate(name);
    const t = templates[name];
    if (t) {
      setSubject(t.subject);
      setBody(t.body);
    }
  };

  const rows = query.data ?? [];
  const firstName =
    rows.find((r) => selected.includes(r.app.id))?.candidate?.name ?? "Candidate name";
  const render = (text: string) =>
    text
      .replaceAll("{{candidate_name}}", firstName)
      .replaceAll("{{job_title}}", jobQuery.data?.title ?? "the role");

  const send = async () => {
    if (!selected.length) {
      toast.error("Pick at least one recipient.");
      return;
    }
    setSending(true);
    await sendShortlistEmails({
      jobId,
      subject,
      body,
      template,
      recipients: rows
        .filter((r) => selected.includes(r.app.id))
        .map((r) => r.candidate?.email ?? "unknown"),
    });
    setSending(false);
    setSelected([]);
    await queryClient.invalidateQueries({ queryKey: ["emails", jobId] });
    toast.success("Simulated send complete — logged below, no real email was delivered.");
  };

  return (
    <HrShell
      allow={["hr", "admin"]}
      title="Email shortlisted candidates"
      description="Write once, send to many. Sandbox mode: messages are logged, never delivered."
    >
      <JobTabs jobId={jobId} />

      <div className="mb-5 flex items-center gap-2 rounded-xl border border-warning/40 bg-warning-soft px-4 py-3 text-sm text-warning-foreground">
        <FlaskConical className="h-4 w-4" /> Sandbox mode is on. Nothing leaves this demo.
      </div>

      {query.isLoading ? <LoadingRows rows={3} /> : null}
      {query.isError ? (
        <ErrorState message="We couldn't load the shortlist." onRetry={() => query.refetch()} />
      ) : null}
      {query.data && rows.length === 0 ? (
        <EmptyState
          title="No shortlisted candidates"
          description="Shortlist candidates on the rank board first — you can only email people you shortlisted."
        />
      ) : null}

      {rows.length > 0 ? (
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            <Card className="shadow-card">
              <CardHeader>
                <CardTitle className="text-base">Message</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Template</Label>
                  <Select value={template} onValueChange={applyTemplate}>
                    <SelectTrigger className="mt-1.5">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.keys(templates).map((t) => (
                        <SelectItem key={t} value={t}>
                          {t}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="subject">Subject</Label>
                  <Input
                    id="subject"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    className="mt-1.5"
                  />
                </div>
                <div>
                  <Label htmlFor="body">Body</Label>
                  <Textarea
                    id="body"
                    rows={10}
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                    className="mt-1.5"
                  />
                  <p className="mt-1.5 text-xs text-muted-foreground">
                    Variables: {"{{candidate_name}}"} and {"{{job_title}}"}
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-card">
              <CardHeader>
                <CardTitle className="text-base">Preview</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="rounded-lg border bg-muted/40 p-4 text-sm">
                  <div className="font-medium">{render(subject)}</div>
                  <p className="mt-3 whitespace-pre-wrap text-muted-foreground">{render(body)}</p>
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-card">
              <CardHeader>
                <CardTitle className="text-base">Sent log (simulated)</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {sentQuery.data && sentQuery.data.length > 0 ? (
                  sentQuery.data.map((mail) => (
                    <div key={mail.id} className="rounded-lg border p-3 text-sm">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="font-medium">{mail.subject}</span>
                        <span className="text-xs text-muted-foreground">{mail.sentAt}</span>
                      </div>
                      <div className="mt-1 text-xs text-muted-foreground">
                        {mail.template} · {mail.recipients.length} recipient(s):{" "}
                        {mail.recipients.join(", ")}
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">Nothing sent yet.</p>
                )}
              </CardContent>
            </Card>
          </div>

          <Card className="h-fit shadow-card">
            <CardHeader>
              <CardTitle className="text-base">Recipients</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {rows.map(({ app, candidate }) => (
                <label key={app.id} className="flex items-start gap-3 text-sm">
                  <Checkbox
                    checked={selected.includes(app.id)}
                    onCheckedChange={() =>
                      setSelected((prev) =>
                        prev.includes(app.id)
                          ? prev.filter((x) => x !== app.id)
                          : [...prev, app.id],
                      )
                    }
                  />
                  <span>
                    <span className="font-medium">{candidate?.name}</span>
                    <span className="block text-xs text-muted-foreground">{candidate?.email}</span>
                  </span>
                </label>
              ))}
              <Badge variant="secondary" className="num font-normal">
                {selected.length} selected
              </Badge>
              <Button className="w-full" onClick={send} disabled={sending}>
                <Send className="mr-2 h-4 w-4" />
                {sending ? "Sending…" : "Send (simulated)"}
              </Button>
            </CardContent>
          </Card>
        </div>
      ) : null}
    </HrShell>
  );
}
