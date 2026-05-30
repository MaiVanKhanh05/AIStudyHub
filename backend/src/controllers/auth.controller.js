import jwt from "jsonwebtoken";
import { OAuth2Client } from "google-auth-library";
import * as userService from "../services/user.service.js";
import bcrypt from "bcrypt";
import crypto from "crypto";
import pool from "../../DB/db.js";

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// POST /api/auth/login
export const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: "Email và password là bắt buộc" });
        }

        const user = await userService.loginByEmail(email, password);

        const token = jwt.sign(
            { userId: user.user_id, email: user.email },
            process.env.JWT_SECRET,
            { expiresIn: "7d" }
        );

        return res.status(200).json({
            message: "Đăng nhập thành công",
            token,
            user,
        });

    } catch (error) {
        console.error("Auth login error:", error.message);
        return res.status(401).json({ error: error.message || "Đăng nhập thất bại" });
    }
};

// POST /api/auth/register
export const register = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: "Email và password là bắt buộc" });
        }

        // Auto-generate unique username from email to satisfy DB constraints
        const emailPrefix = email.split("@")[0];
        const randomSuffix = Math.floor(100 + Math.random() * 900);
        const username = `${emailPrefix}_${randomSuffix}`;

        const newUser = await userService.registerUser(email, password);

        // Sign JWT immediately
        const token = jwt.sign(
            { userId: newUser.user_id, email: newUser.email },
            process.env.JWT_SECRET,
            { expiresIn: "7d" }
        );

        return res.status(201).json({
            message: "Đăng ký tài khoản thành công",
            token,
            user: newUser,
        });

    } catch (error) {
        console.error("Auth register error:", error.message);
        return res.status(400).json({ error: error.message || "Đăng ký thất bại" });
    }
};

// POST /api/auth/logout
export const logout = async (req, res) => {
    try {
        return res.status(200).json({ message: "Đăng xuất thành công" });
    } catch (error) {
        console.error("Auth logout error:", error.message);
        return res.status(500).json({ error: "Đăng xuất thất bại" });
    }
};

// POST /api/auth/google-login
export const googleLogin = async (req, res) => {
    try {
        const { idToken } = req.body;

        if (!idToken) {
            return res.status(400).json({ error: "Google ID Token là bắt buộc" });
        }

        // Verify Google ID Token
        const ticket = await client.verifyIdToken({
            idToken,
            audience: process.env.GOOGLE_CLIENT_ID,
        });

        const payload = ticket.getPayload();
        const { email, name } = payload;

        if (!email) {
            return res.status(400).json({ error: "Không tìm thấy thông tin email từ tài khoản Google" });
        }

        // Check if user already exists
        const user = await userService.getUserByEmail(email);

        if (user) {
            // Sign JWT Session Token
            const token = jwt.sign(
                { userId: user.user_id, email: user.email },
                process.env.JWT_SECRET,
                { expiresIn: "7d" }
            );

            return res.status(200).json({
                message: "Đăng nhập với Google thành công",
                token,
                user,
            });
        } else {
            // User does not exist, parse name into first and last name for editing
            const finalFullName = (name || email.split("@")[0]).trim();
            const nameParts = finalFullName.split(/\s+/);
            let firstName = "";
            let lastName = "";
            if (nameParts.length === 1) {
                firstName = nameParts[0];
                lastName = nameParts[0];
            } else {
                firstName = nameParts[nameParts.length - 1];
                lastName = nameParts.slice(0, nameParts.length - 1).join(" ");
            }

            return res.status(200).json({
                status: "pending_registration",
                email,
                firstName,
                lastName,
                message: "Email chưa được đăng ký. Vui lòng bổ sung thông tin để tiếp tục."
            });
        }

    } catch (error) {
        console.error("Auth google-login error:", error.message);
        return res.status(401).json({ error: "Xác thực Google ID Token thất bại hoặc không hợp lệ" });
    }
};

