import Job from "../../shared/models/Job.model.js";
import Application from "../../shared/models/Application.model.js";

export async function getDashboard(req, res, next) {
  try {
    const filter = req.user.role === "admin" ? {} : { createdBy: req.user._id };
    const jobs = await Job.find(filter).sort({ createdAt: -1 });

    const apps = await Application.find({ jobId: { $in: jobs.map((j) => j._id) } });
    const blindApps = apps.map((a) => {
      const json = a.toJSON();
      delete json.name;
      delete json.email;
      delete json.phone;
      return json;
    });

    res.json({ jobs, apps: blindApps });
  } catch (err) {
    next(err);
  }
}
