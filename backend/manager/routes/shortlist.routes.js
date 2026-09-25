import { Router } from "express";
import {
  verifyToken,
  requireRole,
  requireActivePlan,
} from "../../shared/middleware/auth.middleware.js";
import { getApplicationCv, getShortlist } from "../controllers/shortlist.controller.js";

// Read-only: a manager can see who HR has shortlisted and open their CV, but
// shortlisting / un-shortlisting is HR-only - see `hr/routes/shortlist.routes.js`.
const router = Router();

router.use(verifyToken, requireActivePlan, requireRole("manager"));
// Two segments, so it never collides with "/:jobId" below.
router.get("/cv/:applicationId", getApplicationCv);
router.get("/:jobId", getShortlist);

export default router;
