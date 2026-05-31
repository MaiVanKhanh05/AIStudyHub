import express from "express";
import pool from "../../DB/db.js";

const router = express.Router();

// GET ALL DOCUMENTS
router.get("/", async (req, res) => {
    try {
        const result = await pool.query(
            "SELECT * FROM document ORDER BY document_id DESC"
        );

        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Server error" });
    }
});

export default router;