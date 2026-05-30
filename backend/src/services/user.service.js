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

// Xác thực đăng nhập theo username hoặc email
export const loginUser = async (identifier, password) => {
    const user = await userRepository.findUserByUsernameOrEmail(identifier);
    if (!user) {
        throw new Error("Tài khoản không tồn tại");
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
        throw new Error("Mật khẩu không đúng");
    }

    const { password_hash: _, ...safeUser } = user;
    return safeUser;
};

// Xác thực đăng nhập qua email (dùng cho /api/auth/login)
export const loginByEmail = async (email, password) => {
    const user = await userRepository.findUserByEmail(email);
    if (!user) {
        throw new Error("Email không tồn tại");
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
        throw new Error("Mật khẩu không đúng");
    }

    const { password_hash: _, ...safeUser } = user;
    return safeUser;
};

export const registerUser = async (email, password) => {
    try {
        // Check if email already exists
        const existingUserByEmail = await userRepository.findUserByEmail(email);
        if (existingUserByEmail) {
            throw new Error("Email đã được sử dụng");
        }


        // Hash the password with 10 salt rounds
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create user in DB
        const newUser = await userRepository.createUser(email, hashedPassword);
        return newUser;
    } catch (error) {
        throw error;
    }
};

export const loginOrRegisterGoogleUser = async (email, fullName) => {
    try {
        let user = await userRepository.findUserByEmail(email);

        if (!user) {
            // Generate a secure randomized password placeholder for Google-managed users
            const randomPassword = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
            const hashedPassword = await bcrypt.hash(randomPassword, 10);

            user = await userRepository.createUser(email, hashedPassword, fullName);
        }

        const { password_hash: _, ...safeUser } = user;
        return safeUser;
    } catch (error) {
        throw error;
    }
};
