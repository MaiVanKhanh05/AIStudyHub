import * as userRepository from "../repositories/user.repository.js";

export const getUserByEmail = async (email) => {
    try {
        const user = await userRepository.findUserByEmail(email);
        return user;
    } catch (error) {
        throw error;
    }
};