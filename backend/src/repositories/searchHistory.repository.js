import pool from "../../DB/db.js";

/**
 * Save or update a search keyword for a user.
 * Uses UPSERT: if keyword already exists for this user, update searched_at.
 */
export const saveSearchKeyword = async (userId, keyword) => {
    const { rows } = await pool.query(
        `INSERT INTO search_history (user_id, keyword, searched_at)
         VALUES ($1, $2, NOW())
         RETURNING *`,
        [userId, keyword.trim()]
    );
    return rows[0];
};

/**
 * Get search history for a user, ordered by most recent first.
 * @param {string} userId
 * @param {number} limit  default 10, pass 0 for all
 */
export const getSearchHistory = async (userId, limit = 10) => {
    const query = limit > 0
        ? `SELECT history_id, keyword, searched_at
           FROM search_history
           WHERE user_id = $1
           ORDER BY searched_at DESC
           LIMIT $2`
        : `SELECT history_id, keyword, searched_at
           FROM search_history
           WHERE user_id = $1
           ORDER BY searched_at DESC`;

    const params = limit > 0 ? [userId, limit] : [userId];
    const { rows } = await pool.query(query, params);
    return rows;
};

/**
 * Delete a single search history item (must belong to userId).
 */
export const deleteSearchHistoryItem = async (historyId, userId) => {
    const { rowCount } = await pool.query(
        "DELETE FROM search_history WHERE history_id = $1 AND user_id = $2",
        [historyId, userId]
    );
    return rowCount > 0;
};

/**
 * Delete all search history for a user.
 */
export const clearSearchHistory = async (userId) => {
    const { rowCount } = await pool.query(
        "DELETE FROM search_history WHERE user_id = $1",
        [userId]
    );
    return rowCount;
};
