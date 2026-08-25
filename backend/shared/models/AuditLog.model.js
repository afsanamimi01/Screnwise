import mongoose from "mongoose";

const auditLogSchema = new mongoose.Schema(
  {
    actor: { type: String, required: true },
    action: { type: String, required: true },
    detail: { type: String, default: "" },
    timestamp: { type: Date, default: Date.now },
  },
  { timestamps: false },
);

auditLogSchema.set("toJSON", {
  transform: (_doc, ret) => {
    ret.id = ret._id.toString();
    ret.timestamp = ret.timestamp.toISOString().slice(0, 16).replace("T", " ");
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});

export default mongoose.model("AuditLog", auditLogSchema);
