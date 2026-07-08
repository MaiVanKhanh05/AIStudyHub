/**
 * Response Planning Service
 * Trách nhiệm: Xử lý kết quả từ LLM, quyết định citation strategy và format.
 */

/**
 * Xây dựng format và kế hoạch phản hồi cuối cùng.
 * 
 * @param {string} llmResponse - Câu trả lời thô từ LLM
 * @param {Object} context - Ngữ cảnh cuộc trò chuyện
 * @param {Object} retrievalData - Dữ liệu truy xuất
 * @returns {Object} Phản hồi hoàn chỉnh gửi về Client
 */
export function planResponse(llmResponse, context, retrievalData, sourceData) {
    const finalResponse = {
        text: llmResponse,
        citations: [],
        suggestedDocs: [],
        action: "REPLY", // REPLY, CLARIFY, RECOMMEND
        confidence: 0.9
    };

    // 1. Citation Strategy
    // Nếu LLM có dùng RAG, chúng ta attach danh sách các file gốc làm nguồn trích dẫn
    if (retrievalData && retrievalData.sources && retrievalData.sources.length > 0) {
        finalResponse.citations = retrievalData.sources;
    }

    // 2. Recommend Documents
    // TUYỆT ĐỐI KHÔNG tự ý gợi ý tài liệu nếu người dùng không yêu cầu tìm kiếm.
    if (context.intent === "SEARCH_DOCUMENT" && retrievalData && retrievalData.documents && retrievalData.documents.length > 0) {
        // Loại bỏ các tài liệu tạm (temp-doc) khỏi danh sách gợi ý
        const validDocs = retrievalData.documents.filter(d => d.document_id && !String(d.document_id).startsWith("temp-doc"));
        if (validDocs.length > 0) {
            finalResponse.suggestedDocs = validDocs;
            finalResponse.action = "RECOMMEND";
            finalResponse.text = "Dưới đây là các tài liệu liên quan mà tôi tìm thấy:";
        }
    }

    // 3. Clarification & Fallback Logic
    // Nếu context quá kém và LLM trả lời không tìm thấy
    if (llmResponse.includes("không có thông tin") || llmResponse.includes("Không tìm thấy") || llmResponse.includes("không tìm thấy")) {
        finalResponse.action = "CLARIFY";
        finalResponse.confidence = 0.4;

        if (sourceData && (sourceData.sourceType === "UPLOADED_DOCUMENT" || sourceData.sourceType === "SYSTEM_DOCUMENT")) {
            // Đề xuất người dùng đổi sang Global Chat nếu cần
            finalResponse.text += "\n\n(💡 Gợi ý: Thông tin này không có trong tài liệu hiện tại. Bạn có muốn tìm kiếm trong Toàn bộ kho tài liệu (Global Chat) không?)";
        }
    }

    return finalResponse;
}
