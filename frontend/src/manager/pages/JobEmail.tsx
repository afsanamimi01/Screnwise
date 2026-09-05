import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams } from "react-router-dom";
import { FlaskConical, MailCheck, Send, TriangleAlert } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Shell } from "@/manager/components/Shell";
import { JobTabs } from "@/manager/components/JobTabs";
import { EmptyState, ErrorState, LoadingRows } from "@/shared/components/StateViews";
import {
  getJob,
  getMailStatus,
  getSentEmails,
  getShortlist,
  sendShortlistEmails,
} from "@/shared/lib/api";
import { usePageTitle } from "@/shared/lib/use-page-title";
import { useManagerAccess } from "@/manager/lib/access";
import "./JobEmail.css";

const templates: Record<string, { subject: string; body: string }> = {
  "Invite to interview": {
    subject: "Interview invitation - {{job_title}}",
    body: "Hi {{candidate_name}},\n\nThank you for applying for {{job_title}}. We'd love to talk further - could you share a few times that work for you next week?\n\nBest,\n{{hr_name}}\n{{company_name}}",
  },
  "Request more info": {
    subject: "A quick follow-up on your {{job_title}} application",
    body: "Hi {{candidate_name}},\n\nThanks for your application for {{job_title}}. Could you tell us a little more about your recent work, and share any portfolio or code samples?\n\nBest,\n{{hr_name}}\n{{company_name}}",
  },
  "Rejection with feedback": {
    subject: "Update on your {{job_title}} application",
    body: "Hi {{candidate_name}},\n\nThank you for the time you put into your application for {{job_title}}. We've decided to move forward with other candidates this time. Here's the feedback from our review: ...\n\nWe'd genuinely welcome a future application.\n\nBest,\n{{hr_name}}\n{{company_name}}",
  },
};

