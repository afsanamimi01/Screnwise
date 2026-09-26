/** Who may have what retrieved - the security model. */

/** Mongo filter for what a user may retrieve. */
export function visibleFilter(user, scope = {}) {
  const clauses = [];

  /** Shared material: no tenant owner, no pinned owner. */
  const shared = (roles) => ({
    companyId: null,
    visibleToUserId: null,
    visibleToRole: { $in: roles },
  });

  if (user.role === "superadmin") {
    // Platform operator sees only platform material.
    clauses.push(shared(["all", "superadmin"]));
  } else if (user.role === "hr" || user.role === "manager") {
    clauses.push({ companyId: user.companyId });
    clauses.push(shared(["all", user.role]));
  } else {
    // Candidates: their own material, public job posts, and shared help.
    clauses.push({ visibleToUserId: user._id });
    clauses.push({ publicRead: true });
    clauses.push(shared(["all", "candidate"]));
  }

  const filter = { $or: clauses };

  if (scope.jobId) {
    // A job-scoped question still has to pass the clauses above; this narrows
    // within them, it never widens.
    filter.$and = [{ $or: [{ jobId: scope.jobId }, { jobId: null }] }];
  }
  if (scope.sourceTypes?.length) {
    filter.sourceType = { $in: scope.sourceTypes };
  }

  return filter;
}
