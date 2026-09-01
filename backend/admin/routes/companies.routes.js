import { Router } from "express";
import { verifyToken, requireRole } from "../../shared/middleware/auth.middleware.js";
import { listCompanies, updateCompanyAccess } from "../controllers/companies.controller.js";

const router = Router();

router.use(verifyToken, requireRole("superadmin"));

router.get("/", listCompanies);
router.patch("/:id", updateCompanyAccess);

export default router;
