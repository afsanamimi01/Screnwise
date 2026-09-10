import { ragConfig } from "../config.js";
import { declarationsFor, dispatch } from "./tools.js";

const BASE = "https://generativelanguage.googleapis.com/v1beta/models";
/** A runaway tool result would push the real conversation out of context. */
const MAX_RESULT_CHARS = 12000;
const MAX_HISTORY = 12;

export class AssistantUnavailableError extends Error {
  constructor(message) {
    super(message);
    this.name = "AssistantUnavailableError";
    this.status = 503;
  }
}

/**
 * What the assistant is and is not allowed to do, per role.
 *
 * The blind-board rule is the one worth reading twice. Screenwise's product
 * pillar is that a recruiter judges the work before they know whose work it is,
 * and an assistant that names an un-shortlisted candidate would quietly undo
 * that. Retrieval already redacts CV passages, so the model has no name to
 * leak; this tells it why, so it explains the rule instead of apologising for
 * a gap it cannot see the reason for.
 */
function systemInstruction(user) {
  const shared = `
You are the Screenwise assistant. Screenwise is a multi-tenant CV-screening product:
recruiters post a job, upload or receive CVs, and the screening engine scores each one
against that job's own skills, weights and hard filters.

Every fact you state must come from a tool result in this conversation. You have no
knowledge of this company, its jobs or its candidates beyond what a tool has just
returned. Never invent a score, a skill, a count, a name or a status. If a tool returns
nothing, say plainly that you could not find it - do not fill the gap.

You have two kinds of lookup and they are not interchangeable. search_knowledge_base
reads written material - what a CV actually says, what a job post asks for, how the
product works. The other tools return live records. Quantify from a record; describe
from a passage; use both when a question needs each. If a retrieved passage and a live
record disagree, the record is right - a passage may have been indexed before the last
change.

Call tools without asking permission. If a question needs two lookups, do both before
answering. Never mention tool names, internal statuses, document ids or that you are
retrieving anything - answer as someone who simply knows where to look.

Be concise and concrete. Prefer a short list of specifics over a paragraph of hedging.
Answer in the language the user wrote in.`.trim();

  if (user.role === "candidate") {
    return `${shared}

You are helping a CANDIDATE - ${user.name}. You can see their own applications, their own
score breakdowns, their profile, and every job open to public applications. You cannot see
other candidates, and you cannot see anything about who else applied to a role - not their
number, not their scores. Say so plainly if asked.

Your most valuable job is explaining a score honestly and telling them what would raise it.
The breakdown names exactly which required skills were not found in their CV; that list is
the answer to "how do I improve". Be encouraging but never dishonest: do not tell someone
they are a strong match when the breakdown says otherwise, and never promise an outcome -
shortlisting is always a human decision made by the recruiter.`;
  }

  if (user.role === "superadmin") {
    return `${shared}

You are helping the PLATFORM OPERATOR. You can read Screenwise's own product documentation
only. You deliberately cannot read any customer's jobs, candidates or CVs through this
assistant - that is a privacy boundary, not a missing feature, and you should say exactly
that if asked. Point them at the admin screens for platform data.`;
  }

  return `${shared}

You are helping a RECRUITER (${user.role}) at one company. You can see that company's jobs,
its rank boards and the CVs screened against them. You can never see another company's
anything.

The rank board is BLIND. Until a candidate is shortlisted, they are identified only by an
alias like "Candidate #007", and their name, email and phone are not available to you at
all - CV passages are stored with those details removed. This is deliberate: the point is
that the work is judged before the person is known. Refer to candidates by their alias, and
if asked for a name, explain that identities unlock on shortlisting and can then be read
from the job's shortlist page. Do not speculate about anyone's identity, gender,
nationality or age from what a CV says.

The score is the engine's opinion, not a verdict. It is arithmetic over that job's weights,
so it rewards what the job form asked for and nothing else - a strong candidate can score
low because the form never mentioned what they are good at. Say so when it is relevant, and
never recommend rejecting anyone: the system suggests, the recruiter decides.`;
}

const textPart = (text) => ({ text });

/** How many times a transient failure is retried before the user sees it. */
const MAX_RETRIES = 3;
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** Google returns the wait it wants as a RetryInfo detail (`"retryDelay": "12s"`). */
function retryDelayFrom(body) {
  const match = /"retryDelay"\s*:\s*"(\d+(?:\.\d+)?)s"/.exec(body ?? "");
  return match ? Math.ceil(Number(match[1]) * 1000) : null;
}

