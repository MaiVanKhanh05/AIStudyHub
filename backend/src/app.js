import express from "express";
import cors from "cors";

<<<<<<< HEAD
import documentRoutes from "./routes/document.routes.js";
=======
>>>>>>> main
import subjectRoutes from "./routes/subject.routes.js";

const app = express();

app.use(cors());
app.use(express.json());

app.use("/api/documents", documentRoutes);
app.use("/api/subjects", subjectRoutes);

export default app;