import { Router } from "express";
import * as searchHistoryController from "../controllers/searchHistory.controller.js";

const router = Router();

// POST /api/search-history – lưu từ khóa tìm kiếm (upsert)
router.post("/", searchHistoryController.saveSearch);

// GET /api/search-history?userId=xxx – lấy toàn bộ lịch sử
router.get("/", searchHistoryController.getHistory);

// DELETE /api/search-history/:id?userId=xxx – xóa 1 mục
router.delete("/:id", searchHistoryController.deleteItem);

// DELETE /api/search-history?userId=xxx – xóa toàn bộ (phải đứng trước /:id khi có query param)
// Dùng route riêng để tránh conflict với /:id
router.delete("/", searchHistoryController.clearHistory);

export default router;
