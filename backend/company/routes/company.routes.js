import { Router } from "express";
import {
  verifyToken,
  requireRole,
  requireActivePlan,
} from "../../shared/middleware/auth.middleware.js";
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
// Reads above are open so a plan-less manager can preview the console. Writes
// below need an active plan - except `changePlan`, which is how they get one.
router.post("/hr", requireActivePlan, createHr);
router.patch("/hr/:id", requireActivePlan, updateHr);
router.patch("/plan", changePlan);

export default router;
