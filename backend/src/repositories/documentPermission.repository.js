import pool from "../../DB/db.js";

// Fetch all permission records for a document
export const getPermissionsByDocumentId = async (documentId) => {
    try {
        const { rows } = await pool.query(
            `SELECT dp.*, u.email, u.first_name, u.last_name, u.avatar_url
             FROM document_permissions dp
             JOIN users u ON dp.user_id = u.user_id
             WHERE dp.document_id = $1
             ORDER BY dp.created_at ASC`,
            [documentId]
        );
        return rows;
    } catch (error) {
        console.error("Error fetching permissions by document ID:", error);
        throw error;
    }
};

// Fetch a single permission record
export const getPermission = async (documentId, userId) => {
    try {
        const { rows } = await pool.query(
            "SELECT * FROM document_permissions WHERE document_id = $1 AND user_id = $2",
            [documentId, userId]
        );
        return rows[0] || null;
    } catch (error) {
        console.error("Error fetching single permission:", error);
        throw error;
    }
};

// Insert a new permission record
export const addPermission = async (documentId, userId, role, grantedBy) => {
    try {
        const { rows } = await pool.query(
            `INSERT INTO document_permissions (document_id, user_id, role, granted_by)
             VALUES ($1, $2, $3, $4)
             RETURNING *`,
            [documentId, userId, role, grantedBy]
        );
        return rows[0] || null;
    } catch (error) {
        console.error("Error adding permission:", error);
        throw error;
    }
};

// Update an existing permission record
export const updatePermission = async (documentId, userId, role) => {
    try {
        const { rows } = await pool.query(
            `UPDATE document_permissions
             SET role = $1
             WHERE document_id = $2 AND user_id = $3
             RETURNING *`,
            [role, documentId, userId]
        );
        return rows[0] || null;
    } catch (error) {
        console.error("Error updating permission:", error);
        throw error;
    }
};

// Delete a permission record
export const deletePermission = async (documentId, userId) => {
    try {
        const { rowCount } = await pool.query(
            "DELETE FROM document_permissions WHERE document_id = $1 AND user_id = $2",
            [documentId, userId]
        );
        return rowCount > 0;
    } catch (error) {
        console.error("Error deleting permission:", error);
        throw error;
    }
};
