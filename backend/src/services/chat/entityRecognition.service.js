/**
 * Entity Recognition Service
 * Trách nhiệm: Nhận diện và phân giải các thực thể (môn học, khái niệm, công nghệ).
 */

/**
 * Phân tích và trích xuất thực thể từ tin nhắn.
 * 
 * @param {Object} context - Ngữ cảnh cuộc trò chuyện
 * @param {string} message - Tin nhắn hiện tại của người dùng
 * @returns {Promise<Array<string>>} Mảng các thực thể nhận diện được
 */
export async function recognizeEntities(context, message) {
    const entities = [];
    const lowerMsg = message.toLowerCase();

    // 1. Tìm mã môn học (Thường là 3 chữ + số, ví dụ SWT301, PRJ301)
    const subjectCodeMatch = message.match(/[a-zA-Z]{3,4}\d{3}/g);
    if (subjectCodeMatch) {
        entities.push(...subjectCodeMatch.map(code => code.toUpperCase()));
    }

    // 2. Các thực thể CNTT phổ biến (Heuristic - Dùng danh sách để khớp)
    const commonEntities = ['react', 'java', 'python', 'javascript', 'docker', 'jwt', 'api', 'database', 'sql', 'nosql', 'html', 'css', 'white box', 'black box', 'testing', 'c++', 'c#'];
    commonEntities.forEach(entity => {
        if (lowerMsg.includes(entity) && !entities.some(e => e.toLowerCase() === entity)) {
            // Capitalize first letter or keep specific casing
            entities.push(entity.charAt(0).toUpperCase() + entity.slice(1));
        }
    });

    // 3. Fallback: Nếu không có mã môn và không có common entity, trích xuất các cụm từ trong nháy kép
    const quotesMatch = message.match(/"([^"]+)"/g);
    if (quotesMatch) {
        entities.push(...quotesMatch.map(q => q.replace(/"/g, '')));
    }

    return [...new Set(entities)]; // Loại bỏ trùng lặp
}
