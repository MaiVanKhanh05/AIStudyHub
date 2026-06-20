import pool from "../../DB/db.js";

export const getUserNotifications = async (userId) => {
    try {
        const { rows } = await pool.query(
            `SELECT n.*, 
                    u.first_name as sender_first_name, 
                    u.last_name as sender_last_name, 
                    u.avatar_url as sender_avatar,
                    d.title as document_title
             FROM notifications n
             LEFT JOIN users u ON n.sender_id = u.user_id
             LEFT JOIN document d ON n.document_id = d.document_id
             WHERE n.user_id = $1
             ORDER BY n.created_at DESC`,
            [userId]
        );
        return rows;
    } catch (error) {
        console.error("Error in getUserNotifications repository:", error);
        throw error;
    }
};

export const getNotificationById = async (notificationId) => {
    try {
        const { rows } = await pool.query(
            "SELECT * FROM notifications WHERE notification_id = $1",
            [notificationId]
        );
        return rows[0] || null;
    } catch (error) {
        console.error("Error in getNotificationById repository:", error);
        throw error;
    }
};

export const createNotification = async ({ userId, senderId, type, documentId, message }) => {
    try {
        const { rows } = await pool.query(
            `INSERT INTO notifications (user_id, sender_id, type, document_id, message)
             VALUES ($1, $2, $3, $4, $5)
             RETURNING *`,
            [userId, senderId, type, documentId, message]
        );
        return rows[0];
    } catch (error) {
        console.error("Error in createNotification repository:", error);
        throw error;
    }
};

export const updateNotificationStatus = async (notificationId, status) => {
    try {
        const { rows } = await pool.query(
            `UPDATE notifications 
             SET action_status = $1 
             WHERE notification_id = $2 
             RETURNING *`,
            [status, notificationId]
        );
        return rows[0];
    } catch (error) {
        console.error("Error in updateNotificationStatus repository:", error);
        throw error;
    }
};

export const markAsRead = async (notificationId) => {
    try {
        const { rows } = await pool.query(
            `UPDATE notifications 
             SET is_read = TRUE 
             WHERE notification_id = $1 
             RETURNING *`,
            [notificationId]
        );
        return rows[0];
    } catch (error) {
        console.error("Error in markAsRead repository:", error);
        throw error;
    }
};

export const markAllAsRead = async (userId) => {
    try {
        const { rows } = await pool.query(
            `UPDATE notifications 
             SET is_read = TRUE 
             WHERE user_id = $1 
             RETURNING *`,
            [userId]
        );
        return rows;
    } catch (error) {
        console.error("Error in markAllAsRead repository:", error);
        throw error;
    }
};

