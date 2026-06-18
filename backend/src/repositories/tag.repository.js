import pool from "../../DB/db.js";

/**
 * Find a tag by name, or create it if it doesn't exist.
 * Returns the tag object { tag_id, tag_name }.
 */
export const getOrCreateTag = async (tagName) => {
    if (!tagName || !tagName.trim()) return null;
    const name = tagName.trim().toLowerCase();
    try {
        // Try to find existing tag
        const { rows: existing } = await pool.query(
            "SELECT tag_id, tag_name FROM tags WHERE LOWER(tag_name) = $1",
            [name]
        );
        if (existing.length > 0) return existing[0];

        // Create new tag
        const { rows: created } = await pool.query(
            "INSERT INTO tags (tag_name) VALUES ($1) ON CONFLICT (tag_name) DO UPDATE SET tag_name = EXCLUDED.tag_name RETURNING tag_id, tag_name",
            [name]
        );
        return created[0];
    } catch (error) {
        console.error("Error in getOrCreateTag:", error);
        throw error;
    }
};

/**
 * Get all tags for a given document.
 */
export const getTagsByDocumentId = async (documentId) => {
    try {
        const { rows } = await pool.query(
            `SELECT t.tag_id, t.tag_name
             FROM tags t
             JOIN document_tags dt ON t.tag_id = dt.tag_id
             WHERE dt.document_id = $1`,
            [documentId]
        );
        return rows;
    } catch (error) {
        console.error("Error in getTagsByDocumentId:", error);
        throw error;
    }
};

/**
 * Associate a list of tag IDs with a document (bulk insert).
 */
export const associateTagsWithDocument = async (documentId, tagIds) => {
    if (!tagIds || tagIds.length === 0) return;
    try {
        const values = tagIds.map((_, i) => `($1, $${i + 2})`).join(", ");
        await pool.query(
            `INSERT INTO document_tags (document_id, tag_id) VALUES ${values} ON CONFLICT DO NOTHING`,
            [documentId, ...tagIds]
        );
    } catch (error) {
        console.error("Error in associateTagsWithDocument:", error);
        throw error;
    }
};

/**
 * Get all tags associated with documents of a specific subject
 */
export const getTagsBySubject = async (subjectCode) => {
    try {
        const { rows } = await pool.query(
            `SELECT DISTINCT t.tag_id, t.tag_name
             FROM tags t
             JOIN document_tags dt ON t.tag_id = dt.tag_id
             JOIN document d ON dt.document_id = d.document_id
             WHERE d.subject_code = $1
             ORDER BY t.tag_name ASC`,
            [subjectCode]
        );
        return rows;
    } catch (error) {
        console.error("Error in getTagsBySubject:", error);
        throw error;
    }
};

/**
 * Search tags by name
 */
export const searchTags = async (query) => {
    try {
        const { rows } = await pool.query(
            `SELECT tag_id, tag_name
             FROM tags
             WHERE tag_name ILIKE $1
             ORDER BY tag_name ASC
             LIMIT 10`,
            [`%${query}%`]
        );
        return rows;
    } catch (error) {
        console.error("Error in searchTags:", error);
        throw error;
    }
};
