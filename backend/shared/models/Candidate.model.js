import mongoose from "mongoose";

/**
 * A candidate's own profile: the details they maintain once, plus a single
 * stored CV (bytes live in Mongo so there is nothing else to provision).
 * One row per candidate `User`. Created lazily the first time the profile is
 * opened.
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

const candidateSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, unique: true },
    headline: { type: String, default: "" },
    location: { type: String, default: "" },
    phone: { type: String, default: "" },
    yearsExperience: { type: Number, default: 0 },
    educationLevel: { type: String, default: "" },
    skills: { type: [String], default: [] },
    summary: { type: String, default: "" },
    links: {
      portfolio: { type: String, default: "" },
      linkedin: { type: String, default: "" },
      github: { type: String, default: "" },
    },
    cv: { type: cvSchema, default: undefined },
  },
  { timestamps: true },
);

/** Never send the raw CV bytes in JSON - expose a small descriptor instead. */
candidateSchema.set("toJSON", {
  transform: (_doc, ret) => {
    ret.id = ret._id.toString();
    ret.userId = ret.userId ? ret.userId.toString() : null;
    ret.cv =
      ret.cv && ret.cv.data
        ? {
            fileName: ret.cv.fileName,
            size: ret.cv.size,
            contentType: ret.cv.contentType,
            uploadedAt: ret.cv.uploadedAt,
          }
        : null;
    delete ret._id;
    delete ret.__v;
    delete ret.createdAt;
    delete ret.updatedAt;
    return ret;
  },
});

export default mongoose.model("Candidate", candidateSchema);
