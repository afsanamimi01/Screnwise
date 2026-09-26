import "dotenv/config";
import mongoose from "mongoose";
import { connectDB } from "../shared/config/db.js";
import User from "../shared/models/User.model.js";
import RagDocument from "../shared/models/RagDocument.model.js";
import { visibleFilter } from "../shared/rag/visibility.js";

/** Prove the retrieval boundary holds, against the real store. */
const results = [];
const check = (name, passed, detail = "") => {
  results.push({ name, passed, detail });
  console.log(`${passed ? "  ok  " : " FAIL "} ${name}${detail ? ` - ${detail}` : ""}`);
};

/** Everything this user could retrieve, ignoring ranking entirely. */
const reachable = (user, select) => RagDocument.find(visibleFilter(user)).select(select).lean();

async function main() {
  await connectDB();

  const [hrA, candidates, admin] = await Promise.all([
    User.findOne({ role: "hr", active: true }).lean(),
    User.find({ role: "candidate", active: true }).limit(2).lean(),
    User.findOne({ role: "superadmin" }).lean(),
  ]);

  const hrB = await User.findOne({
    role: "hr",
    active: true,
    companyId: { $ne: hrA?.companyId },
  }).lean();

  if (!hrA || !candidates.length || !admin) {
    console.error("Need at least one HR, one candidate and a superadmin in the database.");
    process.exitCode = 1;
    return;
  }

  // Tenant wall
  const hrDocs = await reachable(hrA, "companyId sourceType");
  const foreign = hrDocs.filter(
    (d) => d.companyId && String(d.companyId) !== String(hrA.companyId),
  );
  check(
    "HR reaches no other company's documents",
    foreign.length === 0,
    foreign.length ? `${foreign.length} leaked` : `${hrDocs.length} documents in scope`,
  );

  if (hrB) {
    const hrBDocs = await reachable(hrB, "companyId");
    const overlap = hrBDocs.filter(
      (d) => d.companyId && String(d.companyId) === String(hrA.companyId),
    );
    check("A second company's HR reaches none of the first's", overlap.length === 0);
  } else {
    check("second company present to test against", false, "only one company - test skipped");
    results.pop();
  }

  // The blind board
  const cvDocs = hrDocs.filter((d) => d.sourceType === "cv");
  const withNames = await RagDocument.find({ sourceType: "cv" }).select("content title").lean();
  const emailLike = withNames.filter((d) => /[\w.+-]+@[\w-]+\.[a-z]{2,}/i.test(d.content));
  check(
    "no CV passage contains an email address",
    emailLike.length === 0,
    emailLike.length ? `${emailLike.length} of ${withNames.length}` : `${cvDocs.length} CV docs in HR scope`,
  );

  // Candidate isolation
  const [candA, candB] = candidates;
  const candDocs = await reachable(candA, "sourceType companyId visibleToUserId publicRead");
  const privateToOthers = candDocs.filter(
    (d) => d.visibleToUserId && String(d.visibleToUserId) !== String(candA._id),
  );
  check(
    "a candidate reaches nobody else's pinned documents",
    privateToOthers.length === 0,
    privateToOthers.length ? `${privateToOthers.length} leaked` : `${candDocs.length} in scope`,
  );

  const candSeesCvs = candDocs.filter((d) => d.sourceType === "cv");
  check("a candidate reaches no CV passages at all", candSeesCvs.length === 0);

  const candSeesForeignApps = candDocs.filter(
    (d) => d.sourceType === "application" && String(d.visibleToUserId) !== String(candA._id),
  );
  check("a candidate reaches no other application's score", candSeesForeignApps.length === 0);

  if (candB) {
    const bDocs = await reachable(candB, "visibleToUserId");
    const crossed = bDocs.filter(
      (d) => d.visibleToUserId && String(d.visibleToUserId) === String(candA._id),
    );
    check("a second candidate reaches none of the first's", crossed.length === 0);
  }

  // The platform operator
  const adminDocs = await reachable(admin, "companyId sourceType visibleToUserId");
  const tenantOwned = adminDocs.filter((d) => d.companyId);
  const personal = adminDocs.filter((d) => d.visibleToUserId);
  check("superadmin reaches no tenant-owned documents", tenantOwned.length === 0);
  check(
    "superadmin reaches no individual's profile",
    personal.length === 0,
    personal.length ? `${personal.length} leaked` : `${adminDocs.length} platform documents`,
  );

  const failed = results.filter((r) => !r.passed);
  console.log(`\n${results.length - failed.length}/${results.length} checks passed.`);
  if (failed.length) process.exitCode = 1;
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => mongoose.connection.close());
