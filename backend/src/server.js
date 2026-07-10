import dotenv from "dotenv";
dotenv.config({ override: true });

import express from "express";
import cors from "cors";

import userRoutes from "./routes/user.routes.js";
import authRoutes from "./routes/auth.routes.js";
import documentRoutes from "./routes/document.routes.js";
import adminRoutes from "./routes/admin.routes.js";
import searchHistoryRoutes from "./routes/searchHistory.routes.js";
import tagRoutes from "./routes/tag.routes.js";
import subjectRoutes from "./routes/subject.routes.js";
import chatRoutes from "./routes/chat.routes.js";
import notificationRoutes from "./routes/notification.routes.js";
import topicRoutes from "./routes/topic.routes.js";

import { connectDB } from "../DB/db.js";

const app = express();

// Cho phép cả localhost (dev) và Vercel (production)
const allowedOrigins = [
    "https://aistudyhub.site",
    ...(process.env.FRONTEND_URL
        ? process.env.FRONTEND_URL.split(",").map((u) => u.trim())
        : []),
];

app.use(
    cors({
        origin: (origin, callback) => {
            // Cho phép Postman hoặc request không có Origin
            if (!origin) return callback(null, true);

            if (allowedOrigins.includes(origin)) {
                return callback(null, true);
            }

            return callback(new Error("Not allowed by CORS"));
        },
        credentials: true,
    })
);

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

app.use("/api/users", userRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/documents", documentRoutes);
app.use("/documents", documentRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/search-history", searchHistoryRoutes);
app.use("/api/tags", tagRoutes);
app.use("/api/subjects", subjectRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/topics", topicRoutes);

const PORT = Number(process.env.PORT) || 5000;

const start = async () => {
    await connectDB();
    app.listen(PORT, () => {
        console.log(`Server is running on http://localhost:${PORT}`);
    });
};

start();
