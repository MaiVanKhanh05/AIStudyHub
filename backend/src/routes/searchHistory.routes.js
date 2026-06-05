import { Router } from "express";
import * as searchHistoryController from "../controllers/searchHistory.controller.js";
import { authenticateToken } from "../middlewares/validation.middleware.js";

const router = Router();

// POST   /api/search-history          — save keyword
router.post("/", authenticateToken, searchHistoryController.saveSearch);

// GET    /api/search-history?userId=  — get history (max 10 by default, pass limit=0 for all)
router.get("/", authenticateToken, searchHistoryController.getHistory);

// DELETE /api/search-history/:id      — delete one item
router.delete("/:id", authenticateToken, searchHistoryController.deleteItem);

// DELETE /api/search-history?userId=  — clear all (must come BEFORE /:id in Express)
router.delete("/", authenticateToken, searchHistoryController.clearHistory);

export default router;
