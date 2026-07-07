import pool from "../../DB/db.js";

export const up = async () => {
    const client = await pool.connect();
    try {
        await client.query("BEGIN");

        await client.query(`
            CREATE TABLE IF NOT EXISTS topic (
                topic_id     SERIAL PRIMARY KEY,
                name         VARCHAR(100) NOT NULL,
                description  VARCHAR(255),
                icon         VARCHAR(50),
                color        VARCHAR(20),
                generated_at TIMESTAMPTZ DEFAULT NOW()
            );
        `);

        await client.query(`
            CREATE TABLE IF NOT EXISTS topic_subject (
                topic_id     INT REFERENCES topic(topic_id) ON DELETE CASCADE,
                subject_code VARCHAR(20) REFERENCES subject(subject_code) ON DELETE CASCADE,
                PRIMARY KEY (topic_id, subject_code)
            );
        `);

        await client.query("COMMIT");
        console.log("[Migration 003] topic + topic_subject tables created.");
    } catch (err) {
        await client.query("ROLLBACK");
        throw err;
    } finally {
        client.release();
    }
};
