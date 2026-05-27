import express from 'express';
import cors from 'cors'; // Thêm cors để tránh lỗi chặn kết nối từ React
import dotenv from 'dotenv';
import userRoutes from './routes/user.routes.js'; 

dotenv.config();

const app = express();

// Middleware bắt buộc
app.use(cors());
app.use(express.json());

// Điều hướng API
app.use("/api/users", userRoutes);

// Khởi chạy server lắng nghe kết nối
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});