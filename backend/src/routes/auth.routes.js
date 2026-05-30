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

// POST /api/auth/change-password
router.post("/change-password", authController.changePassword);

// GET /api/auth/github + callback
router.get("/github", authController.githubRedirect);
router.get("/github/callback", authController.githubCallback);

// GET /api/auth/facebook + callback
router.get("/facebook", authController.facebookRedirect);
router.get("/facebook/callback", authController.facebookCallback);

// GET /api/auth/google (redirect-based) + callback
router.get("/google", authController.googleOAuthRedirect);
router.get("/google/callback", authController.googleOAuthCallback);

// POST /api/auth/verify-otp
router.post("/verify-otp", authController.verifyOtp);

// POST /api/auth/resend-otp
router.post("/resend-otp", authController.resendOtp);

export default router;
