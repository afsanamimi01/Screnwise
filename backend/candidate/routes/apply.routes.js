import { Router } from "express";
import { verifyToken, requireRole } from "../../shared/middleware/auth.middleware.js";
import { submitApplication } from "../controllers/apply.controller.js";

const router = Router();

router.post("/", verifyToken, requireRole("candidate"), submitApplication);

export default router;
