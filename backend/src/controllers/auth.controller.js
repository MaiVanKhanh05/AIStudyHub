import jwt from "jsonwebtoken";
import { OAuth2Client } from "google-auth-library";
import { Resend } from "resend";
import * as userService from "../services/user.service.js";
import bcrypt from "bcrypt";
import crypto from "crypto";
import pool from "../../DB/db.js";

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
// Helpers for 6-Digit OTP Verification
const generateOTP = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
};

const sendOTPEmail = async (email, otp, purpose) => {
    const purposeText = purpose === "REGISTER" ? "XÁC NHẬN ĐĂNG KÝ TÀI KHOẢN" : "ĐẶT LẠI MẬT KHẨU";
    
    // Always log to console for development ease
    console.log("\n======================================================================");
    console.log(`⚡ [DEV ONLY] EMAIL SENT TO: ${email}`);
    console.log(`⚡ TIÊU ĐỀ: [AIStudyHub] MÃ XÁC THỰC OTP - ${purposeText}`);
    console.log(`⚡ MÃ OTP CỦA BẠN LÀ: ${otp}`);
    console.log("⚡ VUI LÒNG NHẬP MÃ NÀY TRÊN GIAO DIỆN ĐỂ XÁC NHẬN (CÓ HIỆU LỰC 5 PHÚT).");
    console.log("======================================================================\n");

    const apiKey = process.env.RESEND_API_KEY;
    if (apiKey) {
        try {
            const resend = new Resend(apiKey);
            const { data, error } = await resend.emails.send({
                from: process.env.RESEND_FROM_EMAIL || 'AIStudyHub <onboarding@resend.dev>',
                to: email,
                subject: `[AIStudyHub] Mã xác thực OTP - ${purposeText}`,
                html: `
                    <div style="font-family: sans-serif; max-width: 500px; margin: 0 auto; padding: 25px; border: 1px solid #f3e8ff; border-radius: 20px; background-color: #ffffff; box-shadow: 0 4px 12px rgba(126, 34, 206, 0.05);">
                        <div style="text-align: center; margin-bottom: 20px;">
                            <span style="font-size: 20px; font-weight: 800; color: #7e22ce; letter-spacing: 1px;">AISTUDYHUB</span>
                        </div>
                        <p style="color: #4b5563; font-size: 14px; line-height: 1.5;">Xin chào,</p>
                        <p style="color: #4b5563; font-size: 14px; line-height: 1.5;">Bạn nhận được thư này vì bạn đã yêu cầu mã OTP xác thực cho mục đích: <strong>${purposeText}</strong>.</p>
                        
                        <div style="background: linear-gradient(135deg, #faf5ff 0%, #f3e8ff 100%); border: 1.5px dashed #c084fc; border-radius: 12px; padding: 18px; text-align: center; margin: 25px 0;">
                            <span style="font-size: 32px; font-weight: 850; letter-spacing: 6px; color: #7e22ce; font-family: monospace;">${otp}</span>
                        </div>
                        
                        <p style="font-size: 12px; color: #9ca3af; text-align: center; margin-top: 25px;">Mã OTP có hiệu lực trong vòng 5 phút. Nếu bạn không yêu cầu mã này, vui lòng bỏ qua email.</p>
                    </div>
                `
            });

            if (error) {
                console.error("❌ Resend API Error:", error);
            } else {
                console.log(`✉️ Real OTP email sent successfully to ${email} via Resend! ID: ${data?.id}`);
            }
        } catch (err) {
            console.error("❌ Failed to send email via Resend:", err.message);
        }
    }
};

