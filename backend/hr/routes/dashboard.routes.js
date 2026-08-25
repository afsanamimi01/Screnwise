import { Router } from "express";
import { verifyToken, requireRole } from "../../shared/middleware/auth.middleware.js";
import { getDashboard } from "../controllers/dashboard.controller.js";

const router = Router();

router.use(verifyToken);
router.get("/", requireRole("hr", "admin"), getDashboard);

export default router;
