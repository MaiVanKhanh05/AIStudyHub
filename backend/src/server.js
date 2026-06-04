import dotenv from "dotenv";
dotenv.config({ override: true });
import express from "express";
import cors from "cors";
import userRoutes from "./routes/user.routes.js";
import authRoutes from "./routes/auth.routes.js";
import documentRoutes from "./routes/document.routes.js";
import adminRoutes from "./routes/admin.routes.js";
import tagRoutes from "./routes/tag.routes.js";
import subjectRoutes from "./routes/subject.routes.js";
import { connectDB } from "../DB/db.js";


const app = express();

app.use(cors());
app.use(express.json());

app.use("/api/users", userRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/documents", documentRoutes);
app.use("/documents", documentRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/tags", tagRoutes);
app.use("/api/subjects", subjectRoutes);

const PORT = Number(process.env.PORT) || 5000;

const start = async () => {
    await connectDB();
    app.listen(PORT, () => {
        console.log(`Server is running on http://localhost:${PORT}`);
    });
};

start();
