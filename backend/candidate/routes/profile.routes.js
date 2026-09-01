import { Router } from "express";
import multer from "multer";
import { verifyToken, requireRole } from "../../shared/middleware/auth.middleware.js";
import {
  getProfile,
  updateProfile,
  uploadCv,
  getCv,
  deleteCv,
} from "../controllers/profile.controller.js";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024, files: 1 },
});

const router = Router();

router.use(verifyToken, requireRole("candidate"));

router.get("/", getProfile);
router.put("/", updateProfile);
router.post("/cv", upload.single("cv"), uploadCv);
router.get("/cv", getCv);
router.delete("/cv", deleteCv);

export default router;
