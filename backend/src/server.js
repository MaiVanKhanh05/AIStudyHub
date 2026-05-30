<<<<<<< HEAD
import "dotenv/config";
import express from "express";
import cors from "cors";
import userRoutes from "./routes/user.routes.js";
import authRoutes from "./routes/auth.routes.js";
import documentRoutes from "./routes/document.routes.js";
import adminRoutes from "./routes/admin.routes.js";
import { connectDB } from "../DB/db.js";

=======
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import documentRoutes from "./routes/documentRoutes.js";

dotenv.config();
>>>>>>> feature-document-list

const app = express();

app.use(cors());
app.use(express.json());

<<<<<<< HEAD
app.use("/api/users", userRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/documents", documentRoutes);
app.use("/api/admin", adminRoutes);

const PORT = Number(process.env.PORT) || 5000;

const start = async () => {
    await connectDB();
    app.listen(PORT, () => {
        console.log(`Server is running on http://localhost:${PORT}`);
    });
};

start();
=======
// DOCUMENT API
app.use("/api/documents", documentRoutes);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
>>>>>>> feature-document-list
