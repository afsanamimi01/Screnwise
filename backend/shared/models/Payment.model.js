import mongoose from "mongoose";

/**
 * One attempt to buy a plan through the payment gateway.
 *
 * A row is written *before* the customer is sent to the gateway, so an
 * abandoned or failed checkout leaves a trace rather than vanishing. The plan
 * is only activated when the gateway's own validation API confirms the
 * transaction - never on the browser redirect alone, which a customer could
 * forge by opening the success URL themselves.
 */
const paymentSchema = new mongoose.Schema(
  {
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: "Company", required: true },
    /** Who started the checkout - always the company's manager. */
    initiatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    planKey: { type: String, enum: ["basic", "advance", "custom"], required: true },

    /** Our own reference, sent to the gateway and echoed back on every callback. */
    tranId: { type: String, required: true, unique: true },
    /** Taken from the Plan record at checkout time, never from the client. */
    amount: { type: Number, required: true },
    currency: { type: String, default: "BDT" },

    status: {
      type: String,
      enum: ["pending", "paid", "failed", "cancelled", "invalid"],
      default: "pending",
    },
    /** Which gateway handled it - `manual` means no gateway was configured. */
    gateway: { type: String, default: "sslcommerz" },

    /** Gateway's own identifiers, kept for reconciliation and support. */
    valId: { type: String, default: null },
    bankTranId: { type: String, default: null },
    cardType: { type: String, default: "" },
    /** Why a payment was refused, in the gateway's words. */
    failReason: { type: String, default: "" },

    paidAt: { type: Date, default: null },
  },
  { timestamps: { createdAt: "createdAt", updatedAt: "updatedAt" } },
);

paymentSchema.set("toJSON", {
  transform: (_doc, ret) => {
    ret.id = ret._id.toString();
    ret.companyId = ret.companyId ? ret.companyId.toString() : null;
    ret.initiatedBy = ret.initiatedBy ? ret.initiatedBy.toString() : null;
    ret.createdAt = ret.createdAt?.toISOString().slice(0, 16).replace("T", " ");
    ret.paidAt = ret.paidAt ? ret.paidAt.toISOString().slice(0, 16).replace("T", " ") : null;
    delete ret._id;
    delete ret.__v;
    delete ret.updatedAt;
    return ret;
  },
});

export default mongoose.model("Payment", paymentSchema);
