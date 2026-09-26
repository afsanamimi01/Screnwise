import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "@/shared/lib/auth";
import {
  askAssistant,
  deleteConversation,
  getAssistantStatus,
  getConversation,
  getConversations,
  type AssistantMessage,
  type AssistantStatus,
  type ConversationSummary,
} from "@/shared/lib/api";
import "./AssistantPanel.css";

/** The assistant, as a panel following the user across signed-in pages. */

/** Openers, chosen per role - an empty chat box gets asked nothing. */
const PROMPTS: Record<string, string[]> = {
  hr: [
    "Which candidates have led a team?",
    "Who has the strongest backend experience?",
    "Why is the top candidate ranked first?",
    "What does the blind board actually hide?",
  ],
  manager: [
    "Which roles have the most candidates waiting?",
    "Who scored above 70 on our newest job?",
    "How do the scoring weights work?",
    "What happens when a hard filter fails?",
  ],
  candidate: [
    "How did I score on my applications?",
    "What should I add to my CV?",
    "Which open roles suit my background?",
    "What does my application status mean?",
  ],
  superadmin: [
    "How does the screening engine score a CV?",
    "What is the blind rank board?",
    "How do plans and HR seats work?",
  ],
};

interface Message extends AssistantMessage {
  key: string;
}

const withKey = (m: AssistantMessage, i: number): Message => ({ ...m, key: `${i}-${m.at ?? ""}` });

