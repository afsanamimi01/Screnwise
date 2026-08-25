import { Router } from "express";
import { verifyToken, requireRole } from "../../shared/middleware/auth.middleware.js";
import { listMyApplications } from "../controllers/applications.controller.js";

const router = Router();

router.get("/", verifyToken, requireRole("candidate"), listMyApplications);

export default router;
