import pool from "../../DB/db.js";

// Get all tags associated with a subject
export const getTagsBySubject = async (subjectCode) => {
    try {
        const { rows } = await pool.query(
            `SELECT t.tag_id, t.tag_name 
             FROM tags t
             JOIN subject_tags st ON t.tag_id = st.tag_id
             WHERE st.subject_code = $1
             ORDER BY t.tag_name ASC`,
            [subjectCode]
        );
        return rows;
    } catch (error) {
        console.error("Error in getTagsBySubject:", error);
        throw error;
    }
};

// Search all tags in the database
export const searchTags = async (query = "") => {
    try {
        const sqlQuery = query ? `%${query}%` : "%";
        const { rows } = await pool.query(
            `SELECT tag_id, tag_name FROM tags 
             WHERE tag_name ILIKE $1 
             ORDER BY tag_name ASC 
             LIMIT 30`,
            [sqlQuery]
        );
        return rows;
    } catch (error) {
        console.error("Error in searchTags:", error);
        throw error;
    }
};

// Get or create tag by name
export const getOrCreateTag = async (tagName) => {
    try {
        const name = tagName.trim();
        if (!name) return null;

        // Check if tag already exists
        const { rows } = await pool.query(
            "SELECT tag_id, tag_name FROM tags WHERE tag_name = $1",
            [name]
        );
        if (rows.length > 0) {
            return rows[0];
        }

        // Insert new tag
        const insertRes = await pool.query(
            "INSERT INTO tags (tag_name) VALUES ($1) RETURNING tag_id, tag_name",
            [name]
        );
        return insertRes.rows[0];
    } catch (error) {
        // Handle race conditions
        console.warn("Conflict or error creating tag, retrying fetch:", error.message);
        const { rows } = await pool.query(
            "SELECT tag_id, tag_name FROM tags WHERE tag_name = $1",
            [tagName.trim()]
        );
        return rows[0] || null;
    }
};

// Associate tags with a document
export const associateTagsWithDocument = async (documentId, tagIds) => {
    try {
        if (!tagIds || tagIds.length === 0) return;
        for (const tagId of tagIds) {
            await pool.query(
                `INSERT INTO document_tags (document_id, tag_id) 
                 VALUES ($1, $2) 
                 ON CONFLICT DO NOTHING`,
                [documentId, tagId]
            );
        }
    } catch (error) {
        console.error("Error in associateTagsWithDocument:", error);
        throw error;
    }
};

// Get tags associated with a document
export const getDocumentTags = async (documentId) => {
    try {
        const { rows } = await pool.query(
            `SELECT t.tag_id, t.tag_name 
             FROM tags t
             JOIN document_tags dt ON t.tag_id = dt.tag_id
             WHERE dt.document_id = $1
             ORDER BY t.tag_name ASC`,
            [documentId]
        );
        return rows;
    } catch (error) {
        console.error("Error in getDocumentTags:", error);
        throw error;
    }
};
