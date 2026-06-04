import pg from "pg";
import dotenv from "dotenv";

dotenv.config({ override: true });

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
        console.log("Connected to PostgreSQL (AIStudyHub) successfully!");

        // Ensure views and downloads columns exist in the document table
        await pool.query("ALTER TABLE document ADD COLUMN IF NOT EXISTS views INT DEFAULT 0");
        await pool.query("ALTER TABLE document ADD COLUMN IF NOT EXISTS downloads INT DEFAULT 0");
        console.log("Database schema columns (views, downloads) verified.");

        // Auto-migrate: create search_history table if not exists
        await pool.query(`
            CREATE TABLE IF NOT EXISTS search_history (
                search_id   SERIAL PRIMARY KEY,
                user_id     VARCHAR(50) NOT NULL,
                keyword     VARCHAR(255) NOT NULL,
                searched_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
                CONSTRAINT FK_search_history_user
                    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
                CONSTRAINT UQ_search_history_user_keyword
                    UNIQUE (user_id, keyword)
            )
        `);
        await pool.query(`
            CREATE INDEX IF NOT EXISTS IDX_search_history_user_id
                ON search_history (user_id, searched_at DESC)
        `);
        console.log("search_history table verified/created.");
    } catch (error) {
        console.error("Error connecting to the database:", error);
        process.exit(1);
    }
};

export default pool;
