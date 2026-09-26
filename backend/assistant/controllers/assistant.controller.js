import { ask, AssistantUnavailableError } from "../../shared/rag/assistant/service.js";
import { ragConfig } from "../../shared/rag/config.js";
import { embeddingClient } from "../../shared/rag/embeddings/index.js";
import RagDocument from "../../shared/models/RagDocument.model.js";
import Conversation from "../../shared/models/Conversation.model.js";
import { visibleFilter } from "../../shared/rag/visibility.js";

const MAX_QUESTION = 2000;
/** Turns of context sent to the model. Older messages stay stored, just unsent. */
const CONTEXT_TURNS = 12;
/** Messages kept on a thread before the oldest are dropped. */
const MAX_STORED = 200;

/** Every query is scoped by userId - never found for others. */
const own = (req, id) => ({ _id: id, userId: req.user._id });

/** A thread list needs a label, and the opening question is the honest one. */
function titleFrom(question) {
  const clean = question.replace(/\s+/g, " ").trim();
  return clean.length <= 60 ? clean : `${clean.slice(0, 57)}…`;
}

/** Whether the assistant can answer, and what it runs on. */
export async function getStatus(req, res, next) {
  try {
    const client = embeddingClient();
    const documents = await RagDocument.countDocuments(visibleFilter(req.user));

    res.json({
      ready: !!ragConfig.chat.apiKey && documents > 0,
      configured: !!ragConfig.chat.apiKey,
      documents,
      model: ragConfig.chat.model,
      embeddingModel: client.model,
      /** False means retrieval is keyword-only. */
      semanticSearch: client.semantic,
      retrievalMode: ragConfig.retrieval.mode,
    });
  } catch (err) {
    next(err);
  }
}

/** This account's threads, newest first. Never anyone else's. */
export async function listConversations(req, res, next) {
  try {
    const conversations = await Conversation.find({ userId: req.user._id })
      .select("title role lastMessageAt createdAt messages")
      .sort({ lastMessageAt: -1 })
      .limit(50)
      .lean();

    res.json(
      conversations.map((c) => ({
        id: String(c._id),
        title: c.title,
        role: c.role,
        messageCount: c.messages?.length ?? 0,
        lastMessageAt: c.lastMessageAt,
        createdAt: c.createdAt,
      })),
    );
  } catch (err) {
    next(err);
  }
}

export async function getConversation(req, res, next) {
  try {
    const conversation = await Conversation.findOne(own(req, req.params.id)).lean();
    if (!conversation) return res.status(404).json({ message: "No such conversation." });

    res.json({
      id: String(conversation._id),
      title: conversation.title,
      role: conversation.role,
      messages: conversation.messages ?? [],
    });
  } catch (err) {
    next(err);
  }
}

export async function deleteConversation(req, res, next) {
  try {
    const result = await Conversation.deleteOne(own(req, req.params.id));
    if (!result.deletedCount) return res.status(404).json({ message: "No such conversation." });
    res.json({ deleted: true });
  } catch (err) {
    next(err);
  }
}

export async function askAssistant(req, res, next) {
  try {
    const question = String(req.body?.question ?? "").trim();
    if (!question) return res.status(400).json({ message: "Ask a question first." });
    if (question.length > MAX_QUESTION) {
      return res.status(400).json({ message: `Keep it under ${MAX_QUESTION} characters.` });
    }

    // Continue or start thread
    let conversation = req.body?.conversationId
      ? await Conversation.findOne(own(req, req.body.conversationId))
      : null;

    if (!conversation) {
      conversation = new Conversation({
        userId: req.user._id,
        role: req.user.role,
        companyId: req.user.companyId ?? null,
        title: titleFrom(question),
        messages: [],
      });
    }

    /** History comes from the stored thread, never the request body. */
    const history = conversation.messages
      .filter((m) => !m.failed)
      .slice(-CONTEXT_TURNS)
      .map((m) => ({ role: m.role, text: m.text }));

    conversation.messages.push({ role: "user", text: question, at: new Date() });

    let answer;
    try {
      answer = await ask(req.user, question, history);
    } catch (err) {
      if (err instanceof AssistantUnavailableError) {
        // The failure is stored too, so a refresh does not silently drop the
        // question the user actually asked.
        conversation.messages.push({
          role: "assistant",
          text: err.message,
          failed: true,
          at: new Date(),
        });
        await persist(conversation);
        return res.status(err.status).json({
          message: err.message,
          conversationId: String(conversation._id),
        });
      }
      throw err;
    }

    conversation.messages.push({
      role: "assistant",
      text: answer.reply,
      toolsUsed: answer.toolsUsed,
      at: new Date(),
    });
    await persist(conversation);

    res.json({ ...answer, conversationId: String(conversation._id) });
  } catch (err) {
    if (err instanceof AssistantUnavailableError) {
      return res.status(err.status).json({ message: err.message });
    }
    next(err);
  }
}

/** Trim to the cap and save. A thread grows without limit otherwise. */
async function persist(conversation) {
  if (conversation.messages.length > MAX_STORED) {
    conversation.messages = conversation.messages.slice(-MAX_STORED);
  }
  conversation.lastMessageAt = new Date();
  await conversation.save();
}
