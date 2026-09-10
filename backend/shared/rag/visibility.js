/**
 * Who may have what retrieved. This is the security model of the whole
 * feature, and it is a Mongo filter on purpose: it runs before scoring, so a
 * document the caller may not see is never a candidate, never ranked, and
 * never reaches the language model to be "handled discreetly".
 *
 * It mirrors `tenantFilter` in the auth middleware - same rule, applied to the
 * knowledge base instead of a collection of jobs.
 */

/**
 * @param {object} user     the signed-in user (`req.user`)
 * @param {object} [scope]
 * @param {string} [scope.jobId]        pin retrieval to one job's CV pile
 * @param {string[]} [scope.sourceTypes] restrict to these document kinds
 * @returns {object} a Mongo filter
 */
export function visibleFilter(user, scope = {}) {
  const clauses = [];

  /**
   * Shared material: not owned by a tenant AND not pinned to a person.
   *
   * The `visibleToUserId: null` half is load-bearing, and it is easy to leave
   * out. Without it "platform-wide, scoped to candidates" matches every
   * individual candidate's profile document rather than the product
   * documentation it was meant to describe - so any candidate could retrieve
   * any other candidate's profile, and the platform operator could retrieve all
   * of them. A document belongs to one person or to everybody, never both.
   */
  const shared = (roles) => ({
    companyId: null,
    visibleToUserId: null,
    visibleToRole: { $in: roles },
  });

  if (user.role === "superadmin") {
    // The platform operator sees platform material, not customers' CVs and not
    // individuals' profiles. Nothing about being an operator makes another
    // company's applicants readable, and an assistant is a poor place to make
    // that exception - the admin screens already show what an operator needs.
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
