import pool from "../../DB/db.js";
import Document from "../models/document.model.js";

// Retrieve all documents uploaded by a specific user
export const getUserDocuments = async (userId) => {
    try {
        const { rows } = await pool.query(
            `SELECT d.*, (u.last_name || ' ' || u.first_name) as owner_name, s.subject_name,
                    COALESCE(
                        (SELECT json_agg(json_build_object('tag_id', t.tag_id, 'tag_name', t.tag_name))
                         FROM tags t
                         JOIN document_tags dt ON t.tag_id = dt.tag_id
                         WHERE dt.document_id = d.document_id),
                        '[]'::json
                    ) as tags
             FROM document d
             JOIN users u ON d.user_id = u.user_id
             LEFT JOIN subject s ON d.subject_code = s.subject_code
             WHERE d.user_id = $1
             ORDER BY d.upload_date DESC`,
            [userId]
        );
        return rows.map(row => new Document(row));
    } catch (error) {
        console.error("Error fetching user documents:", error);
        throw error;
    }
};

// Calculate total storage size used by the user's uploaded files (in bytes)
export const getStorageUsage = async (userId) => {
    try {
        const { rows } = await pool.query(
            "SELECT COALESCE(SUM(file_size), 0) as total_size FROM document WHERE user_id = $1",
            [userId]
        );
        return Number(rows[0].total_size);
    } catch (error) {
        console.error("Error calculating storage usage:", error);
        throw error;
    }
};

// Get a unique title by appending a suffix if it already exists
export const getUniqueTitle = async (title) => {
    try {
        let finalTitle = title.trim();
        let exists = true;
        let counter = 1;
        while (exists) {
            const { rows } = await pool.query("SELECT document_id FROM document WHERE title = $1", [finalTitle]);
            if (rows.length === 0) {
                exists = false;
            } else {
                const lastDot = title.lastIndexOf(".");
                if (lastDot !== -1 && lastDot > 0) {
                    const name = title.substring(0, lastDot);
                    const ext = title.substring(lastDot);
                    finalTitle = `${name} (${counter})${ext}`;
                } else {
                    finalTitle = `${title} (${counter})`;
                }
                counter++;
            }
        }
        return finalTitle;
    } catch (error) {
        console.error("Error in getUniqueTitle:", error);
        throw error;
    }
};

// Create a new document in the database
export const createDocument = async (docData) => {
    try {
        const {
            user_id,
            subject_code,
            title,
            description,
            file_url,
            file_size,
            file_type,
            visibility,
        } = docData;

        const { rows } = await pool.query(
            `INSERT INTO document 
             (user_id, subject_code, title, description, file_url, file_size, file_type, visibility) 
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8) 
             RETURNING *`,
            [user_id, subject_code, title, description, file_url, file_size, file_type, visibility || "PRIVATE"]
        );
        return rows[0] ? new Document(rows[0]) : null;
    } catch (error) {
        console.error("Error creating document:", error);
        throw error;
    }
};

// Delete a document from the database (restricted to owner)
export const deleteDocument = async (id, userId) => {
    try {
        const { rowCount } = await pool.query(
            "DELETE FROM document WHERE document_id = $1 AND user_id = $2",
            [id, userId]
        );
        return rowCount > 0;
    } catch (error) {
        console.error("Error deleting document in repository:", error);
        throw error;
    }
};

// Increment view count in database
export const incrementViewCount = async (id) => {
    try {
        const { rows } = await pool.query(
            "UPDATE document SET views = COALESCE(views, 0) + 1 WHERE document_id = $1 RETURNING *",
            [id]
        );
        return rows[0];
    } catch (error) {
        console.error("Error incrementing view count in repository:", error);
        throw error;
    }
};

// Increment download count in database
export const incrementDownloadCount = async (id) => {
    try {
        const { rows } = await pool.query(
            "UPDATE document SET downloads = COALESCE(downloads, 0) + 1 WHERE document_id = $1 RETURNING *",
            [id]
        );
        return rows[0];
    } catch (error) {
        console.error("Error incrementing download count in repository:", error);
        throw error;
    }
};

// Retrieve all community/public documents
export const getCommunityDocuments = async (userId = null) => {
    try {
        const queryParams = userId ? [userId] : [];
        const isBookmarkedSelect = userId ? `, EXISTS (SELECT 1 FROM document_bookmarks db WHERE db.document_id = d.document_id AND db.user_id = $1) as "isBookmarked"` : `, false as "isBookmarked"`;

        const { rows } = await pool.query(
            `SELECT d.*, (u.last_name || ' ' || u.first_name) as author, s.subject_name,
                    COALESCE(
                        (SELECT json_agg(json_build_object('tag_id', t.tag_id, 'tag_name', t.tag_name))
                         FROM tags t
                         JOIN document_tags dt ON t.tag_id = dt.tag_id
                         WHERE dt.document_id = d.document_id),
                        '[]'::json
                    ) as tags
                    ${isBookmarkedSelect}
             FROM document d
             JOIN users u ON d.user_id = u.user_id
             LEFT JOIN subject s ON d.subject_code = s.subject_code
             WHERE d.visibility = 'PUBLIC'
             ORDER BY d.upload_date DESC`,
             queryParams
        );
        return rows.map(row => {
            const doc = new Document(row);
            doc.isBookmarked = row.isBookmarked;
            return doc;
        });
    } catch (error) {
        console.error("Error fetching community documents:", error);
        throw error;
    }
};

