import { Router } from "express";
import * as authController from "../controllers/auth.controller.js";
import { validateLogin, validateRegister } from "../middlewares/validation.middleware.js";

const router = Router();

// POST /api/auth/login
router.post("/login", validateLogin, authController.login);

// POST /api/auth/register
router.post("/register", validateRegister, authController.register);

// POST /api/auth/logout
router.post("/logout", authController.logout);

// POST /api/auth/google-login
router.post("/google-login", authController.googleLogin);

// POST /api/auth/google-register
router.post("/google-register", authController.googleRegister);

// POST /api/auth/forgot-password
router.post("/forgot-password", authController.forgotPassword);

// POST /api/auth/reset-password
router.post("/reset-password", authController.resetPassword);

export default router;
