// Migration script: run with `node src/migrations/001_hot_docs.js`
import dotenv from "dotenv";
dotenv.config({ override: true });
import pool from "../../DB/db.js";

async function migrate() {
    const client = await pool.connect();
    try {
        await client.query("BEGIN");

        // 1. Add is_ai_featured column to document table
        await client.query(`
            ALTER TABLE document
            ADD COLUMN IF NOT EXISTS is_ai_featured BOOLEAN DEFAULT FALSE
        `);
        console.log("✅ Added is_ai_featured column to document table");

        // 2. Create hot_document_reviews table
        await client.query(`
            CREATE TABLE IF NOT EXISTS hot_document_reviews (
                id           SERIAL PRIMARY KEY,
                document_id  INTEGER NOT NULL REFERENCES document(document_id) ON DELETE CASCADE,
                sent_by      VARCHAR NOT NULL REFERENCES users(user_id),
                reviewer_id  VARCHAR NOT NULL REFERENCES users(user_id),
                status       VARCHAR(20) NOT NULL DEFAULT 'PENDING',
                sent_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                reviewed_at  TIMESTAMPTZ,
                note         TEXT,
                CONSTRAINT chk_hot_review_status CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED'))
            )
        `);
        console.log("✅ Created hot_document_reviews table");

        // 3. Index for fast lecturer queries
        await client.query(`
            CREATE INDEX IF NOT EXISTS idx_hot_doc_reviews_reviewer
            ON hot_document_reviews (reviewer_id, status)
        `);
        console.log("✅ Created index on hot_document_reviews");

        await client.query("COMMIT");
        console.log("\n🎉 Migration completed successfully!");
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
