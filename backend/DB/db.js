import pg from "pg";
import dotenv from "dotenv";

dotenv.config({ override: true });

const { Pool } = pg;

const pool = new Pool({
    ...(process.env.DATABASE_URL
        ? { connectionString: process.env.DATABASE_URL }
        : {
            host: process.env.POSTGRES_HOST || "localhost",
            port: Number(process.env.PORT_DB) || 5432,
            user: process.env.POSTGRES_USER,
            password: process.env.POSTGRES_PASSWORD,
            database: process.env.POSTGRES_DB,
        }),
    ssl: (process.env.DATABASE_URL || (process.env.POSTGRES_HOST && process.env.POSTGRES_HOST !== "localhost"))
        ? { rejectUnauthorized: false }
        : false
});

export const connectDB = async () => {
    try {
        await pool.query("SELECT 1");
        console.log("Connected to PostgreSQL (AIStudyHub) successfully!");

        // Ensure views and downloads columns exist in the document table
        await pool.query("ALTER TABLE document ADD COLUMN IF NOT EXISTS views INT DEFAULT 0");
        await pool.query("ALTER TABLE document ADD COLUMN IF NOT EXISTS downloads INT DEFAULT 0");
        console.log("Database schema columns (views, downloads) verified.");
    } catch (error) {
        console.error("Error connecting to the database:", error);
        process.exit(1);
    }
};

export default pool;
