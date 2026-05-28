import User from '../models/user.model.js';
import pool from '../../DB/db.js';

export const findUserByEmail = async (email) => {
    try {
        const { rows } = await pool.query(
            //{} là định nghĩa của một object,
            //rows là một mảng chứa các hàng kết quả trả về từ truy vấn SQL, 
            //mỗi phần tử trong mảng này đại diện cho một hàng dữ liệu từ bảng users.
            'SELECT * FROM users WHERE email = $1',
            [email]);

        return rows[0] ? new User(rows[0]) : null;
    } catch (error) {
        console.error('Error fetching user by email:', error);
        throw error;
    }
};

// Tìm user theo username hoặc email (dùng cho login)
export const findUserByUsernameOrEmail = async (identifier) => {
    try {
        const { rows } = await pool.query(
            'SELECT * FROM users WHERE username = $1 OR email = $1',
            [identifier]
        );
        return rows[0] ? new User(rows[0]) : null;
    } catch (error) {
        console.error('Error fetching user by username/email:', error);
        throw error;
    }
};