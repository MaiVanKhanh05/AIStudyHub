import * as notificationRepository from "../repositories/notification.repository.js";
import * as documentRepository from "../repositories/document.repository.js";
import * as documentPermissionRepository from "../repositories/documentPermission.repository.js";
import * as userRepository from "../repositories/user.repository.js";

export const getNotifications = async (userId) => {
    try {
        return await notificationRepository.getUserNotifications(userId);
    } catch (error) {
        console.error("Error in getNotifications service:", error);
        throw error;
    }
};

export const requestAccess = async (documentId, requestorId) => {
    try {
        const document = await documentRepository.getDocumentById(documentId);
        if (!document) {
            throw new Error("Không tìm thấy tài liệu.");
        }

        if (document.user_id === requestorId) {
            throw new Error("Bạn là chủ sở hữu tài liệu này.");
        }

        // Check if requestor already has access
        if (document.visibility === "PUBLIC") {
            throw new Error("Tài liệu này là công khai, bạn đã có quyền truy cập.");
        }

        const existingPerm = await documentPermissionRepository.getPermission(documentId, requestorId);
        if (existingPerm && ["EDITOR", "VIEWER"].includes(existingPerm.role)) {
            throw new Error("Bạn đã được cấp quyền truy cập tài liệu này.");
        }

        // Check if there is already a pending ACCESS_REQUEST notification
        const ownerNotifs = await notificationRepository.getUserNotifications(document.user_id);
        const duplicateRequest = ownerNotifs.find(n => 
            n.type === "ACCESS_REQUEST" && 
            n.sender_id === requestorId && 
            n.document_id === documentId && 
            n.action_status === "PENDING"
        );

        if (duplicateRequest) {
            return { message: "Yêu cầu quyền truy cập đã được gửi và đang chờ phê duyệt.", duplicate: true };
        }

        // Fetch requestor's profile details to compose the message
        const requestor = await userRepository.findUserById(requestorId);
        const requestorName = requestor ? `${requestor.last_name} ${requestor.first_name}`.trim() : requestorId;

        const message = `${requestorName} yêu cầu quyền xem tài liệu "${document.title}".`;

        const notification = await notificationRepository.createNotification({
            userId: document.user_id,
            senderId: requestorId,
            type: "ACCESS_REQUEST",
            documentId,
            message
        });

        return { message: "Gửi yêu cầu truy cập thành công!", notification };
    } catch (error) {
        console.error("Error in requestAccess service:", error);
        throw error;
    }
};

export const approveAccess = async (notificationId, ownerId) => {
    try {
        const notif = await notificationRepository.getNotificationById(notificationId);
        if (!notif) {
            throw new Error("Không tìm thấy thông báo.");
        }

        if (notif.type !== "ACCESS_REQUEST") {
            throw new Error("Thông báo này không phải là yêu cầu truy cập.");
        }

        if (notif.user_id !== ownerId) {
            throw new Error("Bạn không có quyền thực hiện hành động này.");
        }

        if (notif.action_status !== "PENDING") {
            throw new Error("Yêu cầu này đã được xử lý.");
        }

        const document = await documentRepository.getDocumentById(notif.document_id);
        if (!document) {
            throw new Error("Không tìm thấy tài liệu.");
        }

        // Verify that the person approving is actually the owner of the document
        if (document.user_id !== ownerId) {
            throw new Error("Bạn không phải là chủ sở hữu của tài liệu này.");
        }

        // Add permission (default to VIEWER role)
        const existingPerm = await documentPermissionRepository.getPermission(notif.document_id, notif.sender_id);
        if (!existingPerm) {
            await documentPermissionRepository.addPermission(notif.document_id, notif.sender_id, "VIEWER", ownerId);
        }

        // Update notification action status to APPROVED
        await notificationRepository.updateNotificationStatus(notificationId, "APPROVED");

        // Send confirmation notification back to requestor
        const message = `Yêu cầu xem tài liệu "${document.title}" của bạn đã được phê duyệt.`;
        await notificationRepository.createNotification({
            userId: notif.sender_id,
            senderId: ownerId,
            type: "ACCESS_APPROVED",
            documentId: notif.document_id,
            message
        });

        return { success: true, message: "Đã phê duyệt yêu cầu truy cập thành công!" };
    } catch (error) {
        console.error("Error in approveAccess service:", error);
        throw error;
    }
};

export const denyAccess = async (notificationId, ownerId) => {
    try {
        const notif = await notificationRepository.getNotificationById(notificationId);
        if (!notif) {
            throw new Error("Không tìm thấy thông báo.");
        }

        if (notif.type !== "ACCESS_REQUEST") {
            throw new Error("Thông báo này không phải là yêu cầu truy cập.");
        }

        if (notif.user_id !== ownerId) {
            throw new Error("Bạn không có quyền thực hiện hành động này.");
        }

        if (notif.action_status !== "PENDING") {
            throw new Error("Yêu cầu này đã được xử lý.");
        }

        const document = await documentRepository.getDocumentById(notif.document_id);
        if (!document) {
            throw new Error("Không tìm thấy tài liệu.");
        }

        // Update notification action status to DENIED
        await notificationRepository.updateNotificationStatus(notificationId, "DENIED");

        // Send denial notification back to requestor
        const message = `Yêu cầu xem tài liệu "${document.title}" của bạn đã bị từ chối.`;
        await notificationRepository.createNotification({
            userId: notif.sender_id,
            senderId: ownerId,
            type: "ACCESS_DENIED",
            documentId: notif.document_id,
            message
        });

        return { success: true, message: "Đã từ chối yêu cầu truy cập." };
    } catch (error) {
        console.error("Error in denyAccess service:", error);
        throw error;
    }
};

export const markAsRead = async (notificationId, userId) => {
    try {
        const notif = await notificationRepository.getNotificationById(notificationId);
        if (!notif) {
            throw new Error("Không tìm thấy thông báo.");
        }
        if (notif.user_id !== userId) {
            throw new Error("Bạn không có quyền thực hiện hành động này.");
        }
        return await notificationRepository.markAsRead(notificationId);
    } catch (error) {
        console.error("Error in markAsRead service:", error);
        throw error;
    }
};

export const markAllAsRead = async (userId) => {
    try {
        return await notificationRepository.markAllAsRead(userId);
    } catch (error) {
        console.error("Error in markAllAsRead service:", error);
        throw error;
    }
};

