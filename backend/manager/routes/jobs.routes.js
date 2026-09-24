import { Router } from "express";
import {
  verifyToken,
  requireRole,
  requireActivePlan,
} from "../../shared/middleware/auth.middleware.js";
import { getJobById, listJobs } from "../controllers/jobs.controller.js";

const router = Router();

// Read-only: creating and editing a job is HR-only (see backend/hr).
router.use(verifyToken, requireActivePlan, requireRole("manager"));
router.get("/", listJobs);
router.get("/:id", getJobById);

export default router;
