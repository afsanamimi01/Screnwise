import { Router } from "express";
import { verifyToken } from "../../shared/middleware/auth.middleware.js";
import { getStatus, askAssistant } from "../controllers/assistant.controller.js";

const router = Router();

/**
 * Every role gets the assistant, including a company whose plan has lapsed:
 * `requireActivePlan` is deliberately not applied. Asking a question is a read,
 * and the plan gate already lets reads through - a manager locked out of their
 * own data while deciding whether to renew is the wrong moment to withhold the
 * one screen that explains the product.
 */
router.use(verifyToken);
router.get("/status", getStatus);
router.post("/ask", askAssistant);

export default router;
