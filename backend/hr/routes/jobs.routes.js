import { Router } from "express";
import { verifyToken, requireRole } from "../../shared/middleware/auth.middleware.js";
import { createJob, getJobById, listJobs, updateJob } from "../controllers/jobs.controller.js";

const router = Router();

router.use(verifyToken);

router.get("/", requireRole("hr", "admin"), listJobs);
router.post("/", requireRole("hr", "admin"), createJob);
router.get("/:id", requireRole("hr", "admin"), getJobById);
router.put("/:id", requireRole("hr", "admin"), updateJob);

export default router;
