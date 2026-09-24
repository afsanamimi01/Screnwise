import AuditLog from "../../shared/models/AuditLog.model.js";

export async function listAuditLog(req, res, next) {
  try {
    // ---- Sort config ----
    // Always take the most recent `limit` entries, then flip them for the
    // oldest-first view - sorting ascending in the query would make the limit
    // keep the oldest entries and hide everything recent.
    const SORT_BY = "timestamp desc";
    const [sortField, sortWord] = SORT_BY.split(" ");
    const sortOrder = sortWord === "desc" ? -1 : 1;

    const limit = Math.min(Number(req.query.limit) || 200, 500);
    const allEntries = await AuditLog.find()
      .sort({ [sortField]: sortOrder })
      .limit(limit);

    const rows = [];
    for (const entry of allEntries) {
      // ---- Field: Action ----
      const action = entry.action;

      // ---- Field: Detail ----
      const detail = entry.detail;

      // ---- Field: Actor (shown as "by <actor>") ----
      const actor = entry.actor;

      rows.push({
        ...entry.toJSON(),
        action,
        detail,
        actor,
      });
    }

    // The requested view order - newest first by default, oldest first if asked.
    if (req.query.order === "asc") rows.reverse();

    res.json(rows);
  } catch (err) {
    next(err);
  }
}
