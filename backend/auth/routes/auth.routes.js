import { Router } from "express";
import { login, register, registerCompany } from "../controllers/auth.controller.js";

const router = Router();

router.post("/register", register);
router.post("/register-company", registerCompany);
router.post("/login", login);

export default router;
