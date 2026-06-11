import User from "../models/user.model.js";
import pool from "../../DB/db.js";

export const findUserByEmail = async (email) => {
    try {
        const { rows } = await pool.query(
            "SELECT * FROM users WHERE email = $1",
            [email]
        );
        return rows[0] ? new User(rows[0]) : null;
    } catch (error) {
        console.error("Error fetching user by email:", error);
        throw error;
    }
};

export const createUser = async (email, hashedPassword, fullName = null) => {
    try {
        const finalFullName = (fullName || email.split("@")[0]).trim();
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
        const userId = email.split("@")[0].toUpperCase();

        const result = await pool.query(
            "INSERT INTO users (user_id, email, password_hash, first_name, last_name, role, status) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *",
            [userId, email, hashedPassword, firstName, lastName, "STUDENT", "ACTIVE"]
        );
        return result.rows[0] ? new User(result.rows[0]) : null;
    } catch (error) {
        console.error("Error creating user:", error);
        throw error;
    }
};

export const findUserById = async (userId) => {
    try {
        const { rows } = await pool.query(
            "SELECT user_id, email, first_name, last_name, avatar_url, role, status FROM users WHERE user_id = $1",
            [userId]
        );
        return rows[0] || null;
    } catch (error) {
        console.error("Error fetching user by ID:", error);
        throw error;
    }
};

export const searchUsers = async (query) => {
    try {
        const sqlQuery = `%${query.trim().toLowerCase()}%`;
        const { rows } = await pool.query(
            `SELECT user_id, email, first_name, last_name, avatar_url, role
             FROM users
             WHERE LOWER(user_id) LIKE $1 
                OR LOWER(email) LIKE $1 
                OR LOWER(first_name) LIKE $1 
                OR LOWER(last_name) LIKE $1
             LIMIT 10`,
            [sqlQuery]
        );
        return rows;
    } catch (error) {
        console.error("Error searching users in repository:", error);
        throw error;
    }
};
