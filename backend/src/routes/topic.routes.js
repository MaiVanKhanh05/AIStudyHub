import { Router } from "express";
import * as topicController from "../controllers/topic.controller.js";
import { authenticateToken } from "../middlewares/validation.middleware.js";

const router = Router();

// GET /api/topics — public (with AI auto-generation & 24h cache)
router.get("/", topicController.getTopics);

// POST /api/topics/regenerate — force AI regenerate (authenticated)
router.post("/regenerate", authenticateToken, topicController.regenerateTopics);

export default router;