// POST /api/auth/login
export const login = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: "Email và password là bắt buộc" });
        }

        const user = await userService.loginByEmail(email, password);

        if (user.status === "PENDING_OTP") {
            return res.status(400).json({ 
                status: "pending_otp", 
                email: user.email, 
                error: "Tài khoản chưa được xác thực OTP! Vui lòng hoàn tất xác thực." 
            });
        }

        if (user.status === "PENDING") {
            return res.status(403).json({ error: "Tài khoản giảng viên đang chờ Admin phê duyệt!" });
        }

        if (user.status === "LOCKED") {
            return res.status(403).json({ error: "Tài khoản của bạn đã bị khóa bởi Admin!" });
        }

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
        const { email, password, firstName, lastName, role, mssv } = req.body;

        if (!email || !password || !firstName || !lastName || !role) {
            return res.status(400).json({ error: "Vui lòng điền đầy đủ các trường thông tin bắt buộc." });
        }

        if (role === "STUDENT" && !mssv) {
            return res.status(400).json({ error: "Mã số sinh viên (MSSV) là bắt buộc đối với sinh viên." });
        }

        const trimmedEmail = email.trim().toLowerCase();

        // 1. Dọn dẹp tài khoản cũ chưa xác thực OTP (để người dùng có thể đăng ký lại)
        await pool.query("DELETE FROM users WHERE email = $1 AND status = 'PENDING_OTP'", [trimmedEmail]);
        if (role === "STUDENT") {
            await pool.query("DELETE FROM users WHERE user_id = $1 AND status = 'PENDING_OTP'", [mssv.trim().toUpperCase()]);
        }

        // 2. Kiểm tra email trùng lặp (với các tài khoản đã kích hoạt)
        const { rows: existingUser } = await pool.query(
            "SELECT * FROM users WHERE email = $1",
            [trimmedEmail]
        );
        if (existingUser.length > 0) {
            return res.status(400).json({ error: "Địa chỉ email này đã được sử dụng." });
        }

        let finalUserId = "";

        if (role === "STUDENT") {
            finalUserId = mssv.trim().toUpperCase();
            // Kiểm tra mssv trùng lặp
            const { rows: existingId } = await pool.query(
                "SELECT * FROM users WHERE user_id = $1",
                [finalUserId]
            );
            if (existingId.length > 0) {
                return res.status(400).json({ error: "Mã số sinh viên (UserID) đã tồn tại trên hệ thống." });
            }
        } else if (role === "LECTURER") {
            // Giảng viên không cần nhập mssv, tự động tạo mã
            const prefix = trimmedEmail.split("@")[0].toUpperCase();
            finalUserId = `LECT_${prefix}`;
        } else {
            return res.status(400).json({ error: "Hệ vai trò không hợp lệ." });
        }

        // 2. Hash mật khẩu
        const hashedPassword = await bcrypt.hash(password, 10);

        // 3. Lưu tài khoản mới vào Postgres database với status = 'PENDING_OTP'
        const result = await pool.query(
            "INSERT INTO users (user_id, email, password_hash, first_name, last_name, role, status) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *",
            [finalUserId, trimmedEmail, hashedPassword, firstName.trim(), lastName.trim(), role, "PENDING_OTP"]
        );

        const newUser = result.rows[0];

        // 4. Tạo mã OTP xác thực
        const otp = generateOTP();
        const expiryTime = new Date(Date.now() + 5 * 60 * 1000); // 5 phút

        await pool.query(
            "INSERT INTO otp_verifications (email, otp_code, purpose, expiry_time) VALUES ($1, $2, $3, $4)",
            [newUser.email, otp, "REGISTER", expiryTime]
        );

        // In mã OTP ra màn hình console để DEV test
        sendOTPEmail(newUser.email, otp, "REGISTER");

        return res.status(201).json({
            message: "Đăng ký thành công! Vui lòng xác thực bằng mã OTP 6 chữ số gửi qua email.",
            status: "pending_otp",
            email: newUser.email,
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
        const { email, name, picture } = payload;

        if (!email) {
            return res.status(400).json({ error: "Không tìm thấy thông tin email từ tài khoản Google" });
        }

        // Check if user already exists
        const user = await userService.getUserByEmail(email);

        if (user) {
            // Cập nhật avatar nếu chưa có
            if (!user.avatar_url && picture) {
                await pool.query("UPDATE users SET avatar_url = $1 WHERE user_id = $2", [picture, user.user_id]);
                user.avatar_url = picture;
            }

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
                avatar_url: picture || null,
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
        const { email, firstName, lastName, userId, role, avatar_url } = req.body;

        if (!email || !firstName || !lastName || !userId) {
            return res.status(400).json({ error: "Tất cả các trường là bắt buộc" });
        }

        const trimmedUserId = userId.trim().toUpperCase();
        const finalRole = role === "LECTURER" ? "LECTURER" : "STUDENT";
        const finalStatus = finalRole === "LECTURER" ? "PENDING" : "ACTIVE";

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
            "INSERT INTO users (user_id, email, password_hash, first_name, last_name, role, status, avatar_url) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *",
            [trimmedUserId, email, hashedPassword, firstName.trim(), lastName.trim(), finalRole, finalStatus, avatar_url || null]
        );

        const newUser = result.rows[0];

        // Sign JWT Session Token
        const token = jwt.sign(
            { userId: newUser.user_id, email: newUser.email },
            process.env.JWT_SECRET,
            { expiresIn: "7d" }
        );

        return res.status(201).json({
            message: finalRole === "LECTURER"
                ? "Đăng ký thành công! Tài khoản giảng viên đang chờ Admin phê duyệt để hoạt động."
                : "Đăng ký tài khoản qua Google thành công",
            token,
            user: {
                user_id: newUser.user_id,
                email: newUser.email,
                first_name: newUser.first_name,
                last_name: newUser.last_name,
                role: newUser.role,
                status: newUser.status,
                max_storage_bytes: newUser.max_storage_bytes,
                avatar_url: newUser.avatar_url
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

        const trimmedEmail = email.trim().toLowerCase();

        // 1. Kiểm tra xem email có tồn tại trong hệ thống hay không
        const { rows: userRows } = await pool.query(
            "SELECT user_id FROM users WHERE email = $1",
            [trimmedEmail]
        );
        if (userRows.length === 0) {
            return res.status(404).json({ error: "Email không tồn tại trong hệ thống." });
        }

        // Generate a 6-digit numeric OTP
        const otp = generateOTP();
        const expiryTime = new Date(Date.now() + 5 * 60 * 1000); // 5 phút

        // Expire older reset OTPs
        await pool.query(
            "UPDATE otp_verifications SET expiry_time = NOW() WHERE email = $1 AND purpose = $2 AND is_verified = FALSE",
            [trimmedEmail, "RESET_PASSWORD"]
        );

        // Save OTP into otp_verifications
        await pool.query(
            "INSERT INTO otp_verifications (email, otp_code, purpose, expiry_time) VALUES ($1, $2, $3, $4)",
            [trimmedEmail, otp, "RESET_PASSWORD", expiryTime]
        );

        // Print/Send OTP
        sendOTPEmail(trimmedEmail, otp, "RESET_PASSWORD");

        return res.status(200).json({ 
            status: "pending_otp",
            email: trimmedEmail,
            message: "Mã xác thực OTP đặt lại mật khẩu đã được gửi! Vui lòng kiểm tra email của bạn." 
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

        const trimmedEmail = email.trim().toLowerCase();
        const trimmedToken = token.trim();

        let userId = null;
        let existingPasswordHash = null;
        let isOtp = trimmedToken.length === 6 && /^\d+$/.test(trimmedToken);
        let otpRecordToVerify = null;
        let tokenRecordToConsume = null;

        if (isOtp) {
            // Find active and unverified OTP matching email, otp and purpose = 'RESET_PASSWORD'
            const { rows: otpRows } = await pool.query(
                `SELECT * FROM otp_verifications 
                 WHERE email = $1 AND otp_code = $2 AND purpose = $3 AND is_verified = FALSE AND expiry_time > NOW() 
                 ORDER BY created_at DESC LIMIT 1`,
                [trimmedEmail, trimmedToken, "RESET_PASSWORD"]
            );

            if (otpRows.length === 0) {
                return res.status(400).json({ error: "Mã OTP không chính xác hoặc đã hết hạn." });
            }

            const otpRecord = otpRows[0];

            // Get user_id from users
            const { rows: userRows } = await pool.query(
                "SELECT user_id, password_hash FROM users WHERE email = $1",
                [trimmedEmail]
            );

            if (userRows.length === 0) {
                return res.status(404).json({ error: "Không tìm thấy tài khoản người dùng tương ứng." });
            }

            userId = userRows[0].user_id;
            existingPasswordHash = userRows[0].password_hash;
            otpRecordToVerify = otpRecord.otp_id;

        } else {
            // Old token verification flow
            const { rows: resetRows } = await pool.query(
                `SELECT pr.*, u.user_id, u.password_hash 
                 FROM password_reset pr
                 JOIN users u ON pr.user_id = u.user_id
                 WHERE u.email = $1 AND pr.token_hash = $2 AND pr.is_used = FALSE AND pr.expiry_time > NOW()`,
                [trimmedEmail, trimmedToken]
            );

            if (resetRows.length === 0) {
                return res.status(400).json({ error: "Liên kết hoặc mã đặt lại mật khẩu không hợp lệ." });
            }

            const resetRecord = resetRows[0];
            userId = resetRecord.user_id;
            existingPasswordHash = resetRecord.password_hash;
            tokenRecordToConsume = resetRecord.reset_id;
        }

        // Check if the new password is the same as the old password
        if (existingPasswordHash) {
            const isMatch = await bcrypt.compare(newPassword, existingPasswordHash);
            if (isMatch) {
                return res.status(400).json({ error: "Mật khẩu mới không được trùng với mật khẩu hiện tại." });
            }
        }

        // Hash new password
        const hashedPassword = await bcrypt.hash(newPassword, 10);

        // Update user password
        await pool.query(
            "UPDATE users SET password_hash = $1, updated_at = NOW() WHERE user_id = $2",
            [hashedPassword, userId]
        );

        // Mark OTP or token as consumed ONLY after successful database password update
        if (otpRecordToVerify) {
            await pool.query(
                "UPDATE otp_verifications SET is_verified = TRUE WHERE otp_id = $1",
                [otpRecordToVerify]
            );
        } else if (tokenRecordToConsume) {
            await pool.query(
                "UPDATE password_reset SET is_used = TRUE WHERE reset_id = $1",
                [tokenRecordToConsume]
            );
        }

        return res.status(200).json({ message: "Mật khẩu của bạn đã được đặt lại thành công!" });
    } catch (error) {
        console.error("Auth reset-password error:", error.message);
        return res.status(500).json({ error: "Lỗi hệ thống nội bộ." });
    }
};

// POST /api/auth/change-password
export const changePassword = async (req, res) => {
    try {
        const { userId, currentPassword, newPassword } = req.body;
        if (!userId || !currentPassword || !newPassword) {
            return res.status(400).json({ error: "Vui lòng điền đầy đủ mật khẩu hiện tại và mật khẩu mới." });
        }
        
        if (currentPassword === newPassword) {
            return res.status(400).json({ error: "Mật khẩu mới không được trùng với mật khẩu hiện tại." });
        }

        // 1. Tìm người dùng trong cơ sở dữ liệu
        const { rows: userRows } = await pool.query(
            "SELECT * FROM users WHERE user_id = $1",
            [userId]
        );

        if (userRows.length === 0) {
            return res.status(404).json({ error: "Không tìm thấy tài khoản người dùng." });
        }

        const user = userRows[0];

        // Nếu tài khoản không có mật khẩu (ví dụ: chỉ liên kết Google)
        if (!user.password_hash) {
            return res.status(400).json({ error: "Tài khoản của bạn đăng nhập bằng Google, không thể thay đổi mật khẩu thông thường." });
        }

        // 2. So khớp mật khẩu hiện tại
        const isMatch = await bcrypt.compare(currentPassword, user.password_hash);
        if (!isMatch) {
            return res.status(400).json({ error: "Mật khẩu hiện tại không chính xác." });
        }

        // 3. Mã hóa mật khẩu mới
        const hashedPassword = await bcrypt.hash(newPassword, 10);

        // 4. Cập nhật mật khẩu trong SQL Database (on-storage)
        await pool.query(
            "UPDATE users SET password_hash = $1, updated_at = NOW() WHERE user_id = $2",
            [hashedPassword, userId]
        );

        return res.status(200).json({ message: "Mật khẩu học tập của bạn đã được thay đổi thành công!" });
    } catch (error) {
        console.error("Auth change-password error:", error.message);
        return res.status(500).json({ error: "Lỗi hệ thống nội bộ khi đổi mật khẩu." });
    }
};

// ============================================================
// GOOGLE OAUTH — Redirect-based flow (consistent with GitHub/Facebook)
// ============================================================

// GET /api/auth/google — redirect người dùng đến Google để xác thực
export const googleOAuthRedirect = (req, res) => {
    const params = new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID,
        redirect_uri: `${process.env.BACKEND_URL || 'http://localhost:5000'}/api/auth/google/callback`,
        scope: 'openid email profile',
        response_type: 'code',
        access_type: 'offline',
        prompt: 'select_account',
    });
    res.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params}`);
};

// GET /api/auth/google/callback — Google gọi về với code
export const googleOAuthCallback = async (req, res) => {
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const { code } = req.query;

    if (!code) {
        return res.redirect(`${frontendUrl}/oauth-callback?error=no_code&provider=google`);
    }

    try {
        const redirectUri = `${process.env.BACKEND_URL || 'http://localhost:5000'}/api/auth/google/callback`;

        // 1. Đổi code lấy tokens từ Google
        const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                client_id: process.env.GOOGLE_CLIENT_ID,
                client_secret: process.env.GOOGLE_CLIENT_SECRET,
                code,
                redirect_uri: redirectUri,
                grant_type: 'authorization_code',
            }),
        });
        const tokenData = await tokenRes.json();

        if (!tokenData.id_token && !tokenData.access_token) {
            console.error('Google token exchange failed:', tokenData);
            return res.redirect(`${frontendUrl}/oauth-callback?error=token_failed&provider=google`);
        }

        // 2. Lấy thông tin user từ Google UserInfo API
        const userInfoRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
            headers: { Authorization: `Bearer ${tokenData.access_token}` },
        });
        const googleUser = await userInfoRes.json();

        const email = googleUser.email;
        const picture = googleUser.picture;
        if (!email) {
            return res.redirect(`${frontendUrl}/oauth-callback?error=no_email&provider=google`);
        }

        // 3. Kiểm tra user trong DB
        const { rows } = await pool.query('SELECT * FROM users WHERE email = $1', [email]);

        if (rows.length > 0) {
            const user = rows[0];

            if (user.status === "LOCKED") {
                return res.redirect(`${frontendUrl}/oauth-callback?error=locked&provider=google`);
            }

            // Tự động lấy avatar nếu trống
            if (!user.avatar_url && picture) {
                await pool.query("UPDATE users SET avatar_url = $1 WHERE user_id = $2", [picture, user.user_id]);
                user.avatar_url = picture;
            }

            // User đã tồn tại → issue JWT và redirect
            const token = jwt.sign(
                { userId: user.user_id, email: user.email },
                process.env.JWT_SECRET,
                { expiresIn: '7d' }
            );
            const userEncoded = encodeURIComponent(JSON.stringify({
                user_id: user.user_id, email: user.email,
                first_name: user.first_name, last_name: user.last_name,
                role: user.role, status: user.status, avatar_url: user.avatar_url
            }));
            return res.redirect(`${frontendUrl}/oauth-callback?token=${token}&user=${userEncoded}&provider=google`);
        } else {
            // User chưa tồn tại → pending registration
            const firstName = googleUser.given_name || '';
            const lastName = googleUser.family_name || '';
            const params = new URLSearchParams({
                status: 'pending_registration',
                provider: 'google',
                email,
                firstName,
                lastName,
                avatar_url: picture || ''
            });
            return res.redirect(`${frontendUrl}/oauth-callback?${params}`);
        }
    } catch (error) {
        console.error('Google OAuth callback error:', error.message);
        return res.redirect(`${frontendUrl}/oauth-callback?error=server_error&provider=google`);
    }
};


// ============================================================
// GITHUB OAUTH
// ============================================================

// GET /api/auth/github — redirect người dùng đến GitHub để xác thực
export const githubRedirect = (req, res) => {
    const params = new URLSearchParams({
        client_id: process.env.GITHUB_CLIENT_ID,
        redirect_uri: `${process.env.BACKEND_URL || 'http://localhost:5000'}/api/auth/github/callback`,
        scope: 'user:email',
        state: crypto.randomBytes(16).toString('hex'),
    });
    res.redirect(`https://github.com/login/oauth/authorize?${params}`);
};

// GET /api/auth/github/callback — GitHub gọi về với code
export const githubCallback = async (req, res) => {
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const { code } = req.query;

    if (!code) {
        return res.redirect(`${frontendUrl}/oauth-callback?error=no_code&provider=github`);
    }

    try {
        // 1. Đổi code lấy access_token
        const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
            method: 'POST',
            headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
            body: JSON.stringify({
                client_id: process.env.GITHUB_CLIENT_ID,
                client_secret: process.env.GITHUB_CLIENT_SECRET,
                code,
                redirect_uri: `${process.env.BACKEND_URL || 'http://localhost:5000'}/api/auth/github/callback`,
            }),
        });
        const tokenData = await tokenRes.json();
        const accessToken = tokenData.access_token;

        if (!accessToken) {
            return res.redirect(`${frontendUrl}/oauth-callback?error=token_failed&provider=github`);
        }

        // 2. Lấy thông tin user từ GitHub
        const userRes = await fetch('https://api.github.com/user', {
            headers: { Authorization: `Bearer ${accessToken}`, 'User-Agent': 'AIStudyHub' },
        });
        const githubUser = await userRes.json();

        // 3. Lấy email (GitHub có thể ẩn email trong profile, cần gọi /user/emails)
        let email = githubUser.email;
        if (!email) {
            const emailRes = await fetch('https://api.github.com/user/emails', {
                headers: { Authorization: `Bearer ${accessToken}`, 'User-Agent': 'AIStudyHub' },
            });
            const emails = await emailRes.json();
            const primaryEmail = emails.find(e => e.primary && e.verified);
            email = primaryEmail?.email || null;
        }

        if (!email) {
            return res.redirect(`${frontendUrl}/oauth-callback?error=no_email&provider=github`);
        }

        // 4. Kiểm tra user trong DB
        const { rows } = await pool.query('SELECT * FROM users WHERE email = $1', [email]);

        if (rows.length > 0) {
            const user = rows[0];

            if (user.status === "LOCKED") {
                return res.redirect(`${frontendUrl}/oauth-callback?error=locked&provider=github`);
            }

            // Tự động lấy avatar Github nếu trống
            if (!user.avatar_url && githubUser.avatar_url) {
                await pool.query("UPDATE users SET avatar_url = $1 WHERE user_id = $2", [githubUser.avatar_url, user.user_id]);
                user.avatar_url = githubUser.avatar_url;
            }

            // User đã tồn tại → issue JWT và redirect
            const token = jwt.sign(
                { userId: user.user_id, email: user.email },
                process.env.JWT_SECRET,
                { expiresIn: '7d' }
            );
            const userEncoded = encodeURIComponent(JSON.stringify({
                user_id: user.user_id, email: user.email,
                first_name: user.first_name, last_name: user.last_name,
                role: user.role, status: user.status, avatar_url: user.avatar_url
            }));
            return res.redirect(`${frontendUrl}/oauth-callback?token=${token}&user=${userEncoded}&provider=github`);
        } else {
            // User chưa tồn tại → pending registration
            const nameParts = (githubUser.name || email.split('@')[0]).split(/\s+/);
            const firstName = nameParts.length > 1 ? nameParts[nameParts.length - 1] : nameParts[0];
            const lastName = nameParts.length > 1 ? nameParts.slice(0, -1).join(' ') : nameParts[0];
            const params = new URLSearchParams({
                status: 'pending_registration',
                provider: 'github',
                email,
                firstName,
                lastName,
                avatar_url: githubUser.avatar_url || ''
            });
            return res.redirect(`${frontendUrl}/oauth-callback?${params}`);
        }
    } catch (error) {
        console.error('GitHub callback error:', error.message);
        return res.redirect(`${frontendUrl}/oauth-callback?error=server_error&provider=github`);
    }
};

