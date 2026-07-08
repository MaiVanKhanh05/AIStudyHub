/**
 * Conversation Context Service
 * Trách nhiệm: Quản lý và trích xuất Topic, Subject, Document, và Entities từ lịch sử chat.
 */

/**
 * Trích xuất ngữ cảnh từ lịch sử và tin nhắn hiện tại.
 * 
 * @param {Array} history - Lịch sử chat trước đó (mảng các object { sender, text })
 * @param {string} currentMessage - Tin nhắn người dùng vừa gửi
 * @returns {Promise<Object>} Object chứa ngữ cảnh
 */
export async function extractContext(history, currentMessage) {
    const context = {
        topic: "",
        subject: "",
        subjectCode: "",
        documentId: null,
        documentTitle: "",
        intent: "",
        entities: [],
        visitedDocuments: [],
        uploadedDocuments: [],
        lastUserGoal: "",
        conversationState: "ACTIVE",
        confidence: 0.8
    };

    if (!history || history.length === 0) return context;

    // Quét ngược lịch sử từ tin nhắn gần nhất
    for (let i = history.length - 1; i >= 0; i--) {
        const msg = history[i];
        
        // 1. Trích xuất Uploaded Documents
        if (msg.sender === "user" && msg.files && msg.files.length > 0) {
            msg.files.forEach(f => {
                if (!context.uploadedDocuments.some(doc => doc.name === f.name)) {
                    context.uploadedDocuments.push({ name: f.name, content: f.content });
                }
            });
        }

        // 2. Tìm Topic / Subject từ các phản hồi của AI (vì AI thường nêu tên môn học khi trả lời)
        if (msg.sender === "ai") {
            const aiText = msg.text || "";
            // Heuristic đơn giản: Tìm text dạng "tài liệu môn SWT301" hoặc "Software Testing"
            const subjectMatch = aiText.match(/tài liệu (?:liên quan đến |môn )?([A-Za-z0-9\s]+?)(?: mà| tôi| được|$)/i);
            if (subjectMatch && !context.subject) {
                context.subject = subjectMatch[1].trim();
            }
        }
    }

    // Gán DocumentID nếu tìm thấy tài liệu upload (lấy file gần nhất)
    if (context.uploadedDocuments.length > 0) {
        context.documentTitle = context.uploadedDocuments[0].name;
    }

    return context;
}
