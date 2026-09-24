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

router.use(verifyToken, requireActivePlan, requireRole("manager"));
// Two segments, so it never collides with "/:jobId" below.
router.get("/cv/:applicationId", getApplicationCv);
router.get("/:jobId", getShortlist);
router.post("/", shortlistCandidates);

export default router;
