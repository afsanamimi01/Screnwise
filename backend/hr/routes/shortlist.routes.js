import { Router } from "express";
import {
  verifyToken,
  requireRole,
  requireActivePlan,
} from "../../shared/middleware/auth.middleware.js";
import {
  getApplicationCv,
  getShortlist,
  shortlistCandidates,
} from "../controllers/shortlist.controller.js";

const router = Router();

router.use(verifyToken, requireActivePlan);
// Two segments, so it never collides with "/:jobId" below.
router.get("/cv/:applicationId", requireRole("hr", "manager"), getApplicationCv);
router.get("/:jobId", requireRole("hr", "manager"), getShortlist);
router.post("/", requireRole("hr", "manager"), shortlistCandidates);

export default router;
