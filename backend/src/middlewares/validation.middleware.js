import { body, validationResult } from "express-validator";

// Middleware to check validation results and format error response
export const handleValidationErrors = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        // Returns the first error message to the client in the format { error: 'message' }
        return res.status(400).json({ error: errors.array()[0].msg });
    }
    next();
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
