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

        // Ensure user profile columns exist
        await pool.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS phone VARCHAR(20)");
        await pool.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS dob DATE");
        await pool.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS gender VARCHAR(10)");
        await pool.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS major VARCHAR(100)");
        console.log("Database schema columns for users (phone, dob, gender, major) verified.");
        
        // Create document_bookmarks table for favorites feature
        await pool.query(`
            CREATE TABLE IF NOT EXISTS document_bookmarks (
                user_id VARCHAR(50) REFERENCES users(user_id) ON DELETE CASCADE,
                document_id INT REFERENCES document(document_id) ON DELETE CASCADE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (user_id, document_id)
            )
        `);
        console.log("Database schema columns and tables verified.");
    } catch (error) {
        console.error("Error connecting to the database:", error);
        process.exit(1);
    }
};

export default pool;
