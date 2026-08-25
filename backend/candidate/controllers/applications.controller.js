import Application from "../../shared/models/Application.model.js";

export async function listMyApplications(req, res, next) {
  try {
    const applications = await Application.find({ candidateId: req.user._id })
      .sort({ appliedAt: -1 })
      .populate("jobId");
    res.json(applications);
  } catch (err) {
    next(err);
  }
}
