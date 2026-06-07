import { Router } from "express";
import * as adminController from "../controllers/admin.controller.js";
import { authenticateToken, requireAdmin } from "../middlewares/validation.middleware.js";

const router = Router();

// Áp dụng authenticateToken + requireAdmin cho toàn bộ admin routes
router.use(authenticateToken, requireAdmin);

// Stats dashboard 
router.get("/stats", adminController.getAdminStats);

// Users
router.get("/users", adminController.getAllUsers);
router.post("/users/:id/lock", adminController.lockUser);
router.post("/users/:id/unlock", adminController.unlockUser);

// Documents — BR-AM-07
router.get("/documents", adminController.getAllDocuments);
router.delete("/documents/:id", adminController.deleteDocument);
router.get("/popular-documents", adminController.getPopularDocuments);

export default router;
