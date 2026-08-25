import { Router } from "express";
import { verifyToken, requireRole } from "../../shared/middleware/auth.middleware.js";
import { listSentEmails, sendShortlistEmail } from "../controllers/email.controller.js";

const router = Router();

router.use(verifyToken);
router.post("/:jobId", requireRole("hr", "admin"), sendShortlistEmail);
router.get("/:jobId", requireRole("hr", "admin"), listSentEmails);

export default router;
