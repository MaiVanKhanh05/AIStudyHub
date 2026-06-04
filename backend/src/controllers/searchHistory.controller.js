import * as searchHistoryService from "../services/searchHistory.service.js";

// POST /api/search-history
// Body: { userId, keyword }
export const saveSearch = async (req, res) => {
    try {
        const { userId, keyword } = req.body;
        if (!userId || !keyword || !keyword.trim()) {
            return res.status(400).json({ error: "Missing userId or keyword" });
        }
        const result = await searchHistoryService.saveSearch(userId, keyword.trim());
        res.status(201).json(result);
    } catch (error) {
        console.error("Error in saveSearch controller:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
};

// GET /api/search-history?userId=xxx
export const getHistory = async (req, res) => {
    try {
        const { userId } = req.query;
        if (!userId) {
            return res.status(400).json({ error: "Missing userId query parameter" });
        }
        const history = await searchHistoryService.getHistory(userId);
        res.json(history);
    } catch (error) {
        console.error("Error in getHistory controller:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
};

// DELETE /api/search-history/:id?userId=xxx  (xóa 1 mục)
export const deleteItem = async (req, res) => {
    try {
        const { id } = req.params;
        const { userId } = req.query;
        if (!id || !userId) {
            return res.status(400).json({ error: "Missing id or userId" });
        }
        const deleted = await searchHistoryService.deleteItem(id, userId);
        if (deleted) {
            res.json({ success: true, message: "Search history item deleted" });
        } else {
            res.status(404).json({ error: "Item not found or unauthorized" });
        }
    } catch (error) {
        console.error("Error in deleteItem controller:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
};

// DELETE /api/search-history?userId=xxx  (xóa toàn bộ)
export const clearHistory = async (req, res) => {
    try {
        const { userId } = req.query;
        if (!userId) {
            return res.status(400).json({ error: "Missing userId query parameter" });
        }
        const count = await searchHistoryService.clearAll(userId);
        res.json({ success: true, deletedCount: count });
    } catch (error) {
        console.error("Error in clearHistory controller:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
};
