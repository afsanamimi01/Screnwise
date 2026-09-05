/**
 * Template rendering for candidate emails.
 *
 * The composer writes one message with `{{variables}}` in it; this fills them
 * in per recipient, so every candidate gets their own name rather than the
 * literal placeholder. Unknown placeholders are left untouched - that reads as
 * an obvious mistake in the preview instead of silently vanishing.
 */

/** Placeholders the composer offers. Keep in sync with the UI hint. */
export const TEMPLATE_VARIABLES = ["candidate_name", "job_title", "company_name", "hr_name"];

const PLACEHOLDER = /{{\s*([a-z_]+)\s*}}/gi;

export function renderTemplate(text, vars) {
  return String(text ?? "").replace(PLACEHOLDER, (match, key) => {
    const value = vars[key.toLowerCase()];
    return value === undefined || value === null || value === "" ? match : String(value);
  });
}

function escapeHtml(text) {
  return String(text ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

/**
 * Wraps the composer's plain-text body in a plain, inline-styled HTML layout.
 * Email clients strip <style> blocks and support almost no modern CSS, so
 * everything here is inline and deliberately conservative.
 */
export function textToHtml(text, { title = "", footer = "" } = {}) {
  const paragraphs = String(text ?? "")
    .split(/\n{2,}/)
    .map((block) => escapeHtml(block.trim()).replaceAll("\n", "<br />"))
    .filter(Boolean)
    .map(
      (block) =>
        `<p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#24343b">${block}</p>`,
    )
    .join("");

  const heading = title
    ? `<h1 style="margin:0 0 20px;font-size:18px;line-height:1.3;font-weight:600;color:#04191f">${escapeHtml(title)}</h1>`
    : "";

  const foot = footer
    ? `<p style="margin:24px 0 0;padding-top:16px;border-top:1px solid #dee4e7;font-size:12px;line-height:1.5;color:#5e6b73">${escapeHtml(footer)}</p>`
    : "";

  return [
    '<div style="margin:0;padding:24px 12px;background:#f4f7f8">',
    '<div style="max-width:560px;margin:0 auto;padding:32px;border:1px solid #dee4e7;border-radius:12px;background:#ffffff;font-family:-apple-system,BlinkMacSystemFont,\'Segoe UI\',Roboto,Helvetica,Arial,sans-serif">',
    heading,
    paragraphs,
    foot,
    "</div>",
    "</div>",
  ].join("");
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isEmailAddress(value) {
  return typeof value === "string" && EMAIL_PATTERN.test(value.trim());
}