/**
 * One Gemini call, retried through the transient failures.
 *
 * Flash returns 503 "experiencing high demand" often enough that a single
 * attempt is not a working feature - it means a question fails outright while
 * the model is merely busy, which reads to the user as a broken assistant. A
 * 429 is the same story on the free tier's quota.
 *
 * Waits are kept short here, unlike the indexer's: someone is sitting in front
 * of a chat box. Better to give up after a few seconds with an honest message
 * than to hold a request open for a minute.
 */
async function generate({ apiKey, model, system, contents, tools, temperature }) {
  const body = {
    systemInstruction: { parts: [textPart(system)] },
    contents,
    generationConfig: { temperature },
  };
  if (tools?.length) body.tools = [{ functionDeclarations: tools }];

  let delay = 1200;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    const response = await fetch(`${BASE}/${model}:generateContent`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-goog-api-key": apiKey },
      body: JSON.stringify(body),
    });

    if (response.ok) return response.json();

    const detail = await response.text().catch(() => "");

    if ((response.status === 429 || response.status >= 500) && attempt < MAX_RETRIES) {
      await sleep(Math.min(retryDelayFrom(detail) ?? delay, 8000));
      delay *= 2;
      continue;
    }

    if (response.status === 429) {
      throw new AssistantUnavailableError(
        "The assistant has hit its rate limit for now. Try again in a minute.",
      );
    }
    if (response.status === 503) {
      throw new AssistantUnavailableError(
        "The assistant is busy right now - that is Google's model under load, not your data. Try again in a moment.",
      );
    }
    throw new AssistantUnavailableError(
      `The assistant is unavailable (${response.status}). ${detail.slice(0, 200)}`,
    );
  }
}

const partsOf = (json) => json?.candidates?.[0]?.content?.parts ?? [];

function truncate(result) {
  const text = JSON.stringify(result);
  if (text.length <= MAX_RESULT_CHARS) return result;
  return {
    truncated: true,
    note: "This result was too large to return in full. Narrow the question or use a filter.",
    preview: text.slice(0, MAX_RESULT_CHARS),
  };
}

/**
 * Answer one question.
 *
 * @param {object} user     the signed-in user
 * @param {string} question
 * @param {Array<{role: string, text: string}>} [history] prior turns, oldest first
 * @returns {Promise<{reply: string, toolsUsed: string[], sources: string[]}>}
 */
export async function ask(user, question, history = []) {
  const { apiKey, model, maxToolRounds, temperature } = ragConfig.chat;
  if (!apiKey) {
    throw new AssistantUnavailableError(
      "The assistant is not configured on this server: GEMINI_API_KEY is not set.",
    );
  }

  const system = systemInstruction(user);
  const tools = declarationsFor(user);

  const contents = [
    ...history.slice(-MAX_HISTORY).map((turn) => ({
      role: turn.role === "assistant" ? "model" : "user",
      parts: [textPart(turn.text)],
    })),
    { role: "user", parts: [textPart(question)] },
  ];

  const toolsUsed = [];
  const sources = [];

  for (let round = 0; round <= maxToolRounds; round++) {
    // The last round is spent answering: offering tools again would let a model
    // stuck in a lookup loop never produce a reply at all.
    const offer = round === maxToolRounds ? [] : tools;
    const json = await generate({ apiKey, model, system, contents, tools: offer, temperature });
    const parts = partsOf(json);
    const calls = parts.filter((p) => p.functionCall).map((p) => p.functionCall);

    if (!calls.length) {
      const reply = parts
        .map((p) => p.text)
        .filter(Boolean)
        .join("")
        .trim();
      return {
        reply: reply || "I could not put an answer together for that. Try rephrasing it?",
        toolsUsed: [...new Set(toolsUsed)],
        sources: [...new Set(sources)],
      };
    }

    // Echo the model's own turn back, then answer every call it made in ONE
    // user turn - split across several, the model quietly stops making
    // parallel calls.
    contents.push({ role: "model", parts });

    const responses = [];
    for (const call of calls) {
      toolsUsed.push(call.name);
      let result;
      try {
        result = await dispatch(call.name, call.args, user);
      } catch (err) {
        // A broken tool must come back as a result, not vanish - dropping it
        // leaves the model waiting on an answer forever.
        console.warn(`[assistant] tool ${call.name} failed:`, err.message);
        result = { error: "That lookup failed. Tell the user you could not retrieve it." };
      }
      for (const passage of result?.passages ?? []) {
        if (passage.title) sources.push(passage.title);
      }
      responses.push({
        functionResponse: { name: call.name, response: truncate(result) },
      });
    }

    contents.push({ role: "user", parts: responses });
  }

  return {
    reply: "I could not finish looking that up. Try asking it more narrowly.",
    toolsUsed: [...new Set(toolsUsed)],
    sources: [...new Set(sources)],
  };
}
