import { Router } from "express";
import { verifyToken, requireRole } from "../../shared/middleware/auth.middleware.js";
import { getShortlist, shortlistCandidates } from "../controllers/shortlist.controller.js";

const router = Router();

router.use(verifyToken);
router.get("/:jobId", requireRole("hr", "admin"), getShortlist);
router.post("/", requireRole("hr", "admin"), shortlistCandidates);

export default router;
