import * as notificationService from "../services/notification.service.js";

export const getNotifications = async (req, res) => {
    try {
        const userId = req.userId;
        if (!userId) {
            return res.status(401).json({ error: "Không tìm thấy thông tin xác thực." });
        }
        const notifications = await notificationService.getNotifications(userId);
        return res.json(notifications);
    } catch (error) {
        console.error("Error in getNotifications controller:", error);
        return res.status(500).json({ error: error.message || "Không thể lấy danh sách thông báo." });
    }
};

export const requestAccess = async (req, res) => {
    try {
        const documentId = Number(req.params.id);
        const requestorId = req.userId;
        if (!documentId) {
            return res.status(400).json({ error: "Thiếu ID tài liệu." });
        }
        if (!requestorId) {
            return res.status(401).json({ error: "Không xác định được người dùng." });
        }
        const result = await notificationService.requestAccess(documentId, requestorId);
        return res.json(result);
    } catch (error) {
        console.error("Error in requestAccess controller:", error);
        return res.status(500).json({ error: error.message || "Gửi yêu cầu truy cập thất bại." });
    }
};

export const approveAccess = async (req, res) => {
    try {
        const notificationId = Number(req.params.id);
        const ownerId = req.userId;
        if (!notificationId) {
            return res.status(400).json({ error: "Thiếu ID thông báo." });
        }
        if (!ownerId) {
            return res.status(401).json({ error: "Không xác định được người dùng." });
        }
        const result = await notificationService.approveAccess(notificationId, ownerId);
        return res.json(result);
    } catch (error) {
        console.error("Error in approveAccess controller:", error);
        return res.status(500).json({ error: error.message || "Phê duyệt yêu cầu thất bại." });
    }
};

export const denyAccess = async (req, res) => {
    try {
        const notificationId = Number(req.params.id);
        const ownerId = req.userId;
        if (!notificationId) {
            return res.status(400).json({ error: "Thiếu ID thông báo." });
        }
        if (!ownerId) {
            return res.status(401).json({ error: "Không xác định được người dùng." });
        }
        const result = await notificationService.denyAccess(notificationId, ownerId);
        return res.json(result);
    } catch (error) {
        console.error("Error in denyAccess controller:", error);
        return res.status(500).json({ error: error.message || "Từ chối yêu cầu thất bại." });
    }
};

export const markAsRead = async (req, res) => {
    try {
        const notificationId = Number(req.params.id);
        const userId = req.userId;
        if (!notificationId) {
            return res.status(400).json({ error: "Thiếu ID thông báo." });
        }
        if (!userId) {
            return res.status(401).json({ error: "Không xác định được người dùng." });
        }
        const result = await notificationService.markAsRead(notificationId, userId);
        return res.json({ success: true, notification: result });
    } catch (error) {
        console.error("Error in markAsRead controller:", error);
        return res.status(500).json({ error: error.message || "Đánh dấu đã đọc thất bại." });
    }
};

export const markAllAsRead = async (req, res) => {
    try {
        const userId = req.userId;
        if (!userId) {
            return res.status(401).json({ error: "Không xác định được người dùng." });
        }
        const result = await notificationService.markAllAsRead(userId);
        return res.json({ success: true, message: "Đã đánh dấu tất cả thông báo là đã đọc." });
    } catch (error) {
        console.error("Error in markAllAsRead controller:", error);
        return res.status(500).json({ error: error.message || "Không thể đánh dấu tất cả đã đọc." });
    }
};

