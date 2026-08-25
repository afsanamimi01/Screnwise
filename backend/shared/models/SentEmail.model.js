import mongoose from "mongoose";

const sentEmailSchema = new mongoose.Schema(
  {
    jobId: { type: mongoose.Schema.Types.ObjectId, ref: "Job", required: true },
    subject: { type: String, required: true },
    body: { type: String, required: true },
    recipients: { type: [String], default: [] },
    template: { type: String, required: true },
    sentAt: { type: Date, default: Date.now },
  },
  { timestamps: false },
);

sentEmailSchema.set("toJSON", {
  transform: (_doc, ret) => {
    ret.id = ret._id.toString();
    ret.sentAt = ret.sentAt.toISOString().slice(0, 16).replace("T", " ");
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});

export default mongoose.model("SentEmail", sentEmailSchema);
