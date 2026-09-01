import { Router } from "express";
import { verifyToken, requireRole } from "../../shared/middleware/auth.middleware.js";
import { getAdminDashboard } from "../controllers/dashboard.controller.js";

const router = Router();

router.use(verifyToken, requireRole("superadmin"));

router.get("/", getAdminDashboard);

export default router;
