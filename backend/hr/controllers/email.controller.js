import Job from "../../shared/models/Job.model.js";
import SentEmail from "../../shared/models/SentEmail.model.js";
import { logAudit } from "../../shared/utils/audit.js";
import { tenantFilter } from "../../shared/middleware/auth.middleware.js";

export async function sendShortlistEmail(req, res, next) {
  try {
    const { jobId } = req.params;
    const { subject, body, template, recipients = [] } = req.body;

    const job = await Job.findOne({ _id: jobId, ...tenantFilter(req) });
    if (!job) return res.status(404).json({ message: "Job not found" });

    const email = await SentEmail.create({ jobId, subject, body, template, recipients });
    await logAudit(
      req.user.name,
      "Email sent",
      `${template} — ${recipients.length} recipients`,
      req.user.companyId,
    );
    res.status(201).json(email);
  } catch (err) {
    next(err);
  }
}

export async function listSentEmails(req, res, next) {
  try {
    const job = await Job.findOne({ _id: req.params.jobId, ...tenantFilter(req) });
    if (!job) return res.status(404).json({ message: "Job not found" });
    const emails = await SentEmail.find({ jobId: job._id }).sort({ sentAt: -1 });
    res.json(emails);
  } catch (err) {
    next(err);
  }
}
