import { Router } from "express";
import { verifyToken, requireRole } from "../../shared/middleware/auth.middleware.js";
import { getBoard } from "../controllers/board.controller.js";

const router = Router();

router.use(verifyToken);
router.get("/:jobId", requireRole("hr", "admin"), getBoard);

export default router;
