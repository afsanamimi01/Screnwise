import { Router } from "express";
import { verifyToken, requireRole } from "../../shared/middleware/auth.middleware.js";
import {
  changePlan,
  createHr,
  getMyCompany,
  listHr,
  updateHr,
} from "../controllers/company.controller.js";

const router = Router();

router.use(verifyToken, requireRole("manager"));

router.get("/", getMyCompany);
router.get("/hr", listHr);
router.post("/hr", createHr);
router.patch("/hr/:id", updateHr);
router.patch("/plan", changePlan);

export default router;
