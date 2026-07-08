import dotenv from "dotenv";
dotenv.config({ override: true });
import pool from "../../DB/db.js";

async function migrate() {
    const client = await pool.connect();
    try {
        await client.query("BEGIN");

        // 1. Add used_storage column
        await client.query(`
            ALTER TABLE users
            ADD COLUMN IF NOT EXISTS used_storage BIGINT DEFAULT 0
        `);
        console.log("✅ Added used_storage column to users table");

        // 2. Sync existing storage data
        await client.query(`
            UPDATE users u
            SET used_storage = COALESCE(d.total_size, 0)
            FROM (
                SELECT user_id, SUM(file_size) as total_size
                FROM document
                GROUP BY user_id
            ) d
            WHERE u.user_id = d.user_id;
        `);
        console.log("✅ Synced existing storage sizes from document table to users table");

        await client.query("COMMIT");
        console.log("\n🎉 Migration 002 completed successfully!");
    } catch (err) {
        await client.query("ROLLBACK");
        console.error("❌ Migration failed:", err.message);
        process.exit(1);
    } finally {
        client.release();
        await pool.end();
    }
}

migrate();
