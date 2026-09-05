import { Router } from "express";
import {
  verifyToken,
  requireRole,
  requireActivePlan,
} from "../../shared/middleware/auth.middleware.js";
import {
  getMailStatus,
  listSentEmails,
  sendShortlistEmail,
} from "../controllers/email.controller.js";

const router = Router();

router.use(verifyToken, requireActivePlan);
// Ahead of "/:jobId" - otherwise the wildcard swallows it.
router.get("/status", requireRole("hr", "manager"), getMailStatus);
router.post("/:jobId", requireRole("hr", "manager"), sendShortlistEmail);
router.get("/:jobId", requireRole("hr", "manager"), listSentEmails);

export default router;