export const updateDocumentVisibility = async (documentId, userId, visibility, description) => {
    try {
        const { rows } = await pool.query(
            "UPDATE document SET visibility = $1, description = $2 WHERE document_id = $3 AND user_id = $4 RETURNING *",
            [visibility, description, documentId, userId]
        );
        return rows[0] ? new Document(rows[0]) : null;
    } catch (error) {
        console.error("Error updating document visibility:", error);
        throw error;
    }
};

export const getDocumentById = async (documentId) => {
    try {
        const { rows } = await pool.query(
            `SELECT d.*, (u.last_name || ' ' || u.first_name) as author, s.subject_name,
                    COALESCE(
                        (SELECT json_agg(json_build_object('tag_id', t.tag_id, 'tag_name', t.tag_name))
                         FROM tags t
                         JOIN document_tags dt ON t.tag_id = dt.tag_id
                         WHERE dt.document_id = d.document_id),
                        '[]'::json
                    ) as tags
             FROM document d
             JOIN users u ON d.user_id = u.user_id
             LEFT JOIN subject s ON d.subject_code = s.subject_code
             WHERE d.document_id = $1`,
            [documentId]
        );
        return rows[0] ? new Document(rows[0]) : null;
    } catch (error) {
        console.error("Error fetching document by ID:", error);
        throw error;
    }
};

export const updateDocumentMeta = async (documentId, userId, { title, subject_code, description }) => {
    try {
        const { rows } = await pool.query(
            `UPDATE document
             SET title = $1, subject_code = $2, description = $3
             WHERE document_id = $4 AND user_id = $5
             RETURNING *`,
            [title, subject_code, description, documentId, userId]
        );
        return rows[0] ? new Document(rows[0]) : null;
    } catch (error) {
        console.error("Error updating document meta:", error);
        throw error;
    }
};

export const replaceDocumentTags = async (documentId, tagIds) => {
    try {
        await pool.query("BEGIN");
        await pool.query("DELETE FROM document_tags WHERE document_id = $1", [documentId]);
        
        if (tagIds && tagIds.length > 0) {
            const values = tagIds.map(tagId => `(${documentId}, ${tagId})`).join(", ");
            await pool.query(`INSERT INTO document_tags (document_id, tag_id) VALUES ${values}`);
        }
        
        await pool.query("COMMIT");
    } catch (error) {
        await pool.query("ROLLBACK");
        console.error("Error replacing document tags:", error);
        throw error;
    }
};

// Toggle a bookmark for a document
export const toggleBookmark = async (userId, documentId) => {
    try {
        const { rows } = await pool.query(
            "SELECT 1 FROM document_bookmarks WHERE user_id = $1 AND document_id = $2",
            [userId, documentId]
        );

        if (rows.length > 0) {
            // Unbookmark
            await pool.query(
                "DELETE FROM document_bookmarks WHERE user_id = $1 AND document_id = $2",
                [userId, documentId]
            );
            return { bookmarked: false };
        } else {
            // Bookmark
            await pool.query(
                "INSERT INTO document_bookmarks (user_id, document_id) VALUES ($1, $2)",
                [userId, documentId]
            );
            return { bookmarked: true };
        }
    } catch (error) {
        console.error("Error toggling document bookmark:", error);
        throw error;
    }
};

// Retrieve all documents bookmarked by a user
export const getBookmarkedDocuments = async (userId) => {
    try {
        const { rows } = await pool.query(
            `SELECT d.*, (u.last_name || ' ' || u.first_name) as author, s.subject_name,
                    COALESCE(
                        (SELECT json_agg(json_build_object('tag_id', t.tag_id, 'tag_name', t.tag_name))
                         FROM tags t
                         JOIN document_tags dt ON t.tag_id = dt.tag_id
                         WHERE dt.document_id = d.document_id),
                        '[]'::json
                    ) as tags
             FROM document d
             JOIN users u ON d.user_id = u.user_id
             LEFT JOIN subject s ON d.subject_code = s.subject_code
             JOIN document_bookmarks b ON d.document_id = b.document_id
             WHERE b.user_id = $1
             ORDER BY b.created_at DESC`,
            [userId]
        );
        return rows.map(row => new Document(row));
    } catch (error) {
        console.error("Error fetching bookmarked documents:", error);
        throw error;
    }
};

