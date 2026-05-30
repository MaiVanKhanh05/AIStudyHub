import pg from "pg";
import dotenv from "dotenv";

dotenv.config();

const { Pool } = pg;

const pool = new Pool({
    host: process.env.POSTGRES_HOST || "localhost",
    port: Number(process.env.PORT_DB) || 5432,
    user: process.env.POSTGRES_USER,
    password: process.env.POSTGRES_PASSWORD,
    database: process.env.POSTGRES_DB,
});

export const connectDB = async () => {
    try {
        await pool.query("SELECT 1");
        console.log("✅ Connected to PostgreSQL (AIStudyHub) successfully!");
    } catch (error) {
        console.error("❌ Error connecting to the database:", error.message);
        process.exit(1);
    }
};

export default pool;
