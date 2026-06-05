import * as searchHistoryRepository from "../repositories/searchHistory.repository.js";

/**
 * POST /api/search-history
 * Body: { userId, keyword }
 */
export const saveSearch = async (req, res) => {
    try {
        const { userId, keyword } = req.body;
        if (!userId || !keyword?.trim()) {
            return res.status(400).json({ error: "userId and keyword are required" });
        }
        const record = await searchHistoryRepository.saveSearchKeyword(userId, keyword);
        return res.status(201).json(record);
    } catch (error) {
        console.error("Error in saveSearch controller:", error);
        return res.status(500).json({ error: "Failed to save search history" });
    }
};

/**
 * GET /api/search-history?userId=xxx&limit=10
 */
export const getHistory = async (req, res) => {
    try {
        const { userId, limit } = req.query;
        if (!userId) {
            return res.status(400).json({ error: "userId is required" });
        }
        const parsedLimit = limit ? Number(limit) : 10;
        const history = await searchHistoryRepository.getSearchHistory(userId, parsedLimit);
        return res.json(history);
    } catch (error) {
        console.error("Error in getHistory controller:", error);
        return res.status(500).json({ error: "Failed to fetch search history" });
    }
};

/**
 * DELETE /api/search-history/:id
 */
export const deleteItem = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.query.userId || req.body?.userId;
        if (!id) {
            return res.status(400).json({ error: "search_id is required" });
        }
        // Use the authenticated userId from middleware if available
        const ownerUserId = req.userId || userId;
        if (!ownerUserId) {
            return res.status(400).json({ error: "userId is required" });
        }
        const deleted = await searchHistoryRepository.deleteSearchHistoryItem(Number(id), ownerUserId);
        if (deleted) {
            return res.json({ message: "Deleted successfully" });
        }
        return res.status(404).json({ error: "Item not found or permission denied" });
    } catch (error) {
        console.error("Error in deleteItem controller:", error);
        return res.status(500).json({ error: "Failed to delete history item" });
    }
};

/**
 * DELETE /api/search-history?userId=xxx
 */
export const clearHistory = async (req, res) => {
    try {
        const userId = req.query.userId || req.userId;
        if (!userId) {
            return res.status(400).json({ error: "userId is required" });
        }
        const count = await searchHistoryRepository.clearSearchHistory(userId);
        return res.json({ message: `Cleared ${count} items` });
    } catch (error) {
        console.error("Error in clearHistory controller:", error);
        return res.status(500).json({ error: "Failed to clear search history" });
    }
};
