import * as documentService from "../services/document.service.js";

// GET /api/documents/dashboard
export const getDashboard = async (req, res) => {
    try {
        const { userId } = req.query;
        if (!userId) {
            return res.status(400).json({ error: "Missing userId query parameter" });
        }

        const data = await documentService.getDashboardData(userId);
        res.json(data);
    } catch (error) {
        console.error("Error in getDashboard controller:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
};

// POST /api/documents/upload
export const createNewDoc = async (req, res) => {
    try {
        const docData = req.body;
        if (!docData.user_id || !docData.title || !docData.subject_code || !docData.file_url) {
            return res.status(400).json({ error: "Missing required document upload parameters" });
        }

        const newDoc = await documentService.uploadNewDocument(docData);
        res.status(201).json(newDoc);
    } catch (error) {
        console.error("Error in createNewDoc controller:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
};

// DELETE /api/documents/:id
export const deleteDoc = async (req, res) => {
    try {
        const { id } = req.params;
        const { userId } = req.query;

        if (!userId) {
            return res.status(400).json({ error: "Missing owner userId verification parameter" });
        }

        const deleted = await documentService.deleteUserDocument(id, userId);
        if (deleted) {
            res.json({ success: true, message: "Document deleted successfully" });
        } else {
            res.status(404).json({ error: "Document not found or unauthorized deletion request" });
        }
    } catch (error) {
        console.error("Error in deleteDoc controller:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
};

// PUT /api/documents/:id/view
export const increaseView = async (req, res) => {
    try {
        const { id } = req.params;
        const updatedDoc = await documentService.incrementViewCount(id);
        if (updatedDoc) {
            res.json({ success: true, views: updatedDoc.views });
        } else {
            res.status(404).json({ error: "Document not found" });
        }
    } catch (error) {
        console.error("Error in increaseView controller:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
};

// PUT /api/documents/:id/download
export const increaseDownload = async (req, res) => {
    try {
        const { id } = req.params;
        const updatedDoc = await documentService.incrementDownloadCount(id);
        if (updatedDoc) {
            res.json({ success: true, downloads: updatedDoc.downloads });
        } else {
            res.status(404).json({ error: "Document not found" });
        }
    } catch (error) {
        console.error("Error in increaseDownload controller:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
};
