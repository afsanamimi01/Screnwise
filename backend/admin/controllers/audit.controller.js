import AuditLog from "../../shared/models/AuditLog.model.js";

export async function listAuditLog(req, res, next) {
  try {
    const limit = Math.min(Number(req.query.limit) || 200, 500);
    // Always take the most recent `limit` entries, then flip them for the
    // oldest-first view - sorting ascending in the query would make the limit
    // keep the oldest entries and hide everything recent.
    const entries = await AuditLog.find().sort({ timestamp: -1 }).limit(limit);
    if (req.query.order === "asc") entries.reverse();
    res.json(entries);
  } catch (err) {
    next(err);
  }
}
