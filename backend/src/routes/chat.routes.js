import { Router } from "express";
import multer from "multer";
import * as chatController from "../controllers/chat.controller.js";
import { optionalAuthenticateToken } from "../middlewares/validation.middleware.js";

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

export default router;
