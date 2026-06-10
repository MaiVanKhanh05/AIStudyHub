import * as documentService from "../services/document.service.js";

// GET /api/documents/dashboard
export const getDashboard = async (req, res) => {
    try {
        const userId = req.userId;
        if (!userId) {
            return res.status(400).json({ error: "userId is required" });
        }

        const data = await documentService.getDashboardData(userId);
        return res.json(data);
    } catch (error) {
        console.error("Error loading dashboard documents:", error);
        return res.status(500).json({ error: "Failed to load dashboard data" });
    }
};

// GET /api/documents/community
export const getCommunityDocs = async (req, res) => {
    try {
        const userId = req.userId || req.query.userId || null;
        const docs = await documentService.getCommunityDocs(userId);
        return res.json(docs);
    } catch (error) {
        console.error("Error loading community documents:", error);
        return res.status(500).json({ error: "Failed to load community data" });
    }
};

// POST /api/documents/upload
export const createNewDoc = async (req, res) => {
    try {
        const userId = req.userId || req.query.userId;
        if (!userId) {
            return res.status(401).json({ error: "Authentication required" });
        }

        const { title, description, file_url, file_name, file_type, file_size, subject, visibility, tags } = req.body;

        if (!title || !file_url) {
            return res.status(400).json({ error: "Title and file_url are required" });
        }

        const docData = {
            user_id: userId,
            subject_code: subject || null,
            title,
            description: description || null,
            file_url,
            file_size: file_size || 0,
            file_type: file_type || "unknown",
            visibility: visibility || "PRIVATE",
            tags: tags || []
        };

        const doc = await documentService.uploadNewDocument(docData);
        return res.status(201).json({
            message: "Document uploaded successfully",
            document: doc
        });
    } catch (error) {
        console.error("Error creating document:", error);
        return res.status(500).json({ error: "Failed to upload document" });
    }
};

// DELETE /api/documents/:id
export const deleteDoc = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.userId;
        if (!id || !userId) {
            return res.status(400).json({ error: "Missing document or user information" });
        }
        const success = await documentService.deleteUserDocument(Number(id), userId);
        if (success) {
            return res.json({ message: "Document deleted successfully" });
        } else {
            return res.status(404).json({ error: "Document not found or you don't have permission to delete it" });
        }
    } catch (error) {
        console.error("Error deleting document in controller:", error);
        return res.status(500).json({ error: "Failed to delete document" });
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

// PUT /api/documents/:id/share
export const shareDoc = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.userId;
        const { description } = req.body;
        
        if (!id || !userId) {
            return res.status(400).json({ error: "Missing document or user information" });
        }
        
        const updatedDoc = await documentService.shareDocument(id, userId, description);
        if (updatedDoc) {
            return res.json({ message: "Document shared successfully", document: updatedDoc });
        } else {
            return res.status(404).json({ error: "Document not found or permission denied" });
        }
    } catch (error) {
        console.error("Error sharing document:", error);
        return res.status(500).json({ error: "Failed to share document" });
    }
};

// GET /api/documents/:id
export const getDocById = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.userId; // from optionalAuthenticateToken
        
        const doc = await documentService.getDocumentById(id);
        if (!doc) {
            return res.status(404).json({ error: "Document not found" });
        }
        
        if (doc.visibility === "PRIVATE" && doc.user_id !== userId) {
            return res.status(403).json({ error: "Access denied. This document is private." });
        }
        
        return res.json({ document: doc });
    } catch (error) {
        console.error("Error fetching document by ID:", error);
        return res.status(500).json({ error: "Failed to fetch document" });
    }
};

export const editDoc = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.userId || req.body?.userId || req.query?.userId;
        const { title, subject, tags, description } = req.body;
        
        if (!title) {
            return res.status(400).json({ error: "Title is required" });
        }
        
        const updatedDoc = await documentService.editDocument(id, userId, { title, subject, tags, description });
        return res.json(updatedDoc);
    } catch (error) {
        console.error("Error editing document:", error);
        if (error.message === "Document not found or unauthorized") {
            return res.status(403).json({ error: error.message });
        }
        return res.status(500).json({ error: "Failed to edit document" });
    }
};

// POST /api/documents/:id/bookmark
export const toggleBookmark = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.userId;
        if (!id || !userId) {
            return res.status(400).json({ error: "Missing document or user information" });
        }
        const result = await documentService.toggleBookmark(userId, id);
        return res.json({ success: true, bookmarked: result.bookmarked });
    } catch (error) {
        console.error("Error toggling bookmark:", error);
        return res.status(500).json({ error: "Failed to toggle bookmark" });
    }
};

// GET /api/documents/bookmarks
export const getBookmarks = async (req, res) => {
    try {
        const userId = req.userId;
        if (!userId) {
            return res.status(400).json({ error: "Missing user information" });
        }
        const docs = await documentService.getBookmarkedDocuments(userId);
        return res.json(docs);
    } catch (error) {
        console.error("Error fetching bookmarked documents:", error);
        return res.status(500).json({ error: "Failed to load bookmarks" });
    }
};
<<<<<<< HEAD

// GET /api/documents
export const getAllDocuments = async (req, res) => {
    try {
        const docs = await documentService.getAllDocuments();
        return res.json(docs);
    } catch (error) {
        console.error("Error loading all documents:", error);
        return res.status(500).json({ error: "Failed to load documents" });
    }
};

// GET /api/documents/:id (Basic fallback)
export const getDocumentById = async (req, res) => {
    try {
        const { id } = req.params;
        const doc = await documentService.getDocumentById(id);
        if (!doc) {
            return res.status(404).json({ error: "Document not found" });
        }
        return res.json(doc);
    } catch (error) {
        console.error("Error fetching document by ID:", error);
        return res.status(500).json({ error: "Failed to fetch document" });
    }
};

=======
>>>>>>> main
