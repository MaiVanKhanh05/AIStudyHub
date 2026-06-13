import * as documentPermissionService from "../services/documentPermission.service.js";

export const getShareSettings = async (req, res) => {
    try {
        const { id } = req.params;
        const settings = await documentPermissionService.getShareSettings(Number(id));
        return res.status(200).json(settings);
    } catch (error) {
        console.error("Error in getShareSettings controller:", error);
        if (error.message === "Document not found") {
            return res.status(404).json({ error: error.message });
        }
        return res.status(500).json({ error: "Failed to load share settings" });
    }
};

export const addSharePermission = async (req, res) => {
    try {
        const { id } = req.params;
        const { userId, role } = req.body;
        const grantedBy = req.userId;

        if (!userId || !role) {
            return res.status(400).json({ error: "userId and role are required" });
        }

        const permission = await documentPermissionService.addSharePermission(Number(id), userId, role, grantedBy);
        return res.status(201).json({ message: "Permission added successfully", permission });
    } catch (error) {
        console.error("Error in addSharePermission controller:", error);
        if (error.message === "Document not found" || error.message === "Target user not found.") {
            return res.status(404).json({ error: error.message });
        }
        if (
            error.message.includes("Cannot add permission") ||
            error.message.includes("Permission already exists") ||
            error.message.includes("Invalid role")
        ) {
            return res.status(400).json({ error: error.message });
        }
        return res.status(500).json({ error: "Failed to add permission" });
    }
};

export const updateSharePermission = async (req, res) => {
    try {
        const { id, userId } = req.params;
        const { role } = req.body;

        if (!role) {
            return res.status(400).json({ error: "role is required" });
        }

        const permission = await documentPermissionService.updateSharePermission(Number(id), userId, role);
        return res.status(200).json({ message: "Permission updated successfully", permission });
    } catch (error) {
        console.error("Error in updateSharePermission controller:", error);
        if (error.message === "Document not found" || error.message === "Permission record not found for this user.") {
            return res.status(404).json({ error: error.message });
        }
        if (error.message.includes("Owner role cannot be changed") || error.message.includes("Invalid role")) {
            return res.status(400).json({ error: error.message });
        }
        return res.status(500).json({ error: "Failed to update permission" });
    }
};

export const deleteSharePermission = async (req, res) => {
    try {
        const { id, userId } = req.params;

        await documentPermissionService.deleteSharePermission(Number(id), userId);
        return res.status(200).json({ message: "Permission deleted successfully" });
    } catch (error) {
        console.error("Error in deleteSharePermission controller:", error);
        if (error.message === "Document not found" || error.message === "Permission record not found for this user.") {
            return res.status(404).json({ error: error.message });
        }
        if (error.message.includes("Owner permission cannot be removed")) {
            return res.status(400).json({ error: error.message });
        }
        return res.status(500).json({ error: "Failed to delete permission" });
    }
};

export const updateVisibility = async (req, res) => {
    try {
        const { id } = req.params;
        const { visibility } = req.body;

        if (!visibility) {
            return res.status(400).json({ error: "visibility is required" });
        }

        const document = await documentPermissionService.updateVisibility(Number(id), visibility);
        return res.status(200).json({ message: "Visibility updated successfully", document });
    } catch (error) {
        console.error("Error in updateVisibility controller:", error);
        if (error.message === "Document not found") {
            return res.status(404).json({ error: error.message });
        }
        if (error.message.includes("Invalid visibility")) {
            return res.status(400).json({ error: error.message });
        }
        return res.status(500).json({ error: "Failed to update visibility" });
    }
};
