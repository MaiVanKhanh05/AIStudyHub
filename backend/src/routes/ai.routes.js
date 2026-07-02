import { Router } from "express";
import { optionalAuthenticateToken } from "../middlewares/validation.middleware.js";
import { summarizeDocument } from "../controllers/ai.controller.js";

const router = Router();

// POST /api/ai/summarize - Summarize a document
router.post("/summarize", optionalAuthenticateToken, summarizeDocument);

export default router;
