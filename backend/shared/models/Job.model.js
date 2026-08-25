import mongoose from "mongoose";

const hardFiltersSchema = new mongoose.Schema(
  {
    workPermitRequired: { type: Boolean, default: false },
    minYears: { type: Number, default: 0 },
    mustHaveSkills: { type: [String], default: [] },
  },
  { _id: false },
);

const weightsSchema = new mongoose.Schema(
  {
    skills: { type: Number, default: 40 },
    experience: { type: Number, default: 25 },
    education: { type: Number, default: 15 },
    certifications: { type: Number, default: 10 },
    keywords: { type: Number, default: 10 },
  },
  { _id: false },
);

const jobSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    department: { type: String, required: true },
    location: { type: String, required: true },
    employmentType: { type: String, required: true },
    description: { type: String, required: true },
    requiredSkills: { type: [String], default: [] },
    niceToHaveSkills: { type: [String], default: [] },
    minYears: { type: Number, default: 0 },
    educationLevel: { type: String, default: "Any" },
    certifications: { type: [String], default: [] },
    hardFilters: { type: hardFiltersSchema, default: () => ({}) },
    weights: { type: weightsSchema, default: () => ({}) },
    publicApplyEnabled: { type: Boolean, default: false },
    status: { type: String, enum: ["open", "closed"], default: "open" },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    managerIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    newSinceLastVisit: { type: Number, default: 0 },
  },
  { timestamps: { createdAt: "createdAt", updatedAt: false } },
);

jobSchema.set("toJSON", {
  transform: (_doc, ret) => {
    ret.id = ret._id.toString();
    ret.createdAt = ret.createdAt.toISOString().slice(0, 10);
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});

export default mongoose.model("Job", jobSchema);
