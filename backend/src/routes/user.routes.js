import express from "express";
import * as userController from "../controllers/user.controller.js";

const router = express.Router(); // routes là cầu nối giữa fe và be

// Tìm user theo email (cũ)
router.post("/find-by-email", userController.getUserByEmail);

// Đăng nhập: nhận username/email + password
router.post("/login", userController.login);

export default router;
