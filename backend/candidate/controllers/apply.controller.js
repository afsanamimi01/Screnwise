import Job from "../../shared/models/Job.model.js";
import Application from "../../shared/models/Application.model.js";

export async function submitApplication(req, res, next) {
  try {
    const { jobId, name, email, phone, skills = [], years = 0, currentTitle, cvFileName } = req.body;

    const job = await Job.findOne({ _id: jobId, status: "open", publicApplyEnabled: true });
    if (!job) {
      return res.status(404).json({ message: "Job not found or not open for applications" });
    }

    const matchedSkills = skills.filter((s) => job.requiredSkills.includes(s));
    const missingSkills = job.requiredSkills.filter((s) => !skills.includes(s));

    const application = await Application.create({
      jobId: job._id,
      candidateId: req.user._id,
      name,
      email,
      phone,
      alias: "Candidate #NEW",
      source: "self-applied",
      matchedSkills,
      missingSkills,
      yearsExperience: years,
      currentTitle,
      needsManualReview: true,
      status: "applied",
      appliedAt: new Date(),
      cvFileName: cvFileName || "cv.pdf",
    });

    res.status(201).json({ trackingId: application._id.toString() });
  } catch (err) {
    next(err);
  }
}