// ============================================================
// FACEBOOK OAUTH
// ============================================================

// GET /api/auth/facebook — redirect người dùng đến Facebook để xác thực
export const facebookRedirect = (req, res) => {
    const params = new URLSearchParams({
        client_id: process.env.FACEBOOK_APP_ID,
        redirect_uri: `${process.env.BACKEND_URL || 'http://localhost:5000'}/api/auth/facebook/callback`,
        scope: 'email,public_profile',
        response_type: 'code',
        state: crypto.randomBytes(16).toString('hex'),
    });
    res.redirect(`https://www.facebook.com/v19.0/dialog/oauth?${params}`);
};

// GET /api/auth/facebook/callback — Facebook gọi về với code
export const facebookCallback = async (req, res) => {
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const { code } = req.query;

    if (!code) {
        return res.redirect(`${frontendUrl}/oauth-callback?error=no_code&provider=facebook`);
    }

    try {
        const redirectUri = `${process.env.BACKEND_URL || 'http://localhost:5000'}/api/auth/facebook/callback`;

        // 1. Đổi code lấy access_token
        const tokenUrl = `https://graph.facebook.com/v19.0/oauth/access_token?client_id=${process.env.FACEBOOK_APP_ID}&redirect_uri=${encodeURIComponent(redirectUri)}&client_secret=${process.env.FACEBOOK_APP_SECRET}&code=${code}`;
        const tokenRes = await fetch(tokenUrl);
        const tokenData = await tokenRes.json();
        const accessToken = tokenData.access_token;

        if (!accessToken) {
            return res.redirect(`${frontendUrl}/oauth-callback?error=token_failed&provider=facebook`);
        }

        // 2. Lấy thông tin user từ Facebook Graph API
        const fbUserRes = await fetch(`https://graph.facebook.com/me?fields=id,name,email,first_name,last_name,picture.type(large)&access_token=${accessToken}`);
        const fbUser = await fbUserRes.json();

        const email = fbUser.email;
        if (!email) {
            return res.redirect(`${frontendUrl}/oauth-callback?error=no_email&provider=facebook`);
        }

        // 3. Kiểm tra user trong DB
        const { rows } = await pool.query('SELECT * FROM users WHERE email = $1', [email]);

        if (rows.length > 0) {
            const user = rows[0];

            if (user.status === "LOCKED") {
                return res.redirect(`${frontendUrl}/oauth-callback?error=locked&provider=facebook`);
            }

            const pictureUrl = fbUser.picture?.data?.url;
            if (!user.avatar_url && pictureUrl) {
                await pool.query("UPDATE users SET avatar_url = $1 WHERE user_id = $2", [pictureUrl, user.user_id]);
                user.avatar_url = pictureUrl;
            }

            // User đã tồn tại → issue JWT và redirect
            const token = jwt.sign(
                { userId: user.user_id, email: user.email },
                process.env.JWT_SECRET,
                { expiresIn: '7d' }
            );
            const userEncoded = encodeURIComponent(JSON.stringify({
                user_id: user.user_id, email: user.email,
                first_name: user.first_name, last_name: user.last_name,
                role: user.role, status: user.status, avatar_url: user.avatar_url
            }));
            return res.redirect(`${frontendUrl}/oauth-callback?token=${token}&user=${userEncoded}&provider=facebook`);
        } else {
            // User chưa tồn tại → pending registration
            const params = new URLSearchParams({
                status: 'pending_registration',
                provider: 'facebook',
                email,
                firstName: fbUser.first_name || '',
                lastName: fbUser.last_name || '',
                avatar_url: fbUser.picture?.data?.url || ''
            });
            return res.redirect(`${frontendUrl}/oauth-callback?${params}`);
        }
    } catch (error) {
        console.error('Facebook callback error:', error.message);
        return res.redirect(`${frontendUrl}/oauth-callback?error=server_error&provider=facebook`);
    }
};

