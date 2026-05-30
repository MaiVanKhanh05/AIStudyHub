import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import documentRoutes from "./routes/documentRoutes.js";

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

// DOCUMENT API
app.use("/api/documents", documentRoutes);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});