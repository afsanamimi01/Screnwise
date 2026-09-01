import { Router } from "express";
import { verifyToken, requireRole } from "../../shared/middleware/auth.middleware.js";
import { uploadCvs } from "../controllers/upload.controller.js";

const router = Router();

router.use(verifyToken);
router.post("/:jobId", requireRole("hr", "manager"), uploadCvs);

export default router;
