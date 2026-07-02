import { Router } from "express";
import * as flashcardController from "../controllers/flashcard.controller.js";
import { authenticateToken } from "../middlewares/validation.middleware.js";

const router = Router();

// Secure all endpoints with token authentication
router.use(authenticateToken);

// POST /api/flashcards/generate - Generate automatic flashcard sets
router.post("/generate", flashcardController.generateSet);

// GET /api/flashcards - Get all flashcard sets belonging to user
router.get("/", flashcardController.getUserSets);

// GET /api/flashcards/:setId/meta - Get light metadata
router.get("/:setId/meta", flashcardController.getSetMeta);

// GET /api/flashcards/:setId - Get full set details with card content
router.get("/:setId", flashcardController.getSetDetails);

export default router;
