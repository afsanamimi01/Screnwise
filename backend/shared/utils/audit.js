import AuditLog from "../models/AuditLog.model.js";

/**
 * Records one activity-log entry.
 *
 * @param {string} actor   Display name of who did it.
 * @param {string} action  Short verb phrase, e.g. "Job created".
 * @param {string} detail  Free-text context.
 * @param {import("mongoose").Types.ObjectId|string|null} [companyId]
 *        Scopes the entry to one company. Omit for platform-level actions.
 */
export async function logAudit(actor, action, detail, companyId = null) {
  await AuditLog.create({ actor, action, detail, companyId });
}
