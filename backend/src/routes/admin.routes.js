import { Router } from "express";
import * as adminController from "../controllers/admin.controller.js";
import { authenticateToken, requireAdmin } from "../middlewares/validation.middleware.js";

const router = Router();

// Áp dụng authenticateToken + requireAdmin cho toàn bộ admin routes
router.use(authenticateToken, requireAdmin);

// Stats dashboard 
router.get("/stats", adminController.getAdminStats);
router.get("/analytics", adminController.getAnalyticsData);
router.get("/storage-distribution", adminController.getStorageDistribution);

// Users
router.get("/users", adminController.getAllUsers);
router.post("/users/:id/lock", adminController.lockUser);
router.post("/users/:id/unlock", adminController.unlockUser);
router.post("/users/:id/approve", adminController.approveUser);

// Documents — BR-AM-07
router.get("/documents", adminController.getAllDocuments);
router.delete("/documents/:id", adminController.deleteDocument);
router.get("/popular-documents", adminController.getPopularDocuments);

// API Usage
router.get("/api-usage", adminController.getApiUsage);

import * as adminTopicController from "../controllers/adminTopic.controller.js";

// Topics Management
router.get("/topics", adminTopicController.getAdminTopics);
router.post("/topics", adminTopicController.createAdminTopic);
router.put("/topics/:id", adminTopicController.updateAdminTopic);
router.delete("/topics/:id", adminTopicController.deleteAdminTopic);
router.post("/topics/:id/subjects", adminTopicController.assignSubjectsToTopic);

export default router;
