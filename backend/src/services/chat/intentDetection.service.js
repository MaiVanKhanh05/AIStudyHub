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
    
    // 1. Nhận diện các lệnh Generate
    if (lowerMsg.includes("flashcard") || lowerMsg.includes("thẻ ghi nhớ")) {
        return { intent: "GENERATE_FLASHCARD", confidence: 0.95 };
    }
    if (lowerMsg.includes("quiz") || lowerMsg.includes("trắc nghiệm") || lowerMsg.includes("bài tập")) {
        return { intent: "GENERATE_QUIZ", confidence: 0.95 };
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
