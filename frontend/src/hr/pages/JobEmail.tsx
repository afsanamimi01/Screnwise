import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams } from "react-router-dom";
import { FlaskConical, Send } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Shell } from "@/hr/components/Shell";
import { JobTabs } from "@/hr/components/JobTabs";
import { EmptyState, ErrorState, LoadingRows } from "@/shared/components/StateViews";
import { getJob, getSentEmails, getShortlist, sendShortlistEmails } from "@/shared/lib/api";
import { usePageTitle } from "@/shared/lib/use-page-title";
import "./JobEmail.css";

const templates: Record<string, { subject: string; body: string }> = {
  "Invite to interview": {
    subject: "Interview invitation - {{job_title}}",
    body: "Hi {{candidate_name}},\n\nThank you for applying for {{job_title}}. We'd love to talk further - could you share a few times that work for you next week?\n\nBest,\nThe hiring team",
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
  usePageTitle("Email composer - Screenwise");
  const { jobId = "" } = useParams();
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
    toast.success("Simulated send complete - logged below, no real email was delivered.");
  };

  return (
    <Shell allow={["hr", "manager"]}>
      <div className="hr-email">
        <div className="hr-email__intro">
          <h1 className="hr-email__intro-title">Email shortlisted candidates</h1>
          <p className="hr-email__intro-text">
            Write once, send to many. Sandbox mode: messages are logged, never delivered.
          </p>
        </div>

        <JobTabs jobId={jobId} />

        <div className="hr-email__sandbox">
          <FlaskConical size={16} /> Sandbox mode is on. Nothing leaves this demo.
        </div>

        {query.isLoading ? <LoadingRows rows={3} /> : null}
        {query.isError ? (
          <ErrorState message="We couldn't load the shortlist." onRetry={() => query.refetch()} />
        ) : null}
        {query.data && rows.length === 0 ? (
          <EmptyState
            title="No shortlisted candidates"
            description="Shortlist candidates on the rank board first - you can only email people you shortlisted."
          />
        ) : null}

        {rows.length > 0 ? (
          <div className="hr-email__grid">
            <div className="hr-email__col">
              <section className="hr-email__card">
                <h2 className="hr-email__card-title">Message</h2>
                <div className="hr-email__field">
                  <span className="hr-email__label">Template</span>
                  <select
                    className="hr-email__input"
                    value={template}
                    onChange={(e) => applyTemplate(e.target.value)}
                  >
                    {Object.keys(templates).map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="hr-email__field">
                  <label className="hr-email__label" htmlFor="subject">
                    Subject
                  </label>
                  <input
                    id="subject"
                    className="hr-email__input"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                  />
                </div>
                <div className="hr-email__field">
                  <label className="hr-email__label" htmlFor="body">
                    Body
                  </label>
                  <textarea
                    id="body"
                    className="hr-email__textarea"
                    rows={10}
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                  />
                  <p className="hr-email__note">
                    Variables: {"{{candidate_name}}"} and {"{{job_title}}"}
                  </p>
                </div>
              </section>

              <section className="hr-email__card">
                <h2 className="hr-email__card-title">Preview</h2>
                <div className="hr-email__preview">
                  <div className="hr-email__preview-subject">{render(subject)}</div>
                  <p className="hr-email__preview-body">{render(body)}</p>
                </div>
              </section>

              <section className="hr-email__card">
                <h2 className="hr-email__card-title">Sent log (simulated)</h2>
                {sentQuery.data && sentQuery.data.length > 0 ? (
                  sentQuery.data.map((mail) => (
                    <div key={mail.id} className="hr-email__sent">
                      <div className="hr-email__sent-head">
                        <span className="hr-email__sent-subject">{mail.subject}</span>
                        <span className="hr-email__sent-time">{mail.sentAt}</span>
                      </div>
                      <div className="hr-email__sent-meta">
                        {mail.template} · {mail.recipients.length} recipient(s):{" "}
                        {mail.recipients.join(", ")}
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="hr-email__empty">Nothing sent yet.</p>
                )}
              </section>
            </div>

            <section className="hr-email__card hr-email__card--recipients">
              <h2 className="hr-email__card-title">Recipients</h2>
              {rows.map(({ app, candidate }) => (
                <label key={app.id} className="hr-email__recipient">
                  <input
                    type="checkbox"
                    checked={selected.includes(app.id)}
                    onChange={() =>
                      setSelected((prev) =>
                        prev.includes(app.id)
                          ? prev.filter((x) => x !== app.id)
                          : [...prev, app.id],
                      )
                    }
                  />
                  <span>
                    <span className="hr-email__recipient-name">{candidate?.name}</span>
                    <span className="hr-email__recipient-email">{candidate?.email}</span>
                  </span>
                </label>
              ))}
              <span className="hr-email__selected">{selected.length} selected</span>
              <button
                type="button"
                className="hr-email__btn"
                onClick={send}
                disabled={sending}
              >
                <Send size={16} />
                {sending ? "Sending…" : "Send (simulated)"}
              </button>
            </section>
          </div>
        ) : null}
      </div>
    </Shell>
  );
}
