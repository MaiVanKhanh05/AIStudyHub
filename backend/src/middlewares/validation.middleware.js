import { body, validationResult } from "express-validator";
import jwt from "jsonwebtoken";

// Middleware to check validation results and format error response
export const handleValidationErrors = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        // Returns the first error message to the client in the format { error: 'message' }
        return res.status(400).json({ error: errors.array()[0].msg });
    }
    next();
};

// JWT Authentication Middleware
export const authenticateToken = (req, res, next) => {
    try {
        const authHeader = req.headers["authorization"];
        const token = authHeader && authHeader.split(" ")[1]; // Get token from "Bearer TOKEN"

        if (!token) {
            return res.status(401).json({ error: "Access token is required" });
        }

        jwt.verify(token, process.env.JWT_SECRET || "your-secret-key", (err, user) => {
            if (err) {
                return res.status(403).json({ error: "Invalid or expired token" });
            }

            req.userId = user.userId || user.id;
            req.user = user;
            next();
        });
    } catch (error) {
        return res.status(500).json({ error: "Authentication failed" });
    }
};

// Require Admin Role Middleware — dùng sau authenticateToken
export const requireAdmin = async (req, res, next) => {
    try {
        const { default: pool } = await import("../../DB/db.js");
        const userId = req.userId;
        if (!userId) {
            return res.status(401).json({ error: "Không xác định được người dùng" });
        }
        const { rows } = await pool.query(
            "SELECT role, status FROM users WHERE user_id = $1",
            [userId]
        );
        if (rows.length === 0) {
            return res.status(401).json({ error: "Tài khoản không tồn tại" });
        }
        const user = rows[0];
        if (user.status === "LOCKED") {
            return res.status(403).json({ error: "Tài khoản của bạn đã bị khóa" });
        }
        if (user.role !== "ADMIN") {
            return res.status(403).json({ error: "Bạn không có quyền truy cập tính năng này" });
        }
        next();
    } catch (error) {
        return res.status(500).json({ error: "Lỗi xác thực quyền admin" });
    }
};

// Optional JWT Authentication Middleware
export const optionalAuthenticateToken = (req, res, next) => {
    try {
        const authHeader = req.headers["authorization"];
        const token = authHeader && authHeader.split(" ")[1];

        if (!token) {
            return next();
        }

        jwt.verify(token, process.env.JWT_SECRET || "your-secret-key", (err, user) => {
            if (!err) {
                req.userId = user.userId || user.id;
                req.user = user;
            }
            next();
        });
    } catch (error) {
        next();
    }
};

// Validation rules for Registration
export const validateRegister = [
    body("email")
        .trim()
        .notEmpty().withMessage("Email không được để trống")
        .isEmail().withMessage("Định dạng email không hợp lệ")
        .normalizeEmail(),
    body("password")
        .notEmpty().withMessage("Mật khẩu không được để trống")
        .isLength({ min: 6 }).withMessage("Mật khẩu phải chứa ít nhất 6 ký tự"),
    body("mssv")
        .if(body("role").equals("STUDENT"))
        .trim()
        .notEmpty().withMessage("Mã số sinh viên (MSSV) là bắt buộc đối với sinh viên.")
        .matches(/^[A-Za-z]{2}\d{6}$/).withMessage("MSSV phải bắt đầu bằng 2 chữ cái và theo sau là 6 chữ số (ví dụ: se190808)."),
    handleValidationErrors
];

// Validation rules for Login
export const validateLogin = [
    body("email")
        .trim()
        .notEmpty().withMessage("Email không được để trống")
        .isEmail().withMessage("Định dạng email không hợp lệ")
        .normalizeEmail(),
    body("password")
        .notEmpty().withMessage("Mật khẩu không được để trống"),
    handleValidationErrors
];
