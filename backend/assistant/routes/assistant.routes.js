import { Router } from "express";
import { verifyToken } from "../../shared/middleware/auth.middleware.js";
import {
  getStatus,
  askAssistant,
  listConversations,
  getConversation,
  deleteConversation,
} from "../controllers/assistant.controller.js";

const router = Router();

/**
 * Every role gets the assistant, including a company whose plan has lapsed:
 * `requireActivePlan` is deliberately not applied. Asking a question is a read,
 * and the plan gate already lets reads through - a manager locked out of their
 * own data while deciding whether to renew is the wrong moment to withhold the
 * one screen that explains the product.
 *
 * There is no role gate on the conversation routes either, and none is needed:
 * ownership is the gate, and it is enforced in the query rather than here. A
 * thread that is not yours does not resolve, whatever your role.
 */
router.use(verifyToken);

router.get("/status", getStatus);
router.post("/ask", askAssistant);

router.get("/conversations", listConversations);
router.get("/conversations/:id", getConversation);
router.delete("/conversations/:id", deleteConversation);

export default router;
