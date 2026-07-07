/**
 * Query Rewrite Service
 * Trách nhiệm: Viết lại câu hỏi mập mờ thành câu hỏi đầy đủ ngữ nghĩa dựa trên ngữ cảnh.
 */

/**
 * Viết lại câu hỏi của người dùng.
 * 
 * @param {Object} context - Ngữ cảnh cuộc trò chuyện
 * @param {string} message - Tin nhắn hiện tại của người dùng
 * @returns {Promise<string>} Câu hỏi đã được viết lại (hoặc câu hỏi gốc nếu không cần)
 */
export async function rewriteQuery(context, message) {
    const lowerMsg = message.toLowerCase();
    
    // Nếu tin nhắn quá ngắn hoặc chứa đại từ, ta chèn context vào
    const hasPronouns = lowerMsg.includes("nó") || lowerMsg.includes("cái này") || lowerMsg.includes("đó");
    const isShort = message.length < 20;

    if ((hasPronouns || isShort) && context.subject) {
        // Tránh trùng lặp nếu user đã gõ tên môn
        if (!lowerMsg.includes(context.subject.toLowerCase())) {
            // Thay thế đại từ hoặc nối thêm vào cuối
            if (hasPronouns) {
                return message.replace(/(nó|cái này|đó)/gi, `môn ${context.subject}`);
            } else {
                return `${message} (trong ngữ cảnh ${context.subject})`;
            }
        }
    }

    return message;
}