// ============================================================
// OTP VERIFICATION & RESEND CONTROLLERS
// ============================================================

// POST /api/auth/verify-otp
export const verifyOtp = async (req, res) => {
    try {
        const { email, otp, purpose } = req.body;

        if (!email || !otp || !purpose) {
            return res.status(400).json({ error: "Thiếu thông tin xác thực OTP." });
        }

        const trimmedEmail = email.trim().toLowerCase();
        const trimmedOtp = otp.trim();

        // Find active and unverified OTP matching email, otp and purpose
        const { rows: otpRows } = await pool.query(
            `SELECT * FROM otp_verifications 
             WHERE email = $1 AND otp_code = $2 AND purpose = $3 AND is_verified = FALSE AND expiry_time > NOW() 
             ORDER BY created_at DESC LIMIT 1`,
            [trimmedEmail, trimmedOtp, purpose]
        );

        if (otpRows.length === 0) {
            return res.status(400).json({ error: "Mã OTP không chính xác hoặc đã hết hạn." });
        }

        const otpRecord = otpRows[0];

        // Mark OTP as verified
        await pool.query(
            "UPDATE otp_verifications SET is_verified = TRUE WHERE otp_id = $1",
            [otpRecord.otp_id]
        );

        if (purpose === "REGISTER") {
            // Find user
            const { rows: userRows } = await pool.query(
                "SELECT * FROM users WHERE email = $1",
                [trimmedEmail]
            );

            if (userRows.length === 0) {
                return res.status(404).json({ error: "Không tìm thấy tài khoản người dùng tương ứng." });
            }

            const user = userRows[0];
            const finalStatus = user.role === "LECTURER" ? "PENDING" : "ACTIVE";

            // Update user status
            await pool.query(
                "UPDATE users SET status = $1, updated_at = NOW() WHERE email = $2",
                [finalStatus, trimmedEmail]
            );

            user.status = finalStatus;
            const { password_hash: _, ...safeUser } = user;

            if (finalStatus === "PENDING") {
                return res.status(200).json({
                    message: "Xác thực tài khoản thành công! Tài khoản giảng viên đang chờ Admin phê duyệt.",
                    status: "pending_approval",
                    user: safeUser
                });
            }

            // Student auto login
            const token = jwt.sign(
                { userId: user.user_id, email: user.email },
                process.env.JWT_SECRET,
                { expiresIn: "7d" }
            );

            return res.status(200).json({
                message: "Xác thực tài khoản thành công!",
                token,
                user: safeUser
            });
        }

        return res.status(200).json({ message: "Mã OTP hợp lệ." });

    } catch (error) {
        console.error("verifyOtp error:", error);
        return res.status(500).json({ error: "Lỗi hệ thống nội bộ khi xác thực OTP." });
    }
};

