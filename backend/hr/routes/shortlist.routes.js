import { Router } from "express";
import {
  verifyToken,
  requireRole,
  requireActivePlan,
} from "../../shared/middleware/auth.middleware.js";
import { getShortlist, shortlistCandidates } from "../controllers/shortlist.controller.js";

const router = Router();

router.use(verifyToken, requireActivePlan);
router.get("/:jobId", requireRole("hr", "manager"), getShortlist);
router.post("/", requireRole("hr", "manager"), shortlistCandidates);

export default router;
