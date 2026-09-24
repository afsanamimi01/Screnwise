import { Router } from "express";
import {
  verifyToken,
  requireRole,
  requireActivePlan,
} from "../../shared/middleware/auth.middleware.js";
import { getBoard } from "../controllers/board.controller.js";

const router = Router();

router.use(verifyToken, requireActivePlan, requireRole("hr"));
router.get("/:jobId", getBoard);

export default router;
