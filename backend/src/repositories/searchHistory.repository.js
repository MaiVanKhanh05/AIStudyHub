import pool from "../../DB/db.js";

/**
 * Lưu từ khóa tìm kiếm.
 * Nếu (user_id, keyword) đã tồn tại → chỉ cập nhật searched_at (ON CONFLICT DO UPDATE).
 */
export const saveSearchKeyword = async (userId, keyword) => {
    try {
        const { rows } = await pool.query(
            `INSERT INTO search_history (user_id, keyword, searched_at)
             VALUES ($1, $2, NOW())
             ON CONFLICT (user_id, keyword)
             DO UPDATE SET searched_at = NOW()
             RETURNING *`,
            [userId, keyword.trim()]
        );
        return rows[0];
    } catch (error) {
        console.error("Error saving search keyword:", error);
        throw error;
    }
};

/**
 * Lấy toàn bộ lịch sử tìm kiếm của user, sắp xếp mới nhất trước.
 * Client tự giới hạn hiển thị 10 item, "View All" để xem toàn bộ.
 */
export const getSearchHistory = async (userId) => {
    try {
        const { rows } = await pool.query(
            `SELECT search_id, keyword, searched_at
             FROM search_history
             WHERE user_id = $1
             ORDER BY searched_at DESC`,
            [userId]
        );
        return rows;
    } catch (error) {
        console.error("Error fetching search history:", error);
        throw error;
    }
};

/**
 * Xóa một mục lịch sử theo search_id (kiểm tra quyền sở hữu bằng user_id).
 */
export const deleteSearchHistoryItem = async (searchId, userId) => {
    try {
        const { rowCount } = await pool.query(
            `DELETE FROM search_history
             WHERE search_id = $1 AND user_id = $2`,
            [searchId, userId]
        );
        return rowCount > 0;
    } catch (error) {
        console.error("Error deleting search history item:", error);
        throw error;
    }
};

/**
 * Xóa toàn bộ lịch sử tìm kiếm của user.
 */
export const clearSearchHistory = async (userId) => {
    try {
        const { rowCount } = await pool.query(
            `DELETE FROM search_history WHERE user_id = $1`,
            [userId]
        );
        return rowCount;
    } catch (error) {
        console.error("Error clearing search history:", error);
        throw error;
    }
};
