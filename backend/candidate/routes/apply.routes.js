import { Router } from "express";
import multer from "multer";
import { verifyToken, requireRole } from "../../shared/middleware/auth.middleware.js";
import { submitApplication } from "../controllers/apply.controller.js";

// An application MAY carry a one-off CV (multipart field `cv`). If it doesn't,
// the controller falls back to the CV on the candidate's profile.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024, files: 1 },
});

const router = Router();

router.post("/", verifyToken, requireRole("candidate"), upload.single("cv"), submitApplication);

export default router;
