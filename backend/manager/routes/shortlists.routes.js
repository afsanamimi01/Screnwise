import { Router } from "express";
import { verifyToken, requireRole } from "../../shared/middleware/auth.middleware.js";
import { leaveFeedback, listManagerShortlists } from "../controllers/shortlists.controller.js";

const router = Router();

router.use(verifyToken, requireRole("manager"));

router.get("/shortlists", listManagerShortlists);
router.post("/feedback", leaveFeedback);

export default router;
