import * as userRepository from "../repositories/user.repository.js";
import bcrypt from "bcrypt";

export const getUserByEmail = async (email) => {
    try {
        const user = await userRepository.findUserByEmail(email);
        return user;
    } catch (error) {
        throw error;
    }
};

// Xác thực đăng nhập: so sánh password với hash trong DB
export const loginUser = async (identifier, password) => {
    // Tìm user theo username hoặc email
    const user = await userRepository.findUserByUsernameOrEmail(identifier);
    if (!user) {
        throw new Error("Tài khoản không tồn tại");
    }

    // So sánh password nhập vào với hash đã lưu
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
        throw new Error("Mật khẩu không đúng");
    }

    // Trả về thông tin user (bỏ password hash)
    const { password: _, ...safeUser } = user;
    return safeUser;
};