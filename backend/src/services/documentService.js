const express = require("express");
const cors = require("cors");

const app = express();

app.use(cors());
app.use(express.json());

const documentRoutes = require("./routes/documentRoutes");

app.use("/api/documents", documentRoutes);

app.get("/", (req, res) => {
    res.send("Backend is running");
});

const PORT = 5000;

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});