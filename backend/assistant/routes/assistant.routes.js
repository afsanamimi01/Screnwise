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

/** Every role gets the assistant - ownership gates threads, not role. */
router.use(verifyToken);

router.get("/status", getStatus);
router.post("/ask", askAssistant);

router.get("/conversations", listConversations);
router.get("/conversations/:id", getConversation);
router.delete("/conversations/:id", deleteConversation);

export default router;