export default function JobEmail() {
  usePageTitle("Email composer - Screenwise");
  const { jobId = "" } = useParams();
  const queryClient = useQueryClient();
  const { locked } = useManagerAccess();
  const jobQuery = useQuery({ queryKey: ["job", jobId], queryFn: () => getJob(jobId) });
  const query = useQuery({
    queryKey: ["shortlist", jobId],
    queryFn: () => getShortlist(jobId),
  });
  const sentQuery = useQuery({ queryKey: ["emails", jobId], queryFn: () => getSentEmails(jobId) });
  // Server-side config, not a per-job thing - cache it across the session.
  const mailQuery = useQuery({
    queryKey: ["mail-status"],
    queryFn: getMailStatus,
    staleTime: 5 * 60 * 1000,
  });

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
  const mail = mailQuery.data;
  // A CV that printed no address leaves the record's email empty - those rows
  // can't be written to, so they are shown but not selectable.
  const unreachable = rows.filter((r) => !r.candidate?.email).length;
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
    if (locked) return;
    setSending(true);
    try {
      const result = await sendShortlistEmails({
        jobId,
        subject,
        body,
        template,
        applicationIds: selected,
      });
      const delivered = result.deliveries.filter((d) => d.status === "sent").length;
      const total = result.deliveries.length;

      if (result.driver === "console") {
        toast.warning(
          `Logged ${total} message(s) - no email provider is configured, so nothing was delivered.`,
        );
      } else if (result.status === "sent") {
        toast.success(`Sent to ${delivered} candidate(s).`);
      } else if (result.status === "partial") {
        toast.warning(`Sent to ${delivered} of ${total}. The rest are listed below with the error.`);
      } else {
        const reason = result.deliveries.find((d) => d.error)?.error;
        toast.error(reason ? `Nothing was delivered: ${reason}` : "Nothing was delivered.");
      }

      setSelected([]);
      await queryClient.invalidateQueries({ queryKey: ["emails", jobId] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "We couldn't send those emails.");
    } finally {
      setSending(false);
    }
  };

  return (
    <Shell allow={["manager"]}>
      <div className="manager-email">
        <div className="manager-email__intro">
          <h1 className="manager-email__intro-title">Email shortlisted candidates</h1>
          <p className="manager-email__intro-text">
            Write once, send to many. Each candidate gets their own message, addressed to them by
            name - nobody sees the rest of the shortlist.
          </p>
        </div>

        <JobTabs jobId={jobId} />

        {mail ? (
          <div
            className={`manager-email__status ${
              mail.live && !mail.restricted
                ? "manager-email__status--live"
                : "manager-email__status--warn"
            }`}
          >
            {mail.live && !mail.restricted ? (
              <MailCheck size={16} />
            ) : mail.driver === "console" ? (
              <FlaskConical size={16} />
            ) : (
              <TriangleAlert size={16} />
            )}
            <span>{mail.message}</span>
          </div>
        ) : null}

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
          <div className="manager-email__grid">
            <div className="manager-email__col">
              <section className="manager-email__card">
                <h2 className="manager-email__card-title">Message</h2>
                <div className="manager-email__field">
                  <span className="manager-email__label">Template</span>
                  <select
                    className="manager-email__input"
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
                <div className="manager-email__field">
                  <label className="manager-email__label" htmlFor="subject">
                    Subject
                  </label>
                  <input
                    id="subject"
                    className="manager-email__input"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                  />
                </div>
                <div className="manager-email__field">
                  <label className="manager-email__label" htmlFor="body">
                    Body
                  </label>
                  <textarea
                    id="body"
                    className="manager-email__textarea"
                    rows={10}
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                  />
                  <p className="manager-email__note">
                    Variables: {"{{candidate_name}}"}, {"{{job_title}}"}, {"{{company_name}}"} and{" "}
                    {"{{hr_name}}"} - filled in per recipient when the message goes out.
                  </p>
                </div>
              </section>

              <section className="manager-email__card">
                <h2 className="manager-email__card-title">Preview</h2>
                <div className="manager-email__preview">
                  <div className="manager-email__preview-subject">{render(subject)}</div>
                  <p className="manager-email__preview-body">{render(body)}</p>
                </div>
              </section>

              <section className="manager-email__card">
                <h2 className="manager-email__card-title">Sent log</h2>
                {sentQuery.data && sentQuery.data.length > 0 ? (
                  sentQuery.data.map((mailRow) => (
                    <div key={mailRow.id} className="manager-email__sent">
                      <div className="manager-email__sent-head">
                        <span className="manager-email__sent-subject">{mailRow.subject}</span>
                        <span className="manager-email__sent-time">{mailRow.sentAt}</span>
                      </div>
                      <div className="manager-email__sent-meta">
                        {mailRow.template} · {mailRow.recipients.length} recipient(s)
                        {mailRow.driver === "console"
                          ? " · logged only, not delivered"
                          : mailRow.status === "sent"
                            ? " · delivered"
                            : mailRow.status === "partial"
                              ? " · partly delivered"
                              : " · delivery failed"}
                      </div>
                      {mailRow.deliveries.length > 0 ? (
                        <ul className="manager-email__deliveries">
                          {mailRow.deliveries.map((d) => (
                            <li key={d.email} className="manager-email__delivery">
                              <span
                                className={`manager-email__pill ${
                                  d.status === "sent"
                                    ? "manager-email__pill--ok"
                                    : "manager-email__pill--failed"
                                }`}
                              >
                                {d.status}
                              </span>
                              <span className="manager-email__delivery-to">{d.email}</span>
                              {d.error ? (
                                <span className="manager-email__delivery-error">{d.error}</span>
                              ) : null}
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <div className="manager-email__sent-meta">{mailRow.recipients.join(", ")}</div>
                      )}
                    </div>
                  ))
                ) : (
                  <p className="manager-email__empty">Nothing sent yet.</p>
                )}
              </section>
            </div>

            <section className="manager-email__card manager-email__card--recipients">
              <h2 className="manager-email__card-title">Recipients</h2>
              {rows.map(({ app, candidate }) => {
                const email = candidate?.email ?? "";
                return (
                  <label
                    key={app.id}
                    className={`manager-email__recipient${email ? "" : " manager-email__recipient--unreachable"}`}
                  >
                    <input
                      type="checkbox"
                      checked={selected.includes(app.id)}
                      disabled={!email}
                      onChange={() =>
                        setSelected((prev) =>
                          prev.includes(app.id)
                            ? prev.filter((x) => x !== app.id)
                            : [...prev, app.id],
                        )
                      }
                    />
                    <span>
                      <span className="manager-email__recipient-name">{candidate?.name}</span>
                      {email ? (
                        <span className="manager-email__recipient-email">{email}</span>
                      ) : (
                        <span className="manager-email__recipient-missing">
                          No address in this CV - can't be emailed
                        </span>
                      )}
                    </span>
                  </label>
                );
              })}
              {unreachable > 0 ? (
                <p className="manager-email__unreachable-note">
                  {unreachable} of {rows.length} shortlisted candidate(s) printed no email address
                  in their CV. Nothing can be sent to them until an address is added.
                </p>
              ) : null}
              <span className="manager-email__selected">{selected.length} selected</span>
              <button
                type="button"
                className="manager-email__btn"
                onClick={send}
                disabled={sending || locked}
                title={locked ? "Activate a plan to send" : undefined}
              >
                <Send size={16} />
                {sending ? "Sending…" : mail && !mail.live ? "Send (not delivered)" : "Send"}
              </button>
            </section>
          </div>
        ) : null}
      </div>
    </Shell>
  );
}