// POST /api/auth/google-register
export const googleRegister = async (req, res) => {
    try {
        const { email, firstName, lastName, userId } = req.body;

        if (!email || !firstName || !lastName || !userId) {
            return res.status(400).json({ error: "Tất cả các trường là bắt buộc" });
        }

        const trimmedUserId = userId.trim().toUpperCase();

        // Check if userId (MSSV) already exists
        const { rows: existingUserById } = await pool.query(
            "SELECT user_id FROM users WHERE user_id = $1",
            [trimmedUserId]
        );
        if (existingUserById.length > 0) {
            return res.status(400).json({ error: "Mã số sinh viên/giảng viên (UserID) đã tồn tại trên hệ thống!" });
        }

        // Check if email already exists
        const { rows: existingUserByEmail } = await pool.query(
            "SELECT user_id FROM users WHERE email = $1",
            [email]
        );
        if (existingUserByEmail.length > 0) {
            return res.status(400).json({ error: "Email này đã được đăng ký tài khoản khác!" });
        }

        // Generate a secure randomized password placeholder for Google-managed users
        const randomPassword = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
        const hashedPassword = await bcrypt.hash(randomPassword, 10);

        // Insert user in DB
        const result = await pool.query(
            "INSERT INTO users (user_id, email, password_hash, first_name, last_name, role, status) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *",
            [trimmedUserId, email, hashedPassword, firstName.trim(), lastName.trim(), "STUDENT", "ACTIVE"]
        );

        const newUser = result.rows[0];

        // Sign JWT Session Token
        const token = jwt.sign(
            { userId: newUser.user_id, email: newUser.email },
            process.env.JWT_SECRET,
            { expiresIn: "7d" }
        );

        return res.status(201).json({
            message: "Đăng ký tài khoản qua Google thành công",
            token,
            user: {
                user_id: newUser.user_id,
                email: newUser.email,
                first_name: newUser.first_name,
                last_name: newUser.last_name,
                role: newUser.role,
                status: newUser.status,
                max_storage_bytes: newUser.max_storage_bytes
            }
        });

    } catch (error) {
        console.error("Auth google-register error:", error.message);
        return res.status(500).json({ error: "Lỗi hệ thống nội bộ khi đăng ký tài khoản Google." });
    }
};

// POST /api/auth/forgot-password
export const forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) {
            return res.status(400).json({ error: "Email là bắt buộc" });
        }

        // 1. Kiểm tra xem email có tồn tại trong hệ thống hay không
        const { rows: userRows } = await pool.query(
            "SELECT user_id FROM users WHERE email = $1",
            [email]
        );
        if (userRows.length === 0) {
            return res.status(404).json({ error: "Email không tồn tại trong hệ thống." });
        }

        const userId = userRows[0].user_id;

        // 2. Tạo một token ngẫu nhiên
        const token = crypto.randomBytes(32).toString("hex");
        const expiryTime = new Date(Date.now() + 15 * 60 * 1000); // 15 phút

        // 3. Lưu token vào bảng password_reset
        await pool.query(
            `INSERT INTO password_reset (user_id, token_hash, expiry_time, is_used) 
             VALUES ($1, $2, $3, FALSE)`,
            [userId, token, expiryTime]
        );

        // 4. In liên kết ra console để test thuận tiện trong môi trường dev
        const resetLink = `http://localhost:5173/reset-password?token=${token}&email=${encodeURIComponent(email)}`;
        console.log("\n======================================================================");
        console.log("⚡ [DEV ONLY] PASSWORD RESET EMAIL SENT TO:", email);
        console.log("⚡ CLICK LINK TO RESET PASSWORD:");
        console.log(resetLink);
        console.log("======================================================================\n");

        return res.status(200).json({ 
            message: "Một liên kết đặt lại mật khẩu đã được tạo. Vui lòng kiểm tra email của bạn (hoặc console backend để test)." 
        });
    } catch (error) {
        console.error("Auth forgot-password error:", error.message);
        return res.status(500).json({ error: "Lỗi hệ thống nội bộ." });
    }
};

// POST /api/auth/reset-password
export const resetPassword = async (req, res) => {
    try {
        const { email, token, newPassword } = req.body;
        if (!email || !token || !newPassword) {
            return res.status(400).json({ error: "Thiếu thông tin đặt lại mật khẩu." });
        }

        // 1. Tìm token chưa sử dụng và chưa hết hạn của user
        const { rows: resetRows } = await pool.query(
            `SELECT pr.*, u.user_id 
             FROM password_reset pr
             JOIN users u ON pr.user_id = u.user_id
             WHERE u.email = $1 AND pr.token_hash = $2 AND pr.is_used = FALSE AND pr.expiry_time > NOW()`,
            [email, token]
        );

        if (resetRows.length === 0) {
            return res.status(400).json({ error: "Liên kết đặt lại mật khẩu không hợp lệ hoặc đã hết hạn." });
        }

        const resetRecord = resetRows[0];

        // 2. Hash mật khẩu mới
        const hashedPassword = await bcrypt.hash(newPassword, 10);

        // 3. Cập nhật mật khẩu của user
        await pool.query(
            "UPDATE users SET password_hash = $1, updated_at = NOW() WHERE user_id = $2",
            [hashedPassword, resetRecord.user_id]
        );

        // 4. Đánh dấu token đã được sử dụng
        await pool.query(
            "UPDATE password_reset SET is_used = TRUE WHERE reset_id = $1",
            [resetRecord.reset_id]
        );

        return res.status(200).json({ message: "Mật khẩu của bạn đã được đặt lại thành công!" });
    } catch (error) {
        console.error("Auth reset-password error:", error.message);
        return res.status(500).json({ error: "Lỗi hệ thống nội bộ." });
    }
};
