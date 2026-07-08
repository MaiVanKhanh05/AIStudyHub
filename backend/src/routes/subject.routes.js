import { Router } from "express";
import * as subjectController from "../controllers/subject.controller.js";
import { authenticateToken } from "../middlewares/validation.middleware.js";

const router = Router();

// GET /api/subjects/doc-counts - public, no auth required
router.get("/doc-counts", subjectController.getSubjectsWithDocCounts);

// GET /api/subjects - Get all subjects or search by query
router.get("/", authenticateToken, subjectController.getSubjects);

// POST /api/subjects - Create a new subject (Admin only)
import { requireAdmin } from "../middlewares/validation.middleware.js";
router.post("/", authenticateToken, requireAdmin, subjectController.createSubject);

export default router;
