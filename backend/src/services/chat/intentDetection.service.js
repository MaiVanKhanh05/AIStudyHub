/**
 * Intent Detection Service
 * Trách nhiệm: Xác định ý định người dùng (Intent) và độ tự tin (Confidence).
 */

/**
 * Phân tích ý định từ tin nhắn dựa trên ngữ cảnh hiện tại.
 * Ưu tiên: Rule-based -> Statistical NLP -> LLM (Fallback)
 * 
 * @param {Object} context - Ngữ cảnh cuộc trò chuyện (từ ConversationContext Service)
 * @param {string} message - Tin nhắn hiện tại của người dùng
 * @returns {Promise<Object>} Object chứa ý định và độ tự tin
 */
export async function detectIntent(context, message) {
    const lowerMsg = message.toLowerCase();

    // 1. Nhận diện lệnh tạo Flashcard
    const hasFlashcardKeyword =
        lowerMsg.includes("flashcard") ||
        lowerMsg.includes("flash card") ||
        lowerMsg.includes("flashard") ||
        lowerMsg.includes("flash ard") ||
        lowerMsg.includes("thẻ ghi nhớ") ||
        lowerMsg.includes("thẻ ôn tập") ||
        lowerMsg.includes("the ghi nho") ||
        lowerMsg.includes("study card") ||
        lowerMsg.includes("revision card");

    const isDefinitionQuestion =
        (lowerMsg.includes("là gì") || lowerMsg.includes("what is")) &&
        !lowerMsg.includes("tạo") &&
        !lowerMsg.includes("tao ") &&
        !lowerMsg.includes("làm") &&
        !lowerMsg.includes("sinh") &&
        !lowerMsg.includes("create") &&
        !lowerMsg.includes("generate") &&
        !lowerMsg.includes("make");

    if (hasFlashcardKeyword && !isDefinitionQuestion) {
        return { intent: "GENERATE_FLASHCARD", confidence: 0.95 };
    }

    // 1b. Nhận diện lệnh tạo Quiz / Trắc nghiệm
    const hasQuizKeyword =
        lowerMsg.includes("quiz") ||
        lowerMsg.includes("quizz") ||
        lowerMsg.includes("trắc nghiệm") ||
        lowerMsg.includes("trac nghiem") ||
        lowerMsg.includes("kiểm tra kiến thức") ||
        lowerMsg.includes("test my knowledge") ||
        lowerMsg.includes("câu hỏi ôn tập") ||
        lowerMsg.includes("bài tập trắc nghiệm");

    const isExplanationQuery =
        (lowerMsg.includes("giải thích") ||
            lowerMsg.includes("tại sao") ||
            lowerMsg.includes("vì sao") ||
            lowerMsg.includes("sửa") ||
            lowerMsg.includes("chữa")) &&
        (lowerMsg.includes("câu") || lowerMsg.includes("question") || lowerMsg.includes("đáp án"));

    if (hasQuizKeyword && !isExplanationQuery && !isDefinitionQuestion) {
        return { intent: "GENERATE_QUIZ", confidence: 0.95 };
    }

    // 1.5. Nhận diện lệnh tóm tắt
    if (lowerMsg.includes("tóm tắt") || lowerMsg.includes("summarize") || lowerMsg.includes("rút gọn")) {
        return { intent: "SUMMARIZE_DOCUMENT", confidence: 0.90 };
    }

    // 2. Nhận diện lệnh Tìm kiếm tài liệu
    if (lowerMsg.startsWith("tìm tài liệu") || lowerMsg.startsWith("cho xin tài liệu") || lowerMsg.includes("tài liệu môn") || lowerMsg.startsWith("tìm file") || lowerMsg.startsWith("tìm đề")) {
        return { intent: "SEARCH_DOCUMENT", confidence: 0.90 };
    }

    // 3. Nhận diện hỏi về tài liệu hiện tại (nếu có context.uploadedDocuments hoặc đang bàn luận về tài liệu)
    if ((lowerMsg.includes("tài liệu này") || lowerMsg.includes("file này")) && context.uploadedDocuments.length > 0) {
        return { intent: "ASK_DOCUMENT", confidence: 0.85 };
    }

    // 4. Follow-up câu hỏi (nếu có context topic và câu hỏi ngắn dùng đại từ)
    if (context.subject && (lowerMsg.includes("nó là gì") || lowerMsg.includes("ví dụ") || lowerMsg.length < 20)) {
        return { intent: "FOLLOW_UP", confidence: 0.80 };
    }

    // Mặc định là General Chat (hỏi đáp kiến thức chung hoặc QA trên Vector DB)
    return {
        intent: "ASK_GENERAL", 
        confidence: 0.70
    };
}
