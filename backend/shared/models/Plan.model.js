import mongoose from "mongoose";

const featureSchema = new mongoose.Schema(
  { label: { type: String, required: true }, included: { type: Boolean, default: true } },
  { _id: false },
);

/**
 * Editable pricing-card content. Read by the public `/api/plans` endpoint that
 * feeds the marketing pricing page; edited by a super admin. `key` also drives
 * company provisioning (seat limit) at signup / plan change.
 */
const planSchema = new mongoose.Schema(
  {
    key: { type: String, enum: ["basic", "advance", "custom"], required: true, unique: true },
    name: { type: String, required: true },
    tagline: { type: String, default: "" },
    price: { type: String, default: "" },
    period: { type: String, default: "" },
    cta: { type: String, default: "Get started" },
    featured: { type: Boolean, default: false },
    /** `null` = unlimited HR seats. */
    hrSeatLimit: { type: Number, default: null },
    features: { type: [featureSchema], default: [] },
    order: { type: Number, default: 0 },
  },
  { timestamps: true },
);

planSchema.set("toJSON", {
  transform: (_doc, ret) => {
    ret.id = ret._id.toString();
    delete ret._id;
    delete ret.__v;
    delete ret.createdAt;
    delete ret.updatedAt;
    return ret;
  },
});

export default mongoose.model("Plan", planSchema);
