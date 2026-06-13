import * as documentPermissionRepository from "../repositories/documentPermission.repository.js";
import * as documentRepository from "../repositories/document.repository.js";
import * as userRepository from "../repositories/user.repository.js";

export const getShareSettings = async (documentId) => {
    try {
        const document = await documentRepository.getDocumentById(documentId);
        if (!document) {
            throw new Error("Document not found");
        }

        const owner = await userRepository.findUserById(document.user_id);
        const permissions = await documentPermissionRepository.getPermissionsByDocumentId(documentId);

        return {
            visibility: document.visibility,
            owner: owner ? {
                user_id: owner.user_id,
                email: owner.email,
                first_name: owner.first_name,
                last_name: owner.last_name,
                avatar_url: owner.avatar_url
            } : null,
            permissions
        };
    } catch (error) {
        console.error("Error in getShareSettings service:", error);
        throw error;
    }
};

export const addSharePermission = async (documentId, userId, role, grantedBy) => {
    try {
        if (!["EDITOR", "VIEWER"].includes(role)) {
            throw new Error("Invalid role specified. Must be EDITOR or VIEWER.");
        }

        const document = await documentRepository.getDocumentById(documentId);
        if (!document) {
            throw new Error("Document not found");
        }

        // BR-01: document.user_id is the only OWNER. Do not duplicate OWNER in permissions.
        if (document.user_id === userId) {
            throw new Error("Cannot add permission for the document owner.");
        }

        // Check if user exists
        const userExists = await userRepository.findUserById(userId);
        if (!userExists) {
            throw new Error("Target user not found.");
        }

        // BR-04: Duplicate permissions are not allowed.
        const existing = await documentPermissionRepository.getPermission(documentId, userId);
        if (existing) {
            throw new Error("Permission already exists for this user. Use update (PATCH) instead.");
        }

        return await documentPermissionRepository.addPermission(documentId, userId, role, grantedBy);
    } catch (error) {
        console.error("Error in addSharePermission service:", error);
        throw error;
    }
};

export const updateSharePermission = async (documentId, userId, role) => {
    try {
        if (!["EDITOR", "VIEWER"].includes(role)) {
            throw new Error("Invalid role specified. Must be EDITOR or VIEWER.");
        }

        const document = await documentRepository.getDocumentById(documentId);
        if (!document) {
            throw new Error("Document not found");
        }

        // BR-03: Owner cannot be demoted.
        if (document.user_id === userId) {
            throw new Error("Owner role cannot be changed or demoted.");
        }

        const existing = await documentPermissionRepository.getPermission(documentId, userId);
        if (!existing) {
            throw new Error("Permission record not found for this user.");
        }

        return await documentPermissionRepository.updatePermission(documentId, userId, role);
    } catch (error) {
        console.error("Error in updateSharePermission service:", error);
        throw error;
    }
};

export const deleteSharePermission = async (documentId, userId) => {
    try {
        const document = await documentRepository.getDocumentById(documentId);
        if (!document) {
            throw new Error("Document not found");
        }

        // BR-02: Owner cannot be removed.
        if (document.user_id === userId) {
            throw new Error("Owner permission cannot be removed.");
        }

        const existing = await documentPermissionRepository.getPermission(documentId, userId);
        if (!existing) {
            throw new Error("Permission record not found for this user.");
        }

        return await documentPermissionRepository.deletePermission(documentId, userId);
    } catch (error) {
        console.error("Error in deleteSharePermission service:", error);
        throw error;
    }
};

export const updateVisibility = async (documentId, visibility) => {
    try {
        if (!["PUBLIC", "RESTRICTED"].includes(visibility)) {
            throw new Error("Invalid visibility. Must be PUBLIC or RESTRICTED.");
        }

        const document = await documentRepository.getDocumentById(documentId);
        if (!document) {
            throw new Error("Document not found");
        }

        return await documentRepository.updateDocumentVisibility(documentId, visibility);
    } catch (error) {
        console.error("Error in updateVisibility service:", error);
        throw error;
    }
};
