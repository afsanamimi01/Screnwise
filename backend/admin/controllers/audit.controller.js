import AuditLog from "../../shared/models/AuditLog.model.js";

export async function listAuditLog(req, res, next) {
  try {
    const limit = Math.min(Number(req.query.limit) || 200, 500);
    const entries = await AuditLog.find().sort({ timestamp: -1 }).limit(limit);
    res.json(entries);
  } catch (err) {
    next(err);
  }
}
