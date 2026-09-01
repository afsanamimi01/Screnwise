import { Router } from "express";
import { verifyToken, requireRole } from "../../shared/middleware/auth.middleware.js";
import { createJob, getJobById, listJobs, updateJob } from "../controllers/jobs.controller.js";

const router = Router();

router.use(verifyToken);

router.get("/", requireRole("hr", "manager"), listJobs);
router.post("/", requireRole("hr", "manager"), createJob);
router.get("/:id", requireRole("hr", "manager"), getJobById);
router.put("/:id", requireRole("hr", "manager"), updateJob);

export default router;
