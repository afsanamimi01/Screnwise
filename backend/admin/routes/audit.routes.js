import { Router } from "express";
import { verifyToken, requireRole } from "../../shared/middleware/auth.middleware.js";
import { listAuditLog } from "../controllers/audit.controller.js";

const router = Router();

router.use(verifyToken, requireRole("superadmin"));

router.get("/", listAuditLog);

export default router;
