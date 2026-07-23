import { Router } from "express";
import * as userController from "../controllers/user.controller.js";
import multer from "multer";
import path from "path";
import { authenticateToken } from "../middlewares/validation.middleware.js";

const router = Router();

// Cấu hình Multer để lưu trữ file
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, "uploads/avatars/");
    },
    filename: function (req, file, cb) {
        // Tạo tên file duy nhất: avatar-userId-timestamp.ext
        const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
        cb(null, "avatar-" + uniqueSuffix + path.extname(file.originalname));
    }
});
const upload = multer({ 
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 } // 5MB
});

router.post("/find-by-email", userController.getUserByEmail);
router.post("/avatar", upload.single("avatar"), userController.uploadAvatar);
router.put("/profile", authenticateToken, userController.updateProfile);
router.get("/search", authenticateToken, userController.searchUsers);

export default router;
