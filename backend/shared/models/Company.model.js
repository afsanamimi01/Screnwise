import mongoose from "mongoose";

/**
 * A paying organisation. Every `manager` and `hr` user belongs to exactly one
 * company; `candidate` and `superadmin` users have `companyId: null`.
 *
 * Access is gated on `status` (a super admin can revoke) AND on
 * `subscriptionExpiresAt` (a lapsed subscription blocks the whole company until
 * a super admin renews it).
 */
const companySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    /** `null` until the manager picks a plan on first sign-in. */
    plan: { type: String, enum: ["basic", "advance", "custom", null], default: null },
    /** Max active `hr` users, excluding the manager. `null` = unlimited, `0` = no plan yet. */
    hrSeatLimit: { type: Number, default: 0 },
    status: { type: String, enum: ["active", "revoked"], default: "active" },
    subscriptionStartedAt: { type: Date, default: null },
    subscriptionExpiresAt: { type: Date, default: null },
  },
  { timestamps: { createdAt: "createdAt", updatedAt: false } },
);

companySchema.virtual("expired").get(function () {
  if (!this.subscriptionExpiresAt) return false;
  return this.subscriptionExpiresAt.getTime() < Date.now();
});

/** True when the company is fully provisioned: a plan is picked and current. */
companySchema.virtual("accessible").get(function () {
  return this.status === "active" && !!this.plan && !this.expired;
});

companySchema.set("toJSON", {
  virtuals: true,
  transform: (_doc, ret) => {
    ret.id = ret._id.toString();
    ret.subscriptionStartedAt = ret.subscriptionStartedAt?.toISOString().slice(0, 10);
    ret.subscriptionExpiresAt = ret.subscriptionExpiresAt?.toISOString().slice(0, 10);
    ret.createdAt = ret.createdAt?.toISOString().slice(0, 10);
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});

export default mongoose.model("Company", companySchema);
