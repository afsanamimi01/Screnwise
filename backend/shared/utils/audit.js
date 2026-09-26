import AuditLog from "../models/AuditLog.model.js";

/** Records one activity-log entry. */
export async function logAudit(actor, action, detail, companyId = null) {
  await AuditLog.create({ actor, action, detail, companyId });
}
