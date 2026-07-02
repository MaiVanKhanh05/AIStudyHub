import pool from "../../DB/db.js";

// Get top hot documents ranked by (views + downloads*2) in the past 7 days
export const getHotDocuments = async (limit = 20) => {
    try {
        const { rows } = await pool.query(
            `SELECT d.document_id, d.title, d.description, d.file_type, d.subject_code,
                    s.subject_name,
                    COALESCE(d.views, 0) AS views,
                    COALESCE(d.downloads, 0) AS downloads,
                    (COALESCE(d.views, 0) + COALESCE(d.downloads, 0) * 2) AS hot_score,
                    d.upload_date, d.visibility, d.is_community,
                    d.is_ai_featured,
                    (u.last_name || ' ' || u.first_name) AS uploader,
                    u.email AS uploader_email,
                    u.role AS uploader_role
             FROM document d
             JOIN users u ON d.user_id = u.user_id
             LEFT JOIN subject s ON d.subject_code = s.subject_code
             WHERE (d.is_community = TRUE OR d.visibility = 'PUBLIC')
               AND (COALESCE(d.views, 0) + COALESCE(d.downloads, 0) * 2) >= 50
             ORDER BY hot_score DESC, d.views DESC
             LIMIT $1`,
            [limit]
        );
        return rows;
    } catch (error) {
        console.error("Error fetching hot documents:", error);
        throw error;
    }
};

// Set or unset is_ai_featured for a document
export const setAiFeatured = async (documentId, featured) => {
    try {
        const { rows } = await pool.query(
            `UPDATE document SET is_ai_featured = $1 WHERE document_id = $2 RETURNING *`,
            [featured, documentId]
        );
        return rows[0] || null;
    } catch (error) {
        console.error("Error updating is_ai_featured:", error);
        throw error;
    }
};

// Create a hot doc review request (Admin sends to Lecturer)
export const createHotDocReview = async (documentId, sentBy, reviewerId) => {
    try {
        // Check if a PENDING review already exists for this doc
        const { rows: existing } = await pool.query(
            `SELECT id FROM hot_document_reviews WHERE document_id = $1 AND status = 'PENDING'`,
            [documentId]
        );
        if (existing.length > 0) {
            throw new Error("Tài liệu này đã có yêu cầu duyệt đang chờ xử lý.");
        }

        const { rows } = await pool.query(
            `INSERT INTO hot_document_reviews (document_id, sent_by, reviewer_id, status)
             VALUES ($1, $2, $3, 'PENDING')
             RETURNING *`,
            [documentId, sentBy, reviewerId]
        );
        return rows[0];
    } catch (error) {
        console.error("Error creating hot doc review:", error);
        throw error;
    }
};

// Update review status (APPROVED or REJECTED)
export const updateHotDocReview = async (reviewId, status, note = null) => {
    try {
        const { rows } = await pool.query(
            `UPDATE hot_document_reviews
             SET status = $1, note = $2, reviewed_at = NOW()
             WHERE id = $3
             RETURNING *`,
            [status, note, reviewId]
        );
        return rows[0] || null;
    } catch (error) {
        console.error("Error updating hot doc review:", error);
        throw error;
    }
};

// Get pending reviews assigned to a specific lecturer
export const getPendingReviewsForLecturer = async (lecturerId) => {
    try {
        const { rows } = await pool.query(
            `SELECT hdr.id AS review_id, hdr.document_id, hdr.status, hdr.sent_at, hdr.note,
                    d.title, d.description, d.file_type, d.subject_code,
                    s.subject_name,
                    COALESCE(d.views, 0) AS views,
                    COALESCE(d.downloads, 0) AS downloads,
                    (COALESCE(d.views, 0) + COALESCE(d.downloads, 0) * 2) AS hot_score,
                    d.is_ai_featured,
                    (sender.last_name || ' ' || sender.first_name) AS sent_by_name
             FROM hot_document_reviews hdr
             JOIN document d ON hdr.document_id = d.document_id
             LEFT JOIN subject s ON d.subject_code = s.subject_code
             JOIN users sender ON hdr.sent_by = sender.user_id
             WHERE hdr.reviewer_id = $1 AND hdr.status = 'PENDING'
             ORDER BY hdr.sent_at DESC`,
            [lecturerId]
        );
        return rows;
    } catch (error) {
        console.error("Error fetching pending reviews for lecturer:", error);
        throw error;
    }
};

// Get all review history (for admin)
export const getAllHotDocReviews = async () => {
    try {
        const { rows } = await pool.query(
            `SELECT hdr.id AS review_id, hdr.document_id, hdr.status, hdr.sent_at, hdr.reviewed_at, hdr.note,
                    d.title, d.is_ai_featured,
                    (sender.last_name || ' ' || sender.first_name) AS sent_by_name,
                    (reviewer.last_name || ' ' || reviewer.first_name) AS reviewer_name,
                    reviewer.email AS reviewer_email
             FROM hot_document_reviews hdr
             JOIN document d ON hdr.document_id = d.document_id
             JOIN users sender ON hdr.sent_by = sender.user_id
             JOIN users reviewer ON hdr.reviewer_id = reviewer.user_id
             ORDER BY hdr.sent_at DESC
             LIMIT 100`,
        );
        return rows;
    } catch (error) {
        console.error("Error fetching all hot doc reviews:", error);
        throw error;
    }
};

// Get a single review by id
export const getReviewById = async (reviewId) => {
    try {
        const { rows } = await pool.query(
            `SELECT * FROM hot_document_reviews WHERE id = $1`,
            [reviewId]
        );
        return rows[0] || null;
    } catch (error) {
        console.error("Error fetching review by id:", error);
        throw error;
    }
};

// Get all lecturers (for admin to pick reviewer)
export const getAllLecturers = async () => {
    try {
        const { rows } = await pool.query(
            `SELECT user_id, (last_name || ' ' || first_name) AS full_name, email
             FROM users WHERE role = 'LECTURER' AND status = 'ACTIVE'
             ORDER BY last_name`
        );
        return rows;
    } catch (error) {
        console.error("Error fetching lecturers:", error);
        throw error;
    }
};
