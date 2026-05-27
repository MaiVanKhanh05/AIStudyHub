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