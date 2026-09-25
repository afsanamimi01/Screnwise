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
  unshortlistCandidates,
} from "../controllers/shortlist.controller.js";

const router = Router();

router.use(verifyToken, requireActivePlan, requireRole("hr"));
// Fixed segments first, so they never collide with "/:jobId" below.
router.get("/cv/:applicationId", getApplicationCv);
router.post("/unshortlist", unshortlistCandidates);
router.get("/:jobId", getShortlist);
router.post("/", shortlistCandidates);

export default router;
