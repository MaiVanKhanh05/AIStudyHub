import * as flashcardService from "../services/flashcard.service.js";

/**
 * Endpoint to generate a Flashcard Set from document
 * POST /api/flashcards/generate
 */
export async function generateSet(req, res) {
    try {
        const userId = req.userId;
        const { documentId, prompt = "" } = req.body;

        if (!userId) {
            return res.status(401).json({ error: "Bạn cần đăng nhập để tạo thẻ ghi nhớ." });
        }
        if (!documentId) {
            return res.status(400).json({ error: "Thiếu mã tài liệu documentId để sinh thẻ." });
        }

        console.log(`[Flashcard Controller] Generating flashcards for user ${userId}. Doc: ${documentId}, Prompt: ${prompt}`);

        const result = await flashcardService.generateFlashcardSet(
            Number(documentId),
            prompt,
            userId
        );

        return res.status(201).json(result);
    } catch (error) {
        console.error("[Flashcard Controller] generateSet error:", error);
        return res.status(500).json({ error: error.message || "Lỗi hệ thống khi sinh bộ thẻ ghi nhớ." });
    }
}

/**
 * Endpoint to retrieve Flashcard Set metadata
 * GET /api/flashcards/:setId/meta
 */
export async function getSetMeta(req, res) {
    try {
        const userId = req.userId;
        const setId = Number(req.params.setId);

        if (!userId) {
            return res.status(401).json({ error: "Không tìm thấy thông tin đăng nhập." });
        }
        if (isNaN(setId)) {
            return res.status(400).json({ error: "Mã bộ thẻ ghi nhớ không hợp lệ." });
        }

        const result = await flashcardService.getFlashcardSetMeta(setId, userId);
        return res.json(result);
    } catch (error) {
        console.error("[Flashcard Controller] getSetMeta error:", error);
        if (error.message.includes("Không tìm thấy") || error.message.includes("quyền truy cập")) {
            return res.status(404).json({ error: error.message });
        }
        return res.status(500).json({ error: "Lỗi hệ thống khi tải metadata của bộ thẻ." });
    }
}

/**
 * Endpoint to retrieve full details of a Flashcard Set with all active cards
 * GET /api/flashcards/:setId
 */
export async function getSetDetails(req, res) {
    try {
        const userId = req.userId;
        const setId = Number(req.params.setId);

        if (!userId) {
            return res.status(401).json({ error: "Không tìm thấy thông tin đăng nhập." });
        }
        if (isNaN(setId)) {
            return res.status(400).json({ error: "Mã bộ thẻ ghi nhớ không hợp lệ." });
        }

        const result = await flashcardService.getFlashcardSetDetails(setId, userId);
        return res.json(result);
    } catch (error) {
        console.error("[Flashcard Controller] getSetDetails error:", error);
        if (error.message.includes("Không tìm thấy") || error.message.includes("quyền truy cập")) {
            return res.status(404).json({ error: error.message });
        }
        return res.status(500).json({ error: "Lỗi hệ thống khi tải chi tiết bộ thẻ." });
    }
}

/**
 * Endpoint to retrieve all flashcard sets belonging to the user
 * GET /api/flashcards
 */
export async function getUserSets(req, res) {
    try {
        const userId = req.userId;

        if (!userId) {
            return res.status(401).json({ error: "Không tìm thấy thông tin đăng nhập." });
        }

        const result = await flashcardService.getUserFlashcardSets(userId);
        return res.json(result);
    } catch (error) {
        console.error("[Flashcard Controller] getUserSets error:", error);
        return res.status(500).json({ error: "Lỗi hệ thống khi tải danh sách bộ thẻ ghi nhớ." });
    }
}
