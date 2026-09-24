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
    /** What the card shows, e.g. "৳5,000". Free text - a super admin edits it. */
    price: { type: String, default: "" },
    /**
     * What the gateway actually charges, in the smallest sensible unit of
     * `currency` (taka, not poisha). The display string is not parsed for this:
     * money that reaches a payment gateway should never come from free text.
     * `0` means the plan cannot be bought online (the Custom plan is a
     * conversation, not a checkout).
     */
    amount: { type: Number, default: 0 },
    currency: { type: String, default: "BDT" },
    period: { type: String, default: "" },
    cta: { type: String, default: "Get started" },
    featured: { type: Boolean, default: false },
    /** `null` = unlimited HR seats. */
    hrSeatLimit: { type: Number, default: null },
    /** `null` = unlimited CV screenings per calendar month. */
    cvScreeningLimit: { type: Number, default: null },
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
