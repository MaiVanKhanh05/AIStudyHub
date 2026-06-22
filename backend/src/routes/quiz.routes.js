import { Router } from "express";
import * as quizController from "../controllers/quiz.controller.js";
import { authenticateToken } from "../middlewares/validation.middleware.js";

const router = Router();

// Apply authenticateToken on all endpoints to verify req.userId
router.use(authenticateToken);

// POST /api/quizzes/generate - Create a new quiz from content context
router.post("/generate", quizController.generateQuiz);

// GET /api/quizzes/:quizId/meta - Fetch light metadata of a quiz for rendering card
router.get("/:quizId/meta", quizController.getQuizMeta);

// GET /api/quizzes/:quizId - Fetch quiz questions securely (no correct answers)
router.get("/:quizId", quizController.getQuizDetails);

// POST /api/quizzes/:quizId/submit - Grade quiz submission and save history
router.post("/:quizId/submit", quizController.submitQuiz);

export default router;
