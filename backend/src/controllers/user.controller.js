import * as userService from "../services/user.service.js";

export const getUserByEmail = async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) {
            return res.status(400).json({ error: 'Email is required' });
        }

        const user = await userService.getUserByEmail(email);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        res.json(user);

    } catch (error) {
        console.error('Error fetching user by email:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

// Handler đăng nhập: nhận username/email + password, trả về user info
export const login = async (req, res) => {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({ error: 'Username và password là bắt buộc' });
        }

        const user = await userService.loginUser(username, password);

        // Trả về thông tin user (không kèm password)
        res.json({
            message: 'Đăng nhập thành công',
            user,
        });

    } catch (error) {
        console.error('Login error:', error.message);
        res.status(401).json({ error: error.message || 'Đăng nhập thất bại' });
    }
};
