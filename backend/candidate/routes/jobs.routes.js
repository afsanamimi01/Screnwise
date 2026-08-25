import { Router } from "express";
import { getPublicJob, listPublicJobs } from "../controllers/jobs.controller.js";

const router = Router();

router.get("/", listPublicJobs);
router.get("/:id", getPublicJob);

export default router;