export default function AssistantPanel() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<AssistantStatus | null>(null);
  const [threads, setThreads] = useState<ConversationSummary[]>([]);
  const [showThreads, setShowThreads] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");
  const [pending, setPending] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const refreshThreads = useCallback(() => {
    getConversations()
      .then(setThreads)
      .catch(() => setThreads([]));
  }, []);

  // Status and threads load when the panel is first opened, not on every page
  // load - both are database reads, and nobody needs them before they ask.
  useEffect(() => {
    if (!open || !user) return;
    if (!status) getAssistantStatus().then(setStatus).catch(() => setStatus(null));
    refreshThreads();
  }, [open, status, user, refreshThreads]);

  // A different account is a different owner: drop everything on screen rather
  // than leaving one person's thread visible under another's name.
  useEffect(() => {
    setConversationId(null);
    setMessages([]);
    setThreads([]);
    setStatus(null);
    setShowThreads(false);
  }, [user?.id]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, pending]);

  if (!user) return null;

  const prompts = PROMPTS[user.role] ?? PROMPTS.candidate;

  function startNew() {
    setConversationId(null);
    setMessages([]);
    setShowThreads(false);
    inputRef.current?.focus();
  }

  async function openThread(id: string) {
    setShowThreads(false);
    try {
      const thread = await getConversation(id);
      setConversationId(thread.id);
      setMessages(thread.messages.map(withKey));
    } catch {
      // Gone, or never this account's. Either way there is nothing to show.
      refreshThreads();
    }
  }

  async function removeThread(id: string) {
    try {
      await deleteConversation(id);
      if (id === conversationId) startNew();
      refreshThreads();
    } catch {
      refreshThreads();
    }
  }

  async function send(question: string) {
    const text = question.trim();
    if (!text || pending) return;

    setMessages((prev) => [...prev, { key: `q${Date.now()}`, role: "user", text }]);
    setDraft("");
    setPending(true);

    try {
      const answer = await askAssistant(text, conversationId);
      setConversationId(answer.conversationId);
      setMessages((prev) => [
        ...prev,
        {
          key: `a${Date.now()}`,
          role: "assistant",
          text: answer.reply,
          toolsUsed: answer.toolsUsed,
        },
      ]);
      refreshThreads();
    } catch (err) {
      const failure = err as { message?: string; conversationId?: string };
      setMessages((prev) => [
        ...prev,
        {
          key: `e${Date.now()}`,
          role: "assistant",
          failed: true,
          text: failure.message ?? "The assistant could not answer just now.",
        },
      ]);
      refreshThreads();
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <button
        type="button"
        className="assistant__launcher"
        aria-expanded={open}
        aria-controls="assistant-panel"
        onClick={() => setOpen((v) => !v)}
      >
        {open ? "Close" : "Ask Screenwise"}
      </button>

      <aside
        id="assistant-panel"
        className={`assistant${open ? " assistant--open" : ""}`}
        aria-hidden={!open}
        aria-label="Screenwise assistant"
      >
        <header className="assistant__head">
          <div className="assistant__head-text">
            <p className="assistant__title">Screenwise assistant</p>
            <p className="assistant__subtitle">
              {status
                ? `${status.documents.toLocaleString()} documents it can read for you`
                : "Grounded in what you already have access to"}
            </p>
          </div>
          <div className="assistant__head-actions">
            <button
              type="button"
              className="assistant__icon-btn"
              onClick={() => setShowThreads((v) => !v)}
              aria-pressed={showThreads}
              title="Your conversations"
            >
              History{threads.length ? ` (${threads.length})` : ""}
            </button>
            <button type="button" className="assistant__icon-btn" onClick={startNew} title="Start a new conversation">
              New
            </button>
            <button
              type="button"
              className="assistant__close"
              onClick={() => setOpen(false)}
              aria-label="Close the assistant"
            >
              ×
            </button>
          </div>
        </header>

        {showThreads && (
          <div className="assistant__threads">
            {threads.length === 0 && <p className="assistant__threads-empty">No saved conversations yet.</p>}
            {threads.map((thread) => (
              <div
                key={thread.id}
                className={
                  "assistant__thread" + (thread.id === conversationId ? " assistant__thread--current" : "")
                }
              >
                <button type="button" className="assistant__thread-open" onClick={() => openThread(thread.id)}>
                  <span className="assistant__thread-title">{thread.title}</span>
                  <span className="assistant__thread-meta">
                    {thread.messageCount} message{thread.messageCount === 1 ? "" : "s"} ·{" "}
                    {new Date(thread.lastMessageAt).toLocaleDateString()}
                  </span>
                </button>
                <button
                  type="button"
                  className="assistant__thread-del"
                  onClick={() => removeThread(thread.id)}
                  aria-label={`Delete conversation: ${thread.title}`}
                  title="Delete"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Say why it can't answer yet, like the composer's mail driver notice. */}
        {status && !status.configured && (
          <p className="assistant__notice">
            The assistant is not switched on for this server yet. An administrator needs to set
            <code> GEMINI_API_KEY</code> in the backend environment.
          </p>
        )}
        {status?.configured && !status.semanticSearch && (
          <p className="assistant__notice">
            Running the offline development embedder, so search matches words rather than
            meaning. Answers will be thinner than they should be.
          </p>
        )}

        <div className="assistant__log" ref={listRef}>
          {messages.length === 0 && (
            <div className="assistant__empty">
              <p className="assistant__empty-title">Ask about what's in front of you.</p>
              <p className="assistant__empty-text">
                It reads only what your account can already see, and answers from records rather
                than memory. Your conversations are private to you.
              </p>
              <div className="assistant__prompts">
                {prompts.map((prompt) => (
                  <button
                    key={prompt}
                    type="button"
                    className="assistant__prompt"
                    onClick={() => send(prompt)}
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((message) => (
            <div
              key={message.key}
              className={
                `assistant__msg assistant__msg--${message.role}` +
                (message.failed ? " assistant__msg--failed" : "")
              }
            >
              {message.text}
            </div>
          ))}

          {pending && (
            <div className="assistant__msg assistant__msg--assistant assistant__msg--thinking">
              <span className="assistant__dot" />
              <span className="assistant__dot" />
              <span className="assistant__dot" />
            </div>
          )}
        </div>

        <form
          className="assistant__composer"
          onSubmit={(event) => {
            event.preventDefault();
            send(draft);
          }}
        >
          <textarea
            ref={inputRef}
            className="assistant__input"
            value={draft}
            rows={1}
            placeholder="Ask a question…"
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              // Enter sends, shift+enter breaks the line - what a chat box is
              // expected to do, and the textarea is only here for the latter.
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                send(draft);
              }
            }}
          />
          <button type="submit" className="assistant__send" disabled={pending || !draft.trim()}>
            Send
          </button>
        </form>
      </aside>
    </>
  );
}
