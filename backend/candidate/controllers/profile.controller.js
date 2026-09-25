import Candidate from "../../shared/models/Candidate.model.js";
import { rag } from "../../shared/rag/indexer.js";

const EDITABLE = [
  "headline",
  "location",
  "phone",
  "yearsExperience",
  "educationLevel",
  "skills",
  "summary",
  "links",
];

/** Find the caller's profile, creating an empty one on first visit. */
async function loadOrCreate(userId) {
  let profile = await Candidate.findOne({ userId });
  if (!profile) profile = await Candidate.create({ userId });
  return profile;
}

/** Profile + the name/email that live on the User record. */
function present(profile, user) {
  return { ...profile.toJSON(), name: user.name, email: user.email };
}

export async function getProfile(req, res, next) {
  try {
    // ---- Step 1: this candidate's profile, creating an empty one on first visit ----
    const profile = await loadOrCreate(req.user._id);

    // ---- Step 2: merge in the name/email that live on the User record and respond ----
    res.json(present(profile, req.user));
  } catch (err) {
    next(err);
  }
}

export async function updateProfile(req, res, next) {
  try {
    // ---- Step 1: this candidate's profile, creating an empty one on first visit ----
    const profile = await loadOrCreate(req.user._id);

    // ---- Step 2: apply every editable field present in the request body ----
    for (const key of EDITABLE) {
      if (req.body[key] === undefined) continue;
      if (key === "links") {
        profile.links = { ...profile.links.toObject?.() ?? profile.links, ...req.body.links };
      } else if (key === "skills") {
        profile.skills = (Array.isArray(req.body.skills) ? req.body.skills : [])
          .map((s) => String(s).trim())
          .filter(Boolean);
      } else {
        profile[key] = req.body[key];
      }
    }

    // ---- Step 3: the display name lives on the User record, not the profile ----
    if (typeof req.body.name === "string" && req.body.name.trim()) {
      req.user.name = req.body.name.trim();
      await req.user.save();
    }

    // ---- Step 4: save the profile ----
    await profile.save();

    // ---- Step 5: reindex for the assistant and respond ----
    // The assistant matches open roles against this profile, so a stale copy
    // recommends jobs for skills the candidate has just changed.
    rag.profile(req.user._id);
    res.json(present(profile, req.user));
  } catch (err) {
    next(err);
  }
}

const OK_TYPES = /pdf|word|officedocument|text\/plain/;

export async function uploadCv(req, res, next) {
  try {
    // ---- Step 1: a file must actually be attached ----
    if (!req.file) return res.status(400).json({ message: "Attach a CV file (field name: cv)" });

    // ---- Step 2: it must be a CV type we can screen ----
    const ext = (req.file.originalname.split(".").pop() || "").toLowerCase();
    if (!OK_TYPES.test(req.file.mimetype) && !["pdf", "docx", "txt"].includes(ext)) {
      return res.status(400).json({ message: "CV must be a PDF, DOCX or TXT file" });
    }

    // ---- Step 3: this candidate's profile, creating an empty one on first visit ----
    const profile = await loadOrCreate(req.user._id);

    // ---- Step 4: attach the file and save ----
    profile.cv = {
      data: req.file.buffer,
      contentType: req.file.mimetype || "application/octet-stream",
      fileName: req.file.originalname,
      size: req.file.size,
      uploadedAt: new Date(),
    };
    await profile.save();

    // ---- Step 5: reindex for the assistant and respond ----
    // The assistant matches open roles against this profile, so a stale copy
    // recommends jobs for skills the candidate has just changed.
    rag.profile(req.user._id);
    res.status(201).json(present(profile, req.user));
  } catch (err) {
    next(err);
  }
}

export async function getCv(req, res, next) {
  try {
    // ---- Step 1: this candidate's profile ----
    const profile = await Candidate.findOne({ userId: req.user._id });
    if (!profile?.cv?.data) return res.status(404).json({ message: "No CV on file" });

    // ---- Step 2: stream the stored file back as-is ----
    res.set("Content-Type", profile.cv.contentType || "application/octet-stream");
    res.set(
      "Content-Disposition",
      `inline; filename="${(profile.cv.fileName || "cv").replace(/"/g, "")}"`,
    );
    res.send(profile.cv.data);
  } catch (err) {
    next(err);
  }
}

export async function deleteCv(req, res, next) {
  try {
    // ---- Step 1: this candidate's profile, creating an empty one on first visit ----
    const profile = await loadOrCreate(req.user._id);

    // ---- Step 2: clear the CV and save ----
    profile.cv = undefined;
    await profile.save();

    // ---- Step 3: reindex for the assistant and respond ----
    // The assistant matches open roles against this profile, so a stale copy
    // recommends jobs for skills the candidate has just changed.
    rag.profile(req.user._id);
    res.json(present(profile, req.user));
  } catch (err) {
    next(err);
  }
}
