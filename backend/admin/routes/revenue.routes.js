import { Router } from "express";
import { verifyToken, requireRole } from "../../shared/middleware/auth.middleware.js";
import { getRevenue } from "../controllers/revenue.controller.js";

const router = Router();

router.use(verifyToken, requireRole("superadmin"));

router.get("/", getRevenue);

export default router;
