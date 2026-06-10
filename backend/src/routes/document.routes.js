import { Router } from "express";
import * as documentController from "../controllers/document.controller.js";
import { authenticateToken, optionalAuthenticateToken } from "../middlewares/validation.middleware.js";

const router = Router();

// GET /api/documents/dashboard
router.get("/dashboard", authenticateToken, documentController.getDashboard);

// GET /api/documents/community
router.get("/community", authenticateToken, documentController.getCommunityDocs);

// GET /api/documents/bookmarks
router.get("/bookmarks", authenticateToken, documentController.getBookmarks);

// POST /api/documents/upload
router.post("/upload", authenticateToken, documentController.createNewDoc);



// POST /api/documents/:id/bookmark
router.post("/:id/bookmark", authenticateToken, documentController.toggleBookmark);

// PUT /api/documents/:id/share
router.put("/:id/share", authenticateToken, documentController.shareDoc);

// PUT /api/documents/:id/edit
router.put("/:id/edit", authenticateToken, documentController.editDoc);

// GET /api/documents/:id
router.get("/:id", optionalAuthenticateToken, documentController.getDocById);

// PUT /api/documents/:id/view
router.put("/:id/view", documentController.increaseView);

// PUT /api/documents/:id/download
router.put("/:id/download", documentController.increaseDownload);

// DELETE /api/documents/:id
router.delete("/:id", authenticateToken, documentController.deleteDoc);

export default router;
