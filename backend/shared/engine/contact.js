/**
 * Pull the candidate's own contact details out of a parsed CV.
 *
 * The uploader used to invent an address from the file name
 * (`jordan-blake-cv.pdf` -> `jordan.blake@example.com`), which looked real and
 * silently sent every message nowhere. Nothing here is ever fabricated: what
 * isn't printed in the CV comes back as an empty string, and the composer
 * refuses to email a candidate it has no address for.
 *
 * Deliberately conservative - a missing address is honest, a wrong one mails a
 * stranger.
 */

/** Extensions that make a match an asset reference (`logo@2x.png`), not a person. */
const NOT_A_TLD =
  /^(png|jpg|jpeg|gif|svg|webp|bmp|tiff|pdf|docx?|pptx?|xlsx?|zip|css|js|html?)$/i;

const EMAIL = /[a-z0-9._%+'-]+@[a-z0-9-]+(?:\.[a-z0-9-]+)+/gi;

/**
 * Phone numbers as CVs actually print them: an optional country code, then 7-14
 * digits broken up by spaces, dashes, dots or brackets.
 */
const PHONE = /(?:\(?\+\d{1,3}\)?[\s.-]?)?(?:\(\d{1,4}\)[\s.-]?)?\d[\d\s.()-]{6,16}\d/g;

/** Lines that head a CV but are not the candidate's name. */
const HEADING =
  /^(curriculum\s+vitae|resume|résumé|cv|profile|personal\s+details|contact|summary|objective|about\s+me)\b/i;

/**
 * Words that make a line a job title, not a name. Dataset CVs (Kaggle's resume
 * set, for one) open with the role in capitals - "HR ADMINISTRATOR" - exactly
 * where a person's name would otherwise sit.
 */
const ROLE_WORD =
  /\b(engineer|developer|manager|analyst|administrator|designer|consultant|specialist|executive|officer|scientist|architect|intern|assistant|associate|director|coordinator|supervisor|technician|accountant|teacher|advocate|chef|fitness|trainer|sales|marketing|finance|banking|testing|operations|resume|profile)\b/i;

/** Sections whose addresses belong to someone else - referees, not the candidate. */
const OTHERS_SECTION = /\b(references?|referees?|recommendation)\b/i;

/**
 * PDF text extraction often glues a label to the value ("Email:name@host.com")
 * and can leave zero-width characters behind. Strip both before matching.
 */
function cleanForMatching(text) {
  return String(text ?? "")
    .replace(/[​-‍﻿]/g, "")
    .replace(/\r\n?/g, "\n");
}

function isPlausibleEmail(value) {
  const tld = value.split(".").pop() ?? "";
  if (NOT_A_TLD.test(tld)) return false;
  if (tld.length < 2 || /\d/.test(tld)) return false;
  // A local part that is only digits is nearly always an artefact of a mangled
  // PDF ligature rather than a real mailbox.
  return !/^\d+$/.test(value.split("@")[0] ?? "");
}

/**
 * The candidate's address, or "". Takes the earliest plausible match, since a
 * CV's own address sits in the header and any later one is usually a referee's.
 */
export function extractEmail(text) {
  const clean = cleanForMatching(text);
  const referencesAt = clean.search(OTHERS_SECTION);

  for (const match of clean.matchAll(EMAIL)) {
    const value = match[0].replace(/[.,;:]+$/, "").toLowerCase();
    if (!isPlausibleEmail(value)) continue;
    // Past a "References" heading the address is somebody else's - unless the
    // CV had none before it, in which case it is still the best we have.
    if (referencesAt !== -1 && match.index > referencesAt) continue;
    return value;
  }

  // Second pass without the references guard, for CVs whose only address sits
  // below such a heading (common when "Contact" follows "Summary").
  for (const match of clean.matchAll(EMAIL)) {
    const value = match[0].replace(/[.,;:]+$/, "").toLowerCase();
    if (isPlausibleEmail(value)) return value;
  }

  return "";
}

/** The candidate's phone number as printed, or "". */
export function extractPhone(text) {
  const clean = cleanForMatching(text);
  for (const match of clean.matchAll(PHONE)) {
    const raw = match[0].trim();
    const digits = raw.replace(/\D/g, "");
    if (digits.length < 7 || digits.length > 15) continue;
    // A year range ("2019 - 2022") reads as digits with a dash; a run of four
    // digits either side of a separator is a date, not a number to call.
    if (/^(19|20)\d{2}\s*[-–]\s*(19|20)\d{2}$/.test(raw)) continue;
    return raw.replace(/\s{2,}/g, " ");
  }
  return "";
}

/**
 * The name printed at the top of the CV, or "".
 *
 * Only the first few lines are considered, and only lines that look like a
 * person's name - two to four capitalised words, no digits, no punctuation
 * beyond a hyphen or apostrophe. Anything less certain returns "" so the caller
 * can fall back to the file name.
 */
export function extractName(text) {
  const lines = cleanForMatching(text)
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .slice(0, 8);

  for (const line of lines) {
    if (line.length > 48 || HEADING.test(line)) continue;
    if (/[@\d]/.test(line) || ROLE_WORD.test(line)) continue;
    const words = line.split(/\s+/);
    if (words.length < 2 || words.length > 4) continue;
    if (!words.every((w) => /^[A-Za-zÀ-ÖØ-öø-ÿ][A-Za-zÀ-ÖØ-öø-ÿ'.-]*$/.test(w))) continue;
    // ALL CAPS headers are common ("SENIOR DEVELOPER"); accept them as a name
    // only when every word is short enough to read as one.
    if (line === line.toUpperCase() && words.some((w) => w.length > 12)) continue;
    return words
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join(" ");
  }

  return "";
}

/**
 * Everything the CV says about how to reach this person. Any field the CV
 * doesn't state comes back empty - never guessed.
 *
 * @returns {{ email: string, phone: string, name: string }}
 */
export function extractContact(text) {
  return {
    email: extractEmail(text),
    phone: extractPhone(text),
    name: extractName(text),
  };
}
