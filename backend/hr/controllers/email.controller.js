import Application from "../../shared/models/Application.model.js";
import Job from "../../shared/models/Job.model.js";
import SentEmail from "../../shared/models/SentEmail.model.js";
import { logAudit } from "../../shared/utils/audit.js";
import { tenantFilter } from "../../shared/middleware/auth.middleware.js";
import { mailerStatus, sendMail } from "../../shared/mail/mailer.js";
import { isEmailAddress, renderTemplate, textToHtml } from "../../shared/mail/render.js";

/** Delivery banner for the composer: which provider is live, if any. */
export async function getMailStatus(_req, res, next) {
  try {
    res.json(await mailerStatus());
  } catch (err) {
    next(err);
  }
}

/**
 * Resolves who to write to. The composer sends `applicationIds` so we can look
 * up each candidate's real name and address ourselves - never trusting the
 * client for the destination - and personalise per recipient. A plain
 * `recipients` array of addresses is still accepted for older clients.
 */
async function resolveRecipients({ applicationIds, recipients, job }) {
  // ---- Step 1: prefer application ids - they carry the candidate's own name ----
  if (Array.isArray(applicationIds) && applicationIds.length) {
    const apps = await Application.find({ _id: { $in: applicationIds }, jobId: job._id });
    const targets = [];
    for (const a of apps) {
      if (isEmailAddress(a.email)) {
        targets.push({ email: a.email.trim(), name: a.name ?? "", applicationId: a._id });
      }
    }
    return targets;
  }

  // ---- Step 2: fall back to a plain list of addresses, no names attached ----
  const addresses = Array.isArray(recipients) ? recipients : [];
  const targets = [];
  for (const email of addresses) {
    if (isEmailAddress(email)) targets.push({ email: email.trim(), name: "", applicationId: null });
  }
  return targets;
}

export async function sendShortlistEmail(req, res, next) {
  try {
    // ---- Step 1: the message must have a subject and a body ----
    const { jobId } = req.params;
    const { subject, body, template, recipients = [], applicationIds = [] } = req.body;

    if (!subject?.trim() || !body?.trim()) {
      return res.status(400).json({ message: "Subject and body are both required" });
    }

    // ---- Step 2: the job, scoped to the caller's company ----
    const job = await Job.findOne({ _id: jobId, ...tenantFilter(req) });
    if (!job) return res.status(404).json({ message: "Job not found" });

    // ---- Step 3: who it's actually going to ----
    const targets = await resolveRecipients({ applicationIds, recipients, job });
    if (!targets.length) {
      return res
        .status(400)
        .json({ message: "No recipients with a valid email address were selected" });
    }

    const companyName = req.company?.name ?? "";
    const base = {
      job_title: job.title,
      company_name: companyName,
      hr_name: req.user.name,
    };
    const footer = companyName
      ? `Sent by ${req.user.name} at ${companyName} via Screenwise. Reply to this email to reach the hiring team.`
      : `Sent by ${req.user.name} via Screenwise. Reply to this email to reach the hiring team.`;

    // ---- Step 4: send one message per candidate ----
    // Sequential on purpose: one message per candidate so the greeting is
    // personal and nobody sees the rest of the shortlist, and so the mailer can
    // pace itself under the provider's rate limit.
    const deliveries = [];
    let driver = "console";
    for (const target of targets) {
      const vars = { ...base, candidate_name: target.name || "there" };
      const renderedSubject = renderTemplate(subject, vars);
      const renderedBody = renderTemplate(body, vars);

      const result = await sendMail({
        to: target.email,
        subject: renderedSubject,
        text: renderedBody,
        html: textToHtml(renderedBody, { title: renderedSubject, footer }),
        replyTo: req.user.email,
      });

      driver = result.driver;
      deliveries.push({
        email: target.email,
        name: target.name,
        applicationId: target.applicationId,
        status: result.ok ? "sent" : "failed",
        messageId: result.messageId,
        error: result.error,
      });
    }

    // ---- Step 5: tally how many actually went out ----
    let sentCount = 0;
    for (const d of deliveries) {
      if (d.status === "sent") sentCount = sentCount + 1;
    }
    const status = sentCount === 0 ? "failed" : sentCount === deliveries.length ? "sent" : "partial";

    // ---- Step 6: record the send and log it ----
    const recipientAddresses = [];
    for (const d of deliveries) recipientAddresses.push(d.email);

    const email = await SentEmail.create({
      jobId: job._id,
      subject,
      body,
      template,
      recipients: recipientAddresses,
      deliveries,
      driver,
      status,
      sentBy: req.user.name,
    });

    await logAudit(
      req.user.name,
      "Email sent",
      `${template} - ${sentCount}/${deliveries.length} delivered via ${driver}`,
      req.user.companyId,
    );

    res.status(201).json(email);
  } catch (err) {
    next(err);
  }
}

/** Every email sent for this job, newest first. */
export async function listSentEmails(req, res, next) {
  try {
    // ---- Sort config ----
    // Flip to "sentAt asc" to show the oldest email first - nothing else to touch.
    const SORT_BY = "sentAt desc";
    const [sortField, sortWord] = SORT_BY.split(" ");
    const sortOrder = sortWord === "desc" ? -1 : 1;

    // ---- Step 1: the job, scoped to the caller's company ----
    const job = await Job.findOne({ _id: req.params.jobId, ...tenantFilter(req) });
    if (!job) return res.status(404).json({ message: "Job not found" });

    // ---- Step 2: every email sent for it ----
    const emails = await SentEmail.find({ jobId: job._id }).sort({ [sortField]: sortOrder });
    res.json(emails);
  } catch (err) {
    next(err);
  }
}
