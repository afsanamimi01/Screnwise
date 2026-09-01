import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    role: {
      type: String,
      enum: ["hr", "manager", "candidate", "superadmin"],
      required: true,
    },
    /** Set for `manager` and `hr`; null for `candidate` and `superadmin`. */
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: "Company", default: null },
    active: { type: Boolean, default: true },
  },
  { timestamps: { createdAt: "createdAt", updatedAt: false } },
);

userSchema.set("toJSON", {
  transform: (_doc, ret) => {
    ret.id = ret._id.toString();
    ret.companyId = ret.companyId ? ret.companyId.toString() : null;
    delete ret._id;
    delete ret.__v;
    delete ret.passwordHash;
    return ret;
  },
});

export default mongoose.model("User", userSchema);
