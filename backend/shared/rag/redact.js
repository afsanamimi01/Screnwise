import { extractContact } from "../engine/contact.js";

/**
 * Strip identifying details out of CV text before it is indexed.
 *
 * The rank board is blind until a candidate is shortlisted, and retrieval must
 * not be the hole in that. Redaction happens at INDEX time, unconditionally,
 * for every CV passage - not at answer time, and not conditionally on the
 * candidate's current status.
 *
 * Two reasons it is done this way round. A leak is permanent: once a name has
 * been embedded and handed to a model as context, no later status change takes
 * it back. And shortlisting a candidate would otherwise have to re-embed every
 * one of their passages to reveal a name, which turns a cheap status flip into
 * an API bill. A shortlisted candidate's identity is already available in full
 * from the shortlist endpoint, which is the right place to read it from.
 *
 * What remains is what a recruiter actually screens on - the work history, the
 * skills, the education - with the person's handle on it and nothing else.
 */

const EMAIL = /[\w.+-]+@[\w-]+\.[\w.-]+/g;
const SCHEME_URL = /\b(?:https?:\/\/|www\.)\S+/gi;
/**
 * Bare profile domains - a CV prints "linkedin.com/in/jordan-blake" far more
 * often than it prints the scheme, and that path carries the name. Restricted
 * to a TLD list so "Node.js", "asp.net" and "socket.io" survive: a technology
 * with a domain-shaped name is the whole point of the corpus.
 */
const BARE_URL = /\b(?:[\w-]+\.)+(?:com|org|net|io|dev|co|me|ai|app|xyz|info|biz)\/\S*/gi;
const HANDLE = /(?:^|\s)@[\w.-]{2,}/g;

/**
 * A date range is not a phone number. `2019 - 2023`, `2019-2023` and
 * `2019 – present` are the single most common digit runs in a CV, and eating
 * them would remove exactly what a recruiter searches on. `contact.js` guards
 * against this for the same reason; so does this.
 */
const YEAR_RANGE = /^\s*(?:19|20)\d{2}\s*[-–—]\s*(?:(?:19|20)\d{2}|present|current|now)\s*$/i;
/** 7-15 digits with an optional country code and the usual separators. */
const PHONE = /\+?\d[\d\s().\-–]{5,18}\d/g;

/** Words too generic to blank out wherever they appear in a CV. */
const NOT_A_NAME = new Set([
  "the", "and", "for", "senior", "junior", "lead", "head", "chief", "engineer",
  "manager", "developer", "analyst", "officer", "director", "consultant",
]);

const countDigits = (s) => (s.match(/\d/g) ?? []).length;
const escape = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, String.raw`\$&`);

/**
 * Is this digit run actually a phone number?
 *
 * Length is the discriminator. A real number carries a country or area code, so
 * nine digits is a safe floor, and anything shorter in a CV is far more likely
 * to be a year, a postcode, a GPA or a bullet count. A leading `+` is taken as
 * proof on its own.
 */
function looksLikePhone(match) {
  if (YEAR_RANGE.test(match)) return false;
  const digits = countDigits(match);
  if (digits > 15) return false;
  return match.trim().startsWith("+") ? digits >= 7 : digits >= 9;
}

/**
 * @param {string} text  raw CV text
 * @param {string} [alias]  the blind handle to substitute, e.g. "Candidate #007"
 * @returns {{ text: string, removed: string[] }}
 */
export function redactCv(text, alias = "This candidate") {
  let out = String(text || "");
  const removed = new Set();

  const { name } = extractContact(out);

  // Links first: their paths carry the name, so they must go before the name
  // substitution turns "linkedin.com/in/jordan-blake" into nonsense.
  for (const pattern of [SCHEME_URL, BARE_URL]) {
    out = out.replace(pattern, () => {
      removed.add("link");
      return "[link removed]";
    });
  }

  out = out.replace(EMAIL, () => {
    removed.add("email");
    return "[email removed]";
  });

  out = out.replace(PHONE, (match) => {
    if (!looksLikePhone(match)) return match;
    removed.add("phone");
    // Keep the surrounding spacing the separators implied.
    return `${match.startsWith(" ") ? " " : ""}[phone removed]`;
  });

  out = out.replace(HANDLE, () => {
    removed.add("handle");
    return " [handle removed]";
  });

  // Then the name itself, whole and in parts, wherever it appears - a CV
  // repeats it in headers, footers and the summary line.
  if (name) {
    for (const part of [name, ...name.split(/\s+/)]) {
      const token = part.trim();
      if (token.length < 3 || NOT_A_NAME.has(token.toLowerCase())) continue;
      const before = out;
      out = out.replace(new RegExp(String.raw`\b${escape(token)}\b`, "gi"), alias);
      if (out !== before) removed.add("name");
    }
  }

  return { text: out.replace(/[ \t]{2,}/g, " ").trim(), removed: [...removed] };
}
