import * as documentService from "../services/document.service.js";

// GET /api/documents/dashboard
export const getDashboard = async (req, res) => {
    try {
        const userId = req.query.userId || req.userId;
        if (!userId) {
            return res.status(400).json({ error: "userId là bắt buộc" });
        }

        const data = await documentService.getDashboardData(Number(userId));
        return res.json(data);
    } catch (error) {
        console.error("Error loading dashboard documents:", error);
        return res.status(500).json({ error: "Không thể lấy dữ liệu dashboard" });
    }
};

// POST /api/documents/upload
export const createNewDoc = async (req, res) => {
    try {
        const doc = await documentService.uploadNewDocument(req.body);
        return res.status(201).json({
            message: "Tải lên tài liệu thành công",
            document: doc
        });
    } catch (error) {
        console.error("Error creating document:", error);
        return res.status(500).json({ error: "Không thể tải lên tài liệu" });
    }
};

// DELETE /api/documents/:id
export const deleteDoc = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.query.userId || req.userId;
        if (!id || !userId) {
            return res.status(400).json({ error: "Thiếu thông tin tài liệu hoặc người dùng" });
        }
        const success = await documentService.deleteUserDocument(Number(id), Number(userId));
        if (success) {
            return res.json({ message: "Xóa tài liệu thành công" });
        } else {
            return res.status(404).json({ error: "Tài liệu không tồn tại hoặc bạn không có quyền xóa" });
        }
    } catch (error) {
        console.error("Error deleting document in controller:", error);
        return res.status(500).json({ error: "Không thể xóa tài liệu" });
    }
};
