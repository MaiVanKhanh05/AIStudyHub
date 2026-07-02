import * as quizService from "../services/quiz.service.js";

/**
 * Endpoint to generate a quiz from raw text or a document ID
 * POST /api/quizzes/generate
 */
export async function generateQuiz(req, res) {
    try {
        const userId = req.userId;
        const { documentId, count = 10, text = "", sourceType = "CHAT_PROMPT" } = req.body;

        if (!userId) {
            return res.status(401).json({ error: "Bạn cần đăng nhập để tạo Quiz." });
        }

        console.log(`[Quiz Controller] Generating quiz for user ${userId}. Count: ${count}, Source: ${sourceType}, Doc: ${documentId}`);

        const result = await quizService.generateQuizFromText(
            text,
            Number(count),
            userId,
            documentId ? Number(documentId) : null,
            sourceType
        );

        return res.status(201).json(result);
    } catch (error) {
        console.error("[Quiz Controller] generateQuiz error:", error);
        return res.status(500).json({ error: error.message || "Lỗi hệ thống khi sinh Quiz câu hỏi." });
    }
}

/**
 * Endpoint to retrieve quiz metadata (lightweight, no questions)
 * GET /api/quizzes/:quizId/meta
 */
export async function getQuizMeta(req, res) {
    try {
        const userId = req.userId;
        const quizId = Number(req.params.quizId);

        if (!userId) {
            return res.status(401).json({ error: "Không tìm thấy thông tin đăng nhập." });
        }
        if (isNaN(quizId)) {
            return res.status(400).json({ error: "Mã Quiz không hợp lệ." });
        }

        const result = await quizService.getQuizMeta(quizId, userId);
        return res.json(result);
    } catch (error) {
        console.error("[Quiz Controller] getQuizMeta error:", error);
        if (error.message.includes("không tìm thấy") || error.message.includes("quyền truy cập")) {
            return res.status(404).json({ error: error.message });
        }
        return res.status(500).json({ error: "Lỗi hệ thống khi truy vấn thông tin Quiz." });
    }
}

/**
 * Endpoint to retrieve quiz details for taking the test (no correct answer, no explanation)
 * GET /api/quizzes/:quizId
 */
export async function getQuizDetails(req, res) {
    try {
        const userId = req.userId;
        const quizId = Number(req.params.quizId);

        if (!userId) {
            return res.status(401).json({ error: "Không tìm thấy thông tin đăng nhập." });
        }
        if (isNaN(quizId)) {
            return res.status(400).json({ error: "Mã Quiz không hợp lệ." });
        }

        const result = await quizService.getQuiz(quizId, userId);
        return res.json(result);
    } catch (error) {
        console.error("[Quiz Controller] getQuizDetails error:", error);
        if (error.message.includes("không tồn tại") || error.message.includes("quyền ôn tập")) {
            return res.status(403).json({ error: error.message });
        }
        return res.status(500).json({ error: "Lỗi hệ thống khi tải chi tiết câu hỏi Quiz." });
    }
}

/**
 * Endpoint to grade a quiz submission and return answer reviews
 * POST /api/quizzes/:quizId/submit
 */
export async function submitQuiz(req, res) {
    try {
        const userId = req.userId;
        const quizId = Number(req.params.quizId);
        const { answers = [], timeSpentSeconds = 0 } = req.body;

        if (!userId) {
            return res.status(401).json({ error: "Không tìm thấy thông tin đăng nhập." });
        }
        if (isNaN(quizId)) {
            return res.status(400).json({ error: "Mã Quiz không hợp lệ." });
        }

        console.log(`[Quiz Controller] Submitting quiz ${quizId} for user ${userId}. Answers count: ${answers.length}, timeSpent: ${timeSpentSeconds}s`);

        const result = await quizService.submitQuiz(quizId, userId, answers, Number(timeSpentSeconds));
        return res.json(result);
    } catch (error) {
        console.error("[Quiz Controller] submitQuiz error:", error);
        if (error.message.includes("không tìm thấy") || error.message.includes("quyền làm bài")) {
            return res.status(403).json({ error: error.message });
        }
        return res.status(500).json({ error: "Lỗi hệ thống khi nộp bài chấm điểm." });
    }
}
