import AuditLog from "../models/AuditLog.model.js";

export async function logAudit(actor, action, detail) {
  await AuditLog.create({ actor, action, detail });
}
