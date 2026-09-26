import { extractContact } from "../engine/contact.js";

/** Strip identifying details from CV text before indexing. */

const EMAIL = /[\w.+-]+@[\w-]+\.[\w.-]+/g;
const SCHEME_URL = /\b(?:https?:\/\/|www\.)\S+/gi;
/** Bare profile domains carry the name, restricted to a TLD list. */
const BARE_URL = /\b(?:[\w-]+\.)+(?:com|org|net|io|dev|co|me|ai|app|xyz|info|biz)\/\S*/gi;
const HANDLE = /(?:^|\s)@[\w.-]{2,}/g;

/** A date range is not a phone number. */
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

/** Is this digit run actually a phone number? */
function looksLikePhone(match) {
  if (YEAR_RANGE.test(match)) return false;
  const digits = countDigits(match);
  if (digits > 15) return false;
  return match.trim().startsWith("+") ? digits >= 7 : digits >= 9;
}

/** Redact identifying details from CV text. */
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
