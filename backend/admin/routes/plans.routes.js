import { Router } from "express";
import { verifyToken, requireRole } from "../../shared/middleware/auth.middleware.js";
import { listPlans, updatePlan } from "../controllers/plans.controller.js";

// Public read of pricing content; super-admin-only edits.
const publicRouter = Router();
publicRouter.get("/", listPlans);

const adminRouter = Router();
adminRouter.use(verifyToken, requireRole("superadmin"));
adminRouter.get("/", listPlans);
adminRouter.patch("/:key", updatePlan);

export { publicRouter as publicPlansRoutes, adminRouter as adminPlansRoutes };
