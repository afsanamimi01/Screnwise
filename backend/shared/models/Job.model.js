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
    // Only the title is mandatory - a screening batch is defined by its skills,
    // hard filters and weights, not by department / location / employment type.
    department: { type: String, default: "" },
    location: { type: String, default: "" },
    employmentType: { type: String, default: "Full-time" },
    description: { type: String, default: "" },
    requiredSkills: { type: [String], default: [] },
    niceToHaveSkills: { type: [String], default: [] },
    minYears: { type: Number, default: 0 },
    educationLevel: { type: String, default: "Any" },
    certifications: { type: [String], default: [] },
    hardFilters: { type: hardFiltersSchema, default: () => ({}) },
    weights: { type: weightsSchema, default: () => ({}) },
    publicApplyEnabled: { type: Boolean, default: false },
    status: { type: String, enum: ["open", "closed"], default: "open" },
    /**
     * "job"       - a real posting on the platform (public board, dashboard).
     * "screening" - an internal batch: CVs sourced elsewhere, scored against a
     *               role that never appears on the public board or dashboard.
     */
    kind: { type: String, enum: ["job", "screening"], default: "job" },
    /** Owning organisation - every member of this company can see and manage it. */
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: "Company", required: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    newSinceLastVisit: { type: Number, default: 0 },
  },
  { timestamps: { createdAt: "createdAt", updatedAt: false } },
);

jobSchema.set("toJSON", {
  transform: (_doc, ret) => {
    ret.id = ret._id.toString();
    ret.createdAt = ret.createdAt.toISOString().slice(0, 10);
    ret.companyId = ret.companyId ? ret.companyId.toString() : null;
    ret.createdBy = ret.createdBy ? ret.createdBy.toString() : null;
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});

export default mongoose.model("Job", jobSchema);
