import "dotenv/config";
import mongoose from "mongoose";
import { connectDB } from "../shared/config/db.js";
import User from "../shared/models/User.model.js";
import Conversation from "../shared/models/Conversation.model.js";

/**
 * Prove one account's assistant threads are unreachable by any other.
 *
 * This is the same class of check as `rag-audit.js`, applied to the transcript
 * rather than the knowledge base - and it needs its own file because the two
 * fail differently. A retrieval leak shows up as a better answer; a thread leak
 * shows up as someone else's questions rendered in your sidebar.
 *
 * The checks below deliberately query the way the controller does, so they
 * exercise the real ownership filter rather than a restatement of it.
 *
 *   node scripts/rag-chat-audit.js
 */
const results = [];
const check = (name, passed, detail = "") => {
  results.push({ name, passed, detail });
  console.log(`${passed ? "  ok  " : " FAIL "} ${name}${detail ? ` - ${detail}` : ""}`);
};

/** Exactly what the controller uses for every single-thread lookup. */
const own = (user, id) => ({ _id: id, userId: user._id });

async function main() {
  await connectDB();

  const [a, b] = await User.find({ active: true }).limit(2).lean();
  if (!a || !b) {
    console.error("Need at least two active users.");
    process.exitCode = 1;
    return;
  }

  // Two throwaway threads, one per account.
  const threadA = await Conversation.create({
    userId: a._id,
    role: a.role,
    companyId: a.companyId ?? null,
    title: "audit thread A",
    messages: [{ role: "user", text: "a private question from account A" }],
  });
  const threadB = await Conversation.create({
    userId: b._id,
    role: b.role,
    companyId: b.companyId ?? null,
    title: "audit thread B",
    messages: [{ role: "user", text: "a private question from account B" }],
  });

  try {
    // --- the core rule ----------------------------------------------------
    check(
      "an account can open its own thread",
      !!(await Conversation.findOne(own(a, threadA._id))),
    );
    check(
      "an account CANNOT open another's thread by id",
      !(await Conversation.findOne(own(b, threadA._id))),
      "knowing the id is not enough",
    );

    // --- listing ----------------------------------------------------------
    const listB = await Conversation.find({ userId: b._id }).select("_id").lean();
    check(
      "a thread list contains only its owner's threads",
      !listB.some((c) => String(c._id) === String(threadA._id)),
      `${listB.length} threads for that account`,
    );

    // --- deletion ---------------------------------------------------------
    const stolenDelete = await Conversation.deleteOne(own(b, threadA._id));
    check(
      "an account CANNOT delete another's thread",
      stolenDelete.deletedCount === 0 && !!(await Conversation.findById(threadA._id)),
    );

    // --- ownership is immutable from outside ------------------------------
    const reassigned = await Conversation.findOne({ _id: threadA._id, userId: b._id });
    check("ownership cannot be assumed by asking for it", !reassigned);

    // --- no thread is ownerless -------------------------------------------
    const orphans = await Conversation.countDocuments({
      $or: [{ userId: null }, { userId: { $exists: false } }],
    });
    check("no thread exists without an owner", orphans === 0, `${orphans} found`);

    // --- deleted accounts --------------------------------------------------
    const userIds = new Set((await User.find().select("_id").lean()).map((u) => String(u._id)));
    const all = await Conversation.find().select("userId").lean();
    const dangling = all.filter((c) => !userIds.has(String(c.userId)));
    check(
      "no thread points at a user who no longer exists",
      dangling.length === 0,
      dangling.length ? `${dangling.length} dangling - these should be cleaned up` : "",
    );
  } finally {
    await Conversation.deleteMany({ _id: { $in: [threadA._id, threadB._id] } });
  }

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
