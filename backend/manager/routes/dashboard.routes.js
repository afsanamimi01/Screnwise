import { Router } from "express";
import {
  verifyToken,
  requireRole,
  requireActivePlan,
} from "../../shared/middleware/auth.middleware.js";
import { getDashboard } from "../controllers/dashboard.controller.js";

const router = Router();

router.use(verifyToken, requireActivePlan, requireRole("manager"));
router.get("/", getDashboard);

export default router;
