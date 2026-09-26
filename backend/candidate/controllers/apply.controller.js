import Job from "../../shared/models/Job.model.js";
import Application from "../../shared/models/Application.model.js";
import Candidate from "../../shared/models/Candidate.model.js";
import Company from "../../shared/models/Company.model.js";
import { screenCv } from "../../shared/engine/index.js";
import { screeningStatus } from "../../shared/billing/subscription.js";
import { rag } from "../../shared/rag/indexer.js";

/** Submit an application for a signed-in candidate. */
export async function submitApplication(req, res, next) {
  try {
    const { jobId, phone } = req.body;

    // Find job
    const job = await Job.findOne({ _id: jobId, status: "open", publicApplyEnabled: true });
    if (!job) {
      return res.status(404).json({ message: "Job not found or not open for applications" });
    }

    // Block duplicate
    const already = await Application.findOne({ jobId: job._id, candidateId: req.user._id });
    if (already) {
      return res.status(409).json({ message: "You've already applied to this role." });
    }

    // Check screening cap
    const company = await Company.findById(job.companyId);
    if (company) {
      const { limit, remaining } = await screeningStatus(company);
      if (limit != null && remaining <= 0) {
        return res.status(409).json({
          message: "This job isn't accepting new applications right now. Please check back later.",
        });
      }
    }

    // Load profile
    let profile = await Candidate.findOne({ userId: req.user._id });

    // Resolve CV
    let cvBuffer;
    let cvFileName;
    let cvType;
    if (req.file) {
      cvBuffer = req.file.buffer;
      cvFileName = req.file.originalname;
      cvType = req.file.mimetype;
      // First-time uploader with an attached file - keep it on their profile.
      if (!profile) profile = await Candidate.create({ userId: req.user._id });
      if (!profile.cv?.data) {
        profile.cv = {
          data: req.file.buffer,
          contentType: cvType,
          fileName: cvFileName,
          size: req.file.size,
          uploadedAt: new Date(),
        };
        await profile.save();
      }
    } else if (profile?.cv?.data) {
      cvBuffer = profile.cv.data;
      cvFileName = profile.cv.fileName;
      cvType = profile.cv.contentType;
    } else {
      return res.status(400).json({
        message: "Add a CV to your profile, or attach one to this application, before applying.",
      });
    }

    // Screen CV
    const result = await screenCv({ buffer: cvBuffer, fileName: cvFileName, mimeType: cvType }, job);

    // Create application
    const existingCount = await Application.countDocuments({ jobId: job._id });
    const application = await Application.create({
      jobId: job._id,
      candidateId: req.user._id,
      name: req.user.name,
      email: req.user.email,
      phone: phone || profile?.phone || "",
      alias: `Candidate #${String(existingCount + 1).padStart(3, "0")}`,
      source: "self-applied",
      score: result.score,
      scoreBreakdown: result.scoreBreakdown,
      matchedSkills: result.matchedSkills,
      missingSkills: result.missingSkills,
      yearsExperience: result.yearsExperience,
      currentTitle: profile?.headline || result.currentTitle,
      pastTitles: result.pastTitles,
      educationLevel: result.educationLevel,
      needsManualReview: false,
      status: "screened",
      appliedAt: new Date(),
      cvFileName: cvFileName || "cv.pdf",
      cvText: result.text ?? "",
    });

    // Queue reindex
    rag.application(application._id);

    res.status(201).json({ trackingId: application._id.toString(), score: result.score });
  } catch (err) {
    next(err);
  }
}
