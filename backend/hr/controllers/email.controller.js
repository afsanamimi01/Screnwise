import Job from "../../shared/models/Job.model.js";
import SentEmail from "../../shared/models/SentEmail.model.js";
import { logAudit } from "../../shared/utils/audit.js";

export async function sendShortlistEmail(req, res, next) {
  try {
    const { jobId } = req.params;
    const { subject, body, template, recipients = [] } = req.body;

    const job = await Job.findById(jobId);
    if (!job) return res.status(404).json({ message: "Job not found" });
    if (req.user.role !== "admin" && job.createdBy?.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Only the job's creator can email its shortlist" });
    }

    const email = await SentEmail.create({ jobId, subject, body, template, recipients });
    await logAudit(req.user.name, "Email sent", `${template} — ${recipients.length} recipients`);
    res.status(201).json(email);
  } catch (err) {
    next(err);
  }
}

export async function listSentEmails(req, res, next) {
  try {
    const emails = await SentEmail.find({ jobId: req.params.jobId }).sort({ sentAt: -1 });
    res.json(emails);
  } catch (err) {
    next(err);
  }
}