// POST /api/auth/resend-otp
export const resendOtp = async (req, res) => {
    try {
        const { email, purpose } = req.body;

        if (!email || !purpose) {
            return res.status(400).json({ error: "Email và mục đích gửi mã là bắt buộc." });
        }

        const trimmedEmail = email.trim().toLowerCase();

        // Check if user exists
        const { rows: userRows } = await pool.query(
            "SELECT * FROM users WHERE email = $1",
            [trimmedEmail]
        );

        if (userRows.length === 0) {
            return res.status(404).json({ error: "Không tìm thấy tài khoản người dùng với email này." });
        }

        const user = userRows[0];

        if (purpose === "REGISTER" && user.status !== "PENDING_OTP") {
            return res.status(400).json({ error: "Tài khoản này đã được xác thực hoặc hoạt động." });
        }

        // Expire older OTPs
        await pool.query(
            "UPDATE otp_verifications SET expiry_time = NOW() WHERE email = $1 AND purpose = $2 AND is_verified = FALSE",
            [trimmedEmail, purpose]
        );

        // Generate new OTP
        const otp = generateOTP();
        const expiryTime = new Date(Date.now() + 5 * 60 * 1000); // 5 mins

        await pool.query(
            "INSERT INTO otp_verifications (email, otp_code, purpose, expiry_time) VALUES ($1, $2, $3, $4)",
            [trimmedEmail, otp, purpose, expiryTime]
        );

        // Print/Send OTP
        sendOTPEmail(trimmedEmail, otp, purpose);

        return res.status(200).json({ message: "Mã OTP mới đã được gửi thành công!" });

    } catch (error) {
        console.error("resendOtp error:", error);
        return res.status(500).json({ error: "Lỗi hệ thống nội bộ khi gửi lại OTP." });
    }
};
