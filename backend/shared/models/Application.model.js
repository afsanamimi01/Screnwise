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

const applicationSchema = new mongoose.Schema(
  {
    jobId: { type: mongoose.Schema.Types.ObjectId, ref: "Job", required: true },
    candidateId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    name: { type: String, required: true },
    email: { type: String, required: true },
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
  },
  { timestamps: false },
);

applicationSchema.set("toJSON", {
  transform: (_doc, ret) => {
    ret.id = ret._id.toString();
    ret.appliedAt = ret.appliedAt.toISOString().slice(0, 10);
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});

export default mongoose.model("Application", applicationSchema);
