import { Router } from "express";
import * as documentController from "../controllers/document.controller.js";

const router = Router();

// GET /api/documents/dashboard
router.get("/dashboard", documentController.getDashboard);

// POST /api/documents/upload
router.post("/upload", documentController.createNewDoc);

// DELETE /api/documents/:id
router.delete("/:id", documentController.deleteDoc);

export default router;
