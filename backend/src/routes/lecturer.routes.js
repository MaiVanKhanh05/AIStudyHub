import { Router } from "express";
import * as lecturerController from "../controllers/lecturer.controller.js";
import { authenticateToken } from "../middlewares/validation.middleware.js";

const router = Router();

// Áp dụng authenticateToken
router.use(authenticateToken);

// Danh sách tài liệu hot cần duyệt
router.get("/hot-docs/pending", lecturerController.getPendingHotDocs);

// Duyệt hoặc từ chối
router.patch("/hot-docs/:id/review", lecturerController.reviewHotDoc);

export default router;
