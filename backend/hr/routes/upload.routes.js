import { Router } from "express";
import multer from "multer";
import {
  verifyToken,
  requireRole,
  requireActivePlan,
} from "../../shared/middleware/auth.middleware.js";
import { uploadCvs } from "../controllers/upload.controller.js";

// CVs are held in memory just long enough to be parsed and scored - nothing is
// written to disk. 8 MB is generous for a CV; 200 files covers a bulk drop.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024, files: 200 },
});

const router = Router();

router.use(verifyToken, requireActivePlan);
router.post("/:jobId", requireRole("hr", "manager"), upload.array("cvs", 200), uploadCvs);

export default router;
