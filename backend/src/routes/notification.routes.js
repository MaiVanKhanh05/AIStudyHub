import { Router } from "express";
import * as notificationController from "../controllers/notification.controller.js";
import { authenticateToken } from "../middlewares/validation.middleware.js";

const router = Router();

// Retrieve all notifications for the current authenticated user
router.get("/", authenticateToken, notificationController.getNotifications);

// Mark all notifications as read
router.put("/read-all", authenticateToken, notificationController.markAllAsRead);

// Mark a specific notification as read
router.put("/:id/read", authenticateToken, notificationController.markAsRead);

// Approve a document access request
router.post("/:id/approve", authenticateToken, notificationController.approveAccess);

// Deny a document access request
router.post("/:id/deny", authenticateToken, notificationController.denyAccess);

// Send an access request for a document
router.post("/request-access/:id", authenticateToken, notificationController.requestAccess);

export default router;
