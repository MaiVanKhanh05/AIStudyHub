import { Router } from "express";
import * as tagController from "../controllers/tag.controller.js";
import { authenticateToken } from "../middlewares/validation.middleware.js";

const router = Router();

// GET /api/tags/subject/:subject_code - Get all tags mapped to a specific subject code
router.get("/subject/:subject_code", authenticateToken, tagController.getSubjectTags);

// GET /api/tags/search - Search for existing tags
router.get("/search", authenticateToken, tagController.searchTags);

// POST /api/tags - Create a new tag
router.post("/", authenticateToken, tagController.createTag);

export default router;
