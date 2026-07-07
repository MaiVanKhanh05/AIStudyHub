/**
 * Source Detection Service
 * Trách nhiệm: Phát hiện nguồn tài liệu người dùng đang tương tác
 * để giới hạn phạm vi tìm kiếm (Scope Isolation).
 */

/**
 * Detect the current source based on request parameters
 * @param {string} aiMode The current AI mode (e.g. "Scholar", "General AI")
 * @param {string|number} documentId The ID of the document (can be temp ID or DB ID)
 * @returns {Object} Source Metadata Object
 */
export function detectSource(aiMode, documentId, documentIds = []) {
    const result = {
        sourceType: "GLOBAL_CHAT",
        sourceId: null,
        sourceIds: [],
        confidence: 1.0
    };

    // Tạo danh sách IDs an toàn
    const ids = documentIds && documentIds.length > 0 ? documentIds : (documentId ? [documentId] : []);

    if (ids.length === 0) {
        return result;
    }

    result.sourceIds = ids;
    result.sourceId = ids[0]; // Giữ lại id đầu tiên để tương thích ngược

    // Kiểm tra tiền tố của ID đầu tiên
    const firstId = String(ids[0]);
    if (firstId.startsWith("temp-doc-")) {
        result.sourceType = "UPLOADED_DOCUMENT";
    } 
    // Otherwise, it must be a System Document (from PostgreSQL)
    else {
        result.sourceType = "SYSTEM_DOCUMENT";
        // Convert to number if it's a DB ID to ensure consistency
        result.sourceId = isNaN(Number(ids[0])) ? ids[0] : Number(ids[0]);
        result.sourceIds = ids.map(id => isNaN(Number(id)) ? id : Number(id));
    }

    return result;
}
