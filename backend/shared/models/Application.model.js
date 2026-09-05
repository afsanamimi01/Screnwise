import mongoose from "mongoose";

const scoreBreakdownItemSchema = new mongoose.Schema(
  {
    dimension: String,
    weight: Number,
    scored: Number,
    note: String,
  },
  { _id: false },
);

/**
 * The CV this application was screened from, when the bytes are kept.
 *
 * Self-applied candidates also have a CV on their profile; this is the copy
 * that belongs to *this* submission, which is what a recruiter should read
 * after shortlisting - a candidate may have replaced their profile CV since.
 */
const cvSchema = new mongoose.Schema(
  {
    data: Buffer,
    contentType: String,
    fileName: String,
    size: Number,
    uploadedAt: Date,
  },
  { _id: false },
);

const applicationSchema = new mongoose.Schema(
  {
    jobId: { type: mongoose.Schema.Types.ObjectId, ref: "Job", required: true },
    candidateId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    name: { type: String, required: true },
    /**
     * Empty when an HR-uploaded CV printed no address. Self-applied rows always
     * carry the account's address. Never a placeholder - the email composer
     * skips a candidate it cannot reach instead of mailing a made-up address.
     */
    email: { type: String, default: "" },
    phone: String,
    alias: String,
    source: { type: String, enum: ["self-applied", "HR-uploaded"], default: "self-applied" },
    score: { type: Number, default: 0 },
    scoreBreakdown: { type: [scoreBreakdownItemSchema], default: [] },
    matchedSkills: { type: [String], default: [] },
    missingSkills: { type: [String], default: [] },
    yearsExperience: { type: Number, default: 0 },
    currentTitle: String,
    pastTitles: { type: [String], default: [] },
    educationLevel: { type: String, default: "-" },
    needsManualReview: { type: Boolean, default: true },
    duplicateOf: { type: mongoose.Schema.Types.ObjectId, ref: "Application" },
    status: {
      type: String,
      enum: ["applied", "screened", "shortlisted", "rejected"],
      default: "applied",
    },
    appliedAt: { type: Date, default: Date.now },
    cvFileName: String,
    cv: { type: cvSchema, default: undefined },
  },
  { timestamps: false },
);

applicationSchema.set("toJSON", {
  transform: (_doc, ret) => {
    ret.id = ret._id.toString();
    ret.appliedAt = ret.appliedAt.toISOString().slice(0, 10);
    // Never let the raw bytes into JSON - the file is served by its own
    // endpoint, and only after the candidate has been shortlisted.
    delete ret.cv;
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});

export default mongoose.model("Application", applicationSchema);
