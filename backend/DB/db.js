import pg from "pg";
import dotenv from "dotenv";

// Load biến môi trường
dotenv.config();

const { Pool } = pg;


export const connectDB = async () => {
    try {
        await pool.query("SELECT 1");
        console.log("Connected to PostgreSQL (AIStudyHub) successfully!");
    } catch (error) {
        console.error("Error connecting to the database:", error);
        process.exit(1);
    }
};

export default pool;