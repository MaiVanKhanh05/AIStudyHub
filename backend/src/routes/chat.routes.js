import express from "express";
import { handleChat } from "../controllers/chat.controller.js";
import { authenticateToken } from "../middlewares/validation.middleware.js";


const router = express.Router();

// Tất cả các route chat đều yêu cầu đăng nhập
router.use(authenticateToken);

router.post("/", handleChat);

export default router;
