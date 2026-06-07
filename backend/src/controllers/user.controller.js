import * as userService from "../services/user.service.js";
import pool from "../../DB/db.js";
import jwt from "jsonwebtoken";

export const getUserByEmail = async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) {
            return res.status(400).json({ error: "Email is required" });
        }

        const user = await userService.getUserByEmail(email);
        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }
        res.json(user);

    } catch (error) {
        console.error("Error fetching user by email:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
};

export const uploadAvatar = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: "Không tìm thấy file ảnh tải lên." });
        }

        // Lấy token từ header để xác định user
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return res.status(401).json({ error: "Không tìm thấy token xác thực." });
        }
        const token = authHeader.split(" ")[1];
        
        let decoded;
        try {
            decoded = jwt.verify(token, process.env.JWT_SECRET);
        } catch (err) {
            return res.status(401).json({ error: "Token không hợp lệ hoặc đã hết hạn." });
        }
        
        const userId = decoded.userId;

        // Tạo đường dẫn public URL cho ảnh
        const avatarUrl = `${req.protocol}://${req.get("host")}/uploads/avatars/${req.file.filename}`;

        // Cập nhật Database
        await pool.query("UPDATE users SET avatar_url = $1, updated_at = NOW() WHERE user_id = $2", [avatarUrl, userId]);

        return res.status(200).json({ avatar_url: avatarUrl });
    } catch (error) {
        console.error("Error uploading avatar:", error);
        return res.status(500).json({ error: "Lỗi hệ thống khi cập nhật ảnh đại diện." });
    }
};

export const updateProfile = async (req, res) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return res.status(401).json({ error: "Không tìm thấy token xác thực." });
        }
        const token = authHeader.split(" ")[1];
        
        let decoded;
        try {
            decoded = jwt.verify(token, process.env.JWT_SECRET);
        } catch (err) {
            return res.status(401).json({ error: "Token không hợp lệ hoặc đã hết hạn." });
        }
        
        const userId = decoded.userId;
        const { phone, dob, gender, major, avatar_url } = req.body;

        // Fetch current profile to keep avatar_url if not provided in request body
        const currentRes = await pool.query("SELECT avatar_url FROM users WHERE user_id = $1", [userId]);
        const currentAvatar = currentRes.rows[0]?.avatar_url;
        const finalAvatarUrl = avatar_url !== undefined ? avatar_url : currentAvatar;

        await pool.query(
            "UPDATE users SET phone = $1, dob = $2, gender = $3, major = $4, avatar_url = $5, updated_at = NOW() WHERE user_id = $6",
            [phone, dob ? dob : null, gender, major, finalAvatarUrl, userId]
        );

        // Fetch updated user to return
        const result = await pool.query("SELECT * FROM users WHERE user_id = $1", [userId]);
        const updatedUser = result.rows[0];
        // Don't send back password
        if (updatedUser) delete updatedUser.password_hash;

        return res.status(200).json(updatedUser);
    } catch (error) {
        console.error("Error updating profile:", error);
        return res.status(500).json({ error: "Lỗi hệ thống khi cập nhật hồ sơ." });
    }
};
