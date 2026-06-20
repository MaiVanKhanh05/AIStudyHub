import * as documentRepository from "../repositories/document.repository.js";
import * as documentPermissionRepository from "../repositories/documentPermission.repository.js";

export const requireDocumentAccess = async (req, res, next) => {
    try {
        const documentId = Number(req.params.id || req.params.documentId);
        const userId = req.userId;

        if (!documentId) {
            return res.status(400).json({ error: "Document ID is required" });
        }

        const document = await documentRepository.getDocumentById(documentId);
        if (!document) {
            return res.status(404).json({ error: "Document not found" });
        }

        // Rule 1: User is owner (creator)
        if (userId && document.user_id === userId) {
            req.document = document;
            req.userRole = "OWNER";
            return next();
        }

        // Rule 2: Document is PUBLIC
        if (document.visibility === "PUBLIC") {
            req.document = document;
            // Check if they have an explicit permission anyway, otherwise default to VIEWER
            let role = "VIEWER";
            if (userId) {
                const perm = await documentPermissionRepository.getPermission(documentId, userId);
                if (perm) role = perm.role;
            }
            req.userRole = role;
            return next();
        }

        // Restricted document requires authentication
        if (!userId) {
            return res.status(401).json({ error: "Authentication required to access this document" });
        }

        // Rule 3 & 4: User has EDITOR or VIEWER permission in document_permissions
        const permission = await documentPermissionRepository.getPermission(documentId, userId);
        if (permission && ["EDITOR", "VIEWER"].includes(permission.role)) {
            req.document = document;
            req.userRole = permission.role;
            return next();
        }

        return res.status(403).json({ error: "Access denied. You do not have permission to view this document." });
    } catch (error) {
        console.error("Error in requireDocumentAccess middleware:", error);
        return res.status(500).json({ error: "Failed to authorize document access" });
    }
};

export const requireEditorAccess = async (req, res, next) => {
    try {
        const documentId = Number(req.params.id || req.params.documentId);
        const userId = req.userId;

        if (!documentId) {
            return res.status(400).json({ error: "Document ID is required" });
        }

        if (!userId) {
            return res.status(401).json({ error: "Authentication required" });
        }

        const document = await documentRepository.getDocumentById(documentId);
        if (!document) {
            return res.status(404).json({ error: "Document not found" });
        }

        // Rule 1: User is owner
        if (document.user_id === userId) {
            req.document = document;
            req.userRole = "OWNER";
            return next();
        }

        // Rule 2: User has EDITOR permission
        const permission = await documentPermissionRepository.getPermission(documentId, userId);
        if (permission && permission.role === "EDITOR") {
            req.document = document;
            req.userRole = "EDITOR";
            return next();
        }

        return res.status(403).json({ error: "Access denied. Only the owner or editors can modify this document." });
    } catch (error) {
        console.error("Error in requireEditorAccess middleware:", error);
        return res.status(500).json({ error: "Failed to authorize editor access" });
    }
};

export const requireOwnerAccess = async (req, res, next) => {
    try {
        const documentId = Number(req.params.id || req.params.documentId);
        const userId = req.userId;

        if (!documentId) {
            return res.status(400).json({ error: "Document ID is required" });
        }

        if (!userId) {
            return res.status(401).json({ error: "Authentication required" });
        }

        const document = await documentRepository.getDocumentById(documentId);
        if (!document) {
            return res.status(404).json({ error: "Document not found" });
        }

        // Rule 1: document.user_id === currentUser.user_id
        if (document.user_id === userId) {
            req.document = document;
            req.userRole = "OWNER";
            return next();
        }

        return res.status(403).json({ error: "Access denied. Only the document owner can perform this action." });
    } catch (error) {
        console.error("Error in requireOwnerAccess middleware:", error);
        return res.status(500).json({ error: "Failed to authorize owner access" });
    }
};
