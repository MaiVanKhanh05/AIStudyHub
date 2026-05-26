import express from 'express';
import taskRoutes from './routes/taskRoutes.js';
import dotenv from 'dotenv';
import { connectDB } from '../config/db.js';

dotenv.config();//tạo bảo mật cho các biến môi trường trong file .env

const app = express();

app.use("/api/tasks",taskRoutes);

connectDB();

app.listen(5001, () => {
    console.log('Server is running on port 5001');
});

