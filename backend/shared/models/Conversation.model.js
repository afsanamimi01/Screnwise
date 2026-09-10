import mongoose from "mongoose";

/**
 * One person's thread with the assistant.
 *
 * A conversation belongs to exactly one account and is never shared. `userId`
 * is not a convenience for lookups - it is the ownership record, and every
 * query in the controller filters on it rather than fetching by `_id` and
 * checking afterwards. A thread is not "found but forbidden"; for anyone else
 * it does not exist.
 *
 * The transcript lives here rather than in the browser so it survives a
 * refresh, a new tab and a different device. That is a deliberate change of
 * posture: a recruiter's questions can name what a candidate's CV says, so
 * these rows are candidate-adjacent data and belong under the same retention
 * thinking as the applications themselves.
 */
const messageSchema = new mongoose.Schema(
  {
    role: { type: String, enum: ["user", "assistant"], required: true },
    text: { type: String, required: true },
    /** Which lookups produced an answer - kept so a reply can be traced later. */
    toolsUsed: { type: [String], default: [] },
    /** An error shown in the thread (rate limit, model unavailable). */
    failed: { type: Boolean, default: false },
    at: { type: Date, default: Date.now },
  },
  { _id: false },
);

const conversationSchema = new mongoose.Schema(
  {
    /** The owner. The whole security model of this collection. */
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    /**
     * The actor this thread was held as, recorded at creation.
     *
     * It is stored rather than read live from the user because what the
     * assistant was allowed to say is a property of the moment: an HR user
     * promoted to manager should not find their old threads relabelled, and a
     * thread's answers were scoped by the role held when they were given.
     */
    role: { type: String, required: true },
    /** Tenant context at the time, for the same reason. Null for candidates. */
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: "Company", default: null },

    /** Taken from the opening question - a thread list needs something to read. */
    title: { type: String, default: "New conversation" },
    messages: { type: [messageSchema], default: [] },
    /** Denormalised so the thread list sorts without touching the messages. */
    lastMessageAt: { type: Date, default: Date.now },
  },
  { timestamps: true },
);

// The shape of every list query: this user's threads, newest first.
conversationSchema.index({ userId: 1, lastMessageAt: -1 });

conversationSchema.set("toJSON", {
  transform: (_doc, ret) => {
    ret.id = ret._id.toString();
    ret.userId = ret.userId ? ret.userId.toString() : null;
    ret.companyId = ret.companyId ? ret.companyId.toString() : null;
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});

export default mongoose.model("Conversation", conversationSchema);
