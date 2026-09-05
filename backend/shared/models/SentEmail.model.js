import mongoose from "mongoose";

/** One row per addressee, so a partial batch is auditable address by address. */
const deliverySchema = new mongoose.Schema(
  {
    email: { type: String, required: true },
    name: { type: String, default: "" },
    applicationId: { type: mongoose.Schema.Types.ObjectId, ref: "Application" },
    status: { type: String, enum: ["sent", "failed"], required: true },
    /** Provider's id for the message - the handle for tracing a delivery. */
    messageId: { type: String, default: null },
    error: { type: String, default: null },
  },
  { _id: false },
);

const sentEmailSchema = new mongoose.Schema(
  {
    jobId: { type: mongoose.Schema.Types.ObjectId, ref: "Job", required: true },
    subject: { type: String, required: true },
    body: { type: String, required: true },
    /** Addresses as typed/selected - kept flat for the existing list views. */
    recipients: { type: [String], default: [] },
    deliveries: { type: [deliverySchema], default: [] },
    template: { type: String, required: true },
    /** Which mailer driver handled it: resend, smtp, or console (not delivered). */
    driver: { type: String, default: "console" },
    status: { type: String, enum: ["sent", "partial", "failed"], default: "sent" },
    sentBy: { type: String, default: "" },
    sentAt: { type: Date, default: Date.now },
  },
  { timestamps: false },
);

sentEmailSchema.set("toJSON", {
  transform: (_doc, ret) => {
    ret.id = ret._id.toString();
    ret.sentAt = ret.sentAt.toISOString().slice(0, 16).replace("T", " ");
    ret.deliveries = (ret.deliveries ?? []).map((d) => ({
      ...d,
      applicationId: d.applicationId ? d.applicationId.toString() : null,
    }));
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});

export default mongoose.model("SentEmail", sentEmailSchema);
