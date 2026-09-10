import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/shared/lib/auth";
import {
  askAssistant,
  getAssistantStatus,
  type AssistantStatus,
  type AssistantTurn,
} from "@/shared/lib/api";
import "./AssistantPanel.css";

/**
 * The assistant, as a panel that follows the user across every signed-in page.
 *
 * It is deliberately not a route. The questions it answers are about whatever
 * is already on screen - this board, this score, this role - and sending
 * someone to a separate page to ask about the page they just left is the wrong
 * shape. Closed, it is one button; open, it never covers the primary column on
 * a desktop width.
 *
 * Conversation state is per session and lives here. Nothing is persisted: a
 * recruiter's question can name a candidate's details, and the transcript is
 * not something this product should be keeping.
 */

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

interface Message extends AssistantTurn {
  id: number;
  toolsUsed?: string[];
  failed?: boolean;
}

export default function AssistantPanel() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<AssistantStatus | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");
  const [pending, setPending] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Status is fetched once the panel is first opened, not on every page load -
  // it is a database count, and nobody needs it paid for before they ask.
  useEffect(() => {
    if (!open || status || !user) return;
    getAssistantStatus()
      .then(setStatus)
      .catch(() => setStatus(null));
  }, [open, status, user]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, pending]);

  if (!user) return null;

  const prompts = PROMPTS[user.role] ?? PROMPTS.candidate;

  async function send(question: string) {
    const text = question.trim();
    if (!text || pending) return;

    const asked: Message = { id: Date.now(), role: "user", text };
    // The history sent up is what came before this question, so the server is
    // never handed the question twice.
    const history: AssistantTurn[] = messages
      .filter((m) => !m.failed)
      .map(({ role, text }) => ({ role, text }));

    setMessages((prev) => [...prev, asked]);
    setDraft("");
    setPending(true);

    try {
      const answer = await askAssistant(text, history);
      setMessages((prev) => [
        ...prev,
        { id: Date.now() + 1, role: "assistant", text: answer.reply, toolsUsed: answer.toolsUsed },
      ]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now() + 1,
          role: "assistant",
          failed: true,
          text: err instanceof Error ? err.message : "The assistant could not answer just now.",
        },
      ]);
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
          <div>
            <p className="assistant__title">Screenwise assistant</p>
            <p className="assistant__subtitle">
              {status
                ? `${status.documents.toLocaleString()} documents it can read for you`
                : "Grounded in what you already have access to"}
            </p>
          </div>
          <button
            type="button"
            className="assistant__close"
            onClick={() => setOpen(false)}
            aria-label="Close the assistant"
          >
            ×
          </button>
        </header>

        {/*
          A chat box that fails on first use is worse than one that says why.
          The same reason the email composer names its mail driver instead of
          pretending a message went out.
        */}
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
                than memory.
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
              key={message.id}
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
          <button
            type="submit"
            className="assistant__send"
            disabled={pending || !draft.trim()}
          >
            Send
          </button>
        </form>
      </aside>
    </>
  );
}
