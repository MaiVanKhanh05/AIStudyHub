import { Router } from "express";
import * as documentController from "../controllers/document.controller.js";
import { authenticateToken } from "../middlewares/validation.middleware.js";

const router = Router();

// GET /api/documents/dashboard
router.get("/dashboard", authenticateToken, documentController.getDashboard);

// POST /api/documents/upload
router.post("/upload", authenticateToken, documentController.createNewDoc);

// DELETE /api/documents/:id
router.delete("/:id", authenticateToken, documentController.deleteDoc);

export default router;
