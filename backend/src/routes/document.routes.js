import { Router } from "express";
import * as documentController from "../controllers/document.controller.js";
import * as documentPermissionController from "../controllers/documentPermission.controller.js";
import { authenticateToken, optionalAuthenticateToken } from "../middlewares/validation.middleware.js";
import { requireDocumentAccess, requireEditorAccess, requireOwnerAccess } from "../middlewares/documentAccess.middleware.js";

const router = Router();

// GET /api/documents/dashboard
router.get("/dashboard", authenticateToken, documentController.getDashboard);

// GET /api/documents/community
router.get("/community", authenticateToken, documentController.getCommunityDocs);

// GET /api/documents/bookmarks
router.get("/bookmarks", authenticateToken, documentController.getBookmarks);

// GET /api/documents/search — full-text search (must be before /:id)
router.get("/search", optionalAuthenticateToken, documentController.searchDocuments);

// GET /api/documents/tag-cloud — community tag cloud
router.get("/tag-cloud", documentController.getTagCloud);

// POST /api/documents/upload
router.post("/upload", authenticateToken, documentController.createNewDoc);

// POST /api/documents/:id/bookmark
router.post("/:id/bookmark", authenticateToken, documentController.toggleBookmark);

// PUT /api/documents/:id/edit
router.put("/:id/edit", authenticateToken, requireEditorAccess, documentController.editDoc);

// PUT /api/documents/:id/share (Legacy community share endpoint)
router.put("/:id/share", authenticateToken, requireOwnerAccess, documentController.shareDoc);
router.put("/:id/unshare", authenticateToken, requireOwnerAccess, documentController.unshareDoc);

// PUT /api/documents/:id/edit
router.put("/:id/edit", authenticateToken, documentController.editDoc);

// GET /api/documents/:id — uses optional auth so PUBLIC docs work without login
router.get("/:id", optionalAuthenticateToken, documentController.getDocById);

// PUT /api/documents/:id/view
router.put("/:id/view", documentController.increaseView);

// PUT /api/documents/:id/download
router.put("/:id/download", documentController.increaseDownload);

// DELETE /api/documents/:id
router.delete("/:id", authenticateToken, requireOwnerAccess, documentController.deleteDoc);

// History Routes
router.get("/history/me", authenticateToken, documentController.getViewHistory);
router.delete("/history/me", authenticateToken, documentController.clearViewHistory);
router.post("/:id/history", authenticateToken, documentController.recordDocumentView);

// Sharing & Permissions Routes (Only owner for write operations)
router.get("/:id/share", authenticateToken, requireDocumentAccess, documentPermissionController.getShareSettings);
router.post("/:id/share", authenticateToken, requireOwnerAccess, documentPermissionController.addSharePermission);
router.patch("/:id/share/:userId", authenticateToken, requireOwnerAccess, documentPermissionController.updateSharePermission);
router.delete("/:id/share/:userId", authenticateToken, requireOwnerAccess, documentPermissionController.deleteSharePermission);
router.patch("/:id/visibility", authenticateToken, requireOwnerAccess, documentPermissionController.updateVisibility);

export default router;
