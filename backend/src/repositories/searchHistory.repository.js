import pool from "../../DB/db.js";

/**
 * Save a search keyword for a user.
 * The DB schema has no unique constraint on (user_id, keyword),
 * so we check for an existing entry first:
 *  - If found → update searched_at to NOW()
 *  - If not   → insert a new row
 */
export const saveSearchKeyword = async (userId, keyword) => {
    const trimmed = keyword.trim();

    // Check if the keyword already exists for this user
    const { rows: existing } = await pool.query(
        "SELECT history_id FROM search_history WHERE user_id = $1 AND keyword = $2",
        [userId, trimmed]
    );

    if (existing.length > 0) {
        // Update searched_at timestamp
        const { rows } = await pool.query(
            "UPDATE search_history SET searched_at = NOW() WHERE history_id = $1 RETURNING *",
            [existing[0].history_id]
        );
        return rows[0];
    }

    // Insert new record
    const { rows } = await pool.query(
        "INSERT INTO search_history (user_id, keyword, searched_at) VALUES ($1, $2, NOW()) RETURNING *",
        [userId, trimmed]
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
 * @param {number} historyId  — the history_id primary key
 * @param {string} userId
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
