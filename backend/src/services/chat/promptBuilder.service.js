/**
 * Prompt Builder Service
 * Trách nhiệm: Xây dựng Prompt tổng hợp từ Context, Retrieved Data và User Message.
 * Hàm này PHẢI LÀ Pure Function. KHÔNG QUERY DATABASE.
 */

/**
 * Xây dựng system instruction và conversation format.
 * 
 * @param {Object} context - Ngữ cảnh cuộc trò chuyện
 * @param {Object} retrievalData - Dữ liệu truy xuất (chunks, docs)
 * @param {string} message - Tin nhắn gốc của người dùng
 * @returns {string} Chuỗi prompt hệ thống hoàn chỉnh
 */
export function buildPrompt(context, retrievalData, message, sourceData) {
    let prompt = `CRITICAL SYSTEM INSTRUCTION:
Bạn là AI trợ lý học tập cao cấp của hệ thống AIStudyHub.
Bạn phải tuân thủ nghiêm ngặt các quy tắc sau:
1. KHÔNG được bịa đặt (No Hallucination) thông tin không có trong tài liệu nếu người dùng hỏi về tài liệu cụ thể.
2. Nếu người dùng chỉ yêu cầu "tìm tài liệu", KHÔNG giải thích dài dòng, chỉ tóm tắt danh sách tài liệu gợi ý.
3. Luôn trả lời ngắn gọn, thân thiện và súc tích.\n\n`;

    // Nguồn dữ liệu hiện tại (Current Source Context)
    if (sourceData) {
        prompt += `[NGỮ CẢNH NGUỒN (SOURCE CONTEXT)]\n`;
        prompt += `Loại Nguồn Hiện Tại: ${sourceData.sourceType}\n`;
        prompt += `ID Nguồn: ${sourceData.sourceId || 'Global'}\n`;
        prompt += `[HẾT NGỮ CẢNH NGUỒN]\n\n`;
    }

    // 1. Tài liệu tải lên hiện tại hoặc trước đây
    if (context.documentContextStr) {
        prompt += `[NGỮ CẢNH BỔ SUNG - TÀI LIỆU ĐANG XỬ LÝ]\n`;
        prompt += `${context.documentContextStr}\n`;
        prompt += `[HẾT NGỮ CẢNH BỔ SUNG]\n\n`;
    } else if (context.uploadedDocuments && context.uploadedDocuments.length > 0) {
        prompt += `[NGỮ CẢNH BỔ SUNG - TÀI LIỆU ĐÃ UPLOAD CŨ]\n`;
        context.uploadedDocuments.forEach(doc => {
            prompt += `--- Tên file: ${doc.name} ---\n${doc.content}\n`;
        });
        prompt += `[HẾT NGỮ CẢNH BỔ SUNG]\n\n`;
    }

    // 2. Dữ liệu truy xuất từ Retrieval Strategy Router
    if (retrievalData && retrievalData.chunks && retrievalData.chunks.length > 0) {
        prompt += `[NGỮ CẢNH CHÍNH - TRI THỨC HỆ THỐNG ĐÃ TRÍCH XUẤT (RAG EVIDENCE)]\n`;
        const ragContext = retrievalData.chunks.map(chunk => chunk.chunk_text).join("\n\n---\n\n");
        prompt += `${ragContext}\n`;
        prompt += `[HẾT TRI THỨC HỆ THỐNG]\n\n`;
    }

    // 3. Lịch sử trò chuyện
    if (context.subject || context.topic) {
        prompt += `[NGỮ CẢNH PHỤ - LỊCH SỬ TRÒ CHUYỆN]\n`;
        prompt += `- Môn học hiện tại: ${context.subject || 'Không rõ'}\n`;
        prompt += `- Chủ đề hiện tại: ${context.topic || 'Không rõ'}\n`;
        prompt += `[HẾT LỊCH SỬ TRÒ CHUYỆN]\n\n`;
    }

    // 4. Các Quy tắc Đầu ra Ràng buộc Theo Nguồn (Source-based Output Rules)
    prompt += `[QUY TẮC ĐẦU RA (STRICT OUTPUT RULES)]\n`;
    
    if (sourceData?.sourceType === "UPLOADED_DOCUMENT" || sourceData?.sourceType === "SYSTEM_DOCUMENT") {
        prompt += `- CHỈ ĐƯỢC PHÉP trả lời dựa trên [NGỮ CẢNH CHÍNH] và [NGỮ CẢNH BỔ SUNG]. KHÔNG ĐƯỢC sử dụng kiến thức bên ngoài.\n`;
        prompt += `- NẾU trong cả [NGỮ CẢNH CHÍNH] và [NGỮ CẢNH BỔ SUNG] đều KHÔNG có thông tin để trả lời câu hỏi, hãy nói rõ: "Không tìm thấy thông tin này trong tài liệu hiện tại." TUYỆT ĐỐI KHÔNG tự động suy luận (No fallback to general knowledge).\n`;
    } else {
        // GLOBAL_CHAT
        prompt += `- NẾU [NGỮ CẢNH CHÍNH] chứa đủ thông tin để trả lời, BẠN ƯU TIÊN dùng thông tin đó.\n`;
        prompt += `- NẾU [NGỮ CẢNH CHÍNH] KHÔNG CÓ thông tin, BẠN ĐƯỢC PHÉP dùng kiến thức chung (General Knowledge) để trả lời, nhưng phải báo cho người dùng biết điều này.\n`;
    }
    prompt += `- NẾU ý định là TÌM TÀI LIỆU, CHỈ trả lời đúng một câu duy nhất: "Dưới đây là các tài liệu liên quan mà tôi tìm thấy:". TUYỆT ĐỐI KHÔNG tự liệt kê danh sách tài liệu. Hệ thống sẽ tự động hiển thị thẻ tài liệu bằng giao diện trực quan bên dưới câu trả lời của bạn.\n\n`;

    prompt += `[CÂU HỎI CỦA NGƯỜI DÙNG]
${message}
`;

    return prompt;
}
