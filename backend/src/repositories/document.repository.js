import pool from "../../DB/db.js";
import Document from "../models/document.model.js";

// Retrieve all documents uploaded by a specific user
export const getUserDocuments = async (userId) => {
    try {
        const { rows } = await pool.query(
            `SELECT d.*, (u.last_name || ' ' || u.first_name) as owner_name, s.subject_name 
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
