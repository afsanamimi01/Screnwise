import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams } from "react-router-dom";
import { FlaskConical } from "lucide-react";
import { toast } from "sonner";
import { HrLayout } from "@/hr/components/HrLayout";
import { JobTabs } from "@/hr/components/JobTabs";
import { EmptyState, ErrorState, LoadingRows } from "@/shared/components/StateViews";
import { Badge } from "@/shared/components/ui/badge";
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
import { SendEmailButton } from "@/hr/components/buttons/Buttons";
import { getJob, getSentEmails, getShortlist, sendShortlistEmails } from "@/shared/lib/api";
import "./JobEmail.css";

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

export function JobEmail() {
  const { jobId = "" } = useParams<{ jobId: string }>();
  const queryClient = useQueryClient();

  useEffect(() => {
    document.title = "Email composer — Screenwise";
  }, []);

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
  const firstName = rows.find((r) => selected.includes(r.app.id))?.candidate?.name ?? "Candidate name";
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
      recipients: rows.filter((r) => selected.includes(r.app.id)).map((r) => r.candidate?.email ?? "unknown"),
    });
    setSending(false);
    setSelected([]);
    await queryClient.invalidateQueries({ queryKey: ["emails", jobId] });
    toast.success("Simulated send complete — logged below, no real email was delivered.");
  };

  return (
    <HrLayout
      title="Email shortlisted candidates"
      description="Write once, send to many. Sandbox mode: messages are logged, never delivered."
    >
      <JobTabs jobId={jobId} />

      <div className="job-email__sandbox-notice">
        <FlaskConical className="job-email__sandbox-icon" /> Sandbox mode is on. Nothing leaves this
        demo.
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
        <div className="job-email__layout">
          <div className="job-email__main">
            <Card className="job-email__card">
              <CardHeader>
                <CardTitle className="job-email__card-title">Message</CardTitle>
              </CardHeader>
              <CardContent className="job-email__form">
                <div>
                  <Label>Template</Label>
                  <Select value={template} onValueChange={applyTemplate}>
                    <SelectTrigger className="job-email__input">
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
                    className="job-email__input"
                  />
                </div>
                <div>
                  <Label htmlFor="body">Body</Label>
                  <Textarea
                    id="body"
                    rows={10}
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                    className="job-email__input"
                  />
                  <p className="job-email__variables-note">
                    Variables: {"{{candidate_name}}"} and {"{{job_title}}"}
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="job-email__card">
              <CardHeader>
                <CardTitle className="job-email__card-title">Preview</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="job-email__preview">
                  <div className="job-email__preview-subject">{render(subject)}</div>
                  <p className="job-email__preview-body">{render(body)}</p>
                </div>
              </CardContent>
            </Card>

            <Card className="job-email__card">
              <CardHeader>
                <CardTitle className="job-email__card-title">Sent log (simulated)</CardTitle>
              </CardHeader>
              <CardContent className="job-email__sent-log">
                {sentQuery.data && sentQuery.data.length > 0 ? (
                  sentQuery.data.map((mail) => (
                    <div key={mail.id} className="job-email__sent-item">
                      <div className="job-email__sent-item-header">
                        <span className="job-email__sent-item-subject">{mail.subject}</span>
                        <span className="job-email__sent-item-date">{mail.sentAt}</span>
                      </div>
                      <div className="job-email__sent-item-meta">
                        {mail.template} · {mail.recipients.length} recipient(s): {mail.recipients.join(", ")}
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="job-email__sent-empty">Nothing sent yet.</p>
                )}
              </CardContent>
            </Card>
          </div>

          <Card className="job-email__recipients-card">
            <CardHeader>
              <CardTitle className="job-email__card-title">Recipients</CardTitle>
            </CardHeader>
            <CardContent className="job-email__recipients">
              {rows.map(({ app, candidate }) => (
                <label key={app.id} className="job-email__recipient">
                  <Checkbox
                    checked={selected.includes(app.id)}
                    onCheckedChange={() =>
                      setSelected((prev) =>
                        prev.includes(app.id) ? prev.filter((x) => x !== app.id) : [...prev, app.id],
                      )
                    }
                  />
                  <span>
                    <span className="job-email__recipient-name">{candidate?.name}</span>
                    <span className="job-email__recipient-email">{candidate?.email}</span>
                  </span>
                </label>
              ))}
              <Badge variant="secondary" className="job-email__selected-count">
                {selected.length} selected
              </Badge>
              <SendEmailButton sending={sending} onClick={send} />
            </CardContent>
          </Card>
        </div>
      ) : null}
    </HrLayout>
  );
}
