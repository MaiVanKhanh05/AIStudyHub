import { Router } from "express";
import multer from "multer";
import * as chatController from "../controllers/chat.controller.js";
import { authenticateToken, optionalAuthenticateToken } from "../middlewares/validation.middleware.js";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  }
});

const router = Router();

// POST /api/chat - Query chat assistant
router.post("/", optionalAuthenticateToken, chatController.chatQuery);

// POST /api/chat/upload-temp - Temporary file parsing for chat context
router.post("/upload-temp", optionalAuthenticateToken, upload.single("file"), chatController.uploadTempFile);

// GET /api/chat/history - Retrieve all chat sessions and messages for the user
router.get("/history", authenticateToken, chatController.getHistory);

// POST /api/chat/history/save - Save or update chat session and messages
router.post("/history/save", authenticateToken, chatController.saveSession);

// PUT /api/chat/history/pin/:id - Pin or unpin a session
router.put("/history/pin/:id", authenticateToken, chatController.pinSession);

// PUT /api/chat/history/rename/:id - Rename a session
router.put("/history/rename/:id", authenticateToken, chatController.renameSession);

// DELETE /api/chat/history/:id - Delete a session
router.delete("/history/:id", authenticateToken, chatController.deleteSession);

export default router;
