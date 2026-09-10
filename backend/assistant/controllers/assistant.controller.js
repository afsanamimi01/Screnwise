import { ask, AssistantUnavailableError } from "../../shared/rag/assistant/service.js";
import { ragConfig } from "../../shared/rag/config.js";
import { embeddingClient } from "../../shared/rag/embeddings/index.js";
import RagDocument from "../../shared/models/RagDocument.model.js";
import { visibleFilter } from "../../shared/rag/visibility.js";

const MAX_QUESTION = 2000;

/**
 * Whether the assistant can actually answer, and what it is running on.
 *
 * The client uses this to show a real explanation instead of a chat box that
 * fails on first use - the same reason the email composer says which mail
 * driver is live rather than pretending a message went out.
 */
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
      /**
       * False means retrieval is keyword-only. Worth surfacing: it is the
       * difference between "who has led a team" working and not, and it fails
       * as a thin answer rather than an error.
       */
      semanticSearch: client.semantic,
      retrievalMode: ragConfig.retrieval.mode,
    });
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

    // History comes from the client, so it is shaped and capped here rather
    // than trusted - it goes straight into a model prompt.
    const history = Array.isArray(req.body?.history)
      ? req.body.history
          .filter((t) => t && typeof t.text === "string" && t.text.trim())
          .slice(-12)
          .map((t) => ({
            role: t.role === "assistant" ? "assistant" : "user",
            text: t.text.slice(0, MAX_QUESTION),
          }))
      : [];

    const answer = await ask(req.user, question, history);
    res.json(answer);
  } catch (err) {
    if (err instanceof AssistantUnavailableError) {
      return res.status(err.status).json({ message: err.message });
    }
    next(err);
  }
}
