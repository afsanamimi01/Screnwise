import { Router } from "express";
import { verifyToken, requireRole } from "../../shared/middleware/auth.middleware.js";
import { listUsers, updateUser } from "../controllers/users.controller.js";

const router = Router();

router.use(verifyToken, requireRole("superadmin"));

router.get("/", listUsers);
router.patch("/:id", updateUser);

export default router;
