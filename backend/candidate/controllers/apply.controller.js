import Job from "../../shared/models/Job.model.js";
import Application from "../../shared/models/Application.model.js";
import Candidate from "../../shared/models/Candidate.model.js";
import { screenCv } from "../../shared/engine/index.js";

/**
 * Submit an application for a signed-in candidate.
 *
 * The CV comes from one of two places, in order:
 *   1. a file attached to this request (multipart field `cv`) - used as-is,
 *      and saved to the candidate's profile if they don't have one yet;
 *   2. the CV already on the candidate's profile.
 *
 * Whichever is used is run through the local screening engine, so the
 * application lands on the rank board with a real score and breakdown.
 */
export async function submitApplication(req, res, next) {
  try {
    const { jobId, phone } = req.body;

    const job = await Job.findOne({ _id: jobId, status: "open", publicApplyEnabled: true });
    if (!job) {
      return res.status(404).json({ message: "Job not found or not open for applications" });
    }

    const already = await Application.findOne({ jobId: job._id, candidateId: req.user._id });
    if (already) {
      return res.status(409).json({ message: "You've already applied to this role." });
    }

    let profile = await Candidate.findOne({ userId: req.user._id });

    // Resolve which CV to screen.
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

    const result = await screenCv({ buffer: cvBuffer, fileName: cvFileName, mimeType: cvType }, job);

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
    });

    res.status(201).json({ trackingId: application._id.toString(), score: result.score });
  } catch (err) {
    next(err);
  }
}
