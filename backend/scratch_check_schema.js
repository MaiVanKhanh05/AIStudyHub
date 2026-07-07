import pool from "./DB/db.js";

async function alterTable() {
  try {
    // Drop NOT NULL constraint on subject_code in document table
    await pool.query(`
      ALTER TABLE document ALTER COLUMN subject_code DROP NOT NULL;
    `);
    console.log("Successfully made subject_code nullable.");
    
    const res = await pool.query(`
      SELECT column_name, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'document' AND column_name = 'subject_code';
    `);
    console.log(JSON.stringify(res.rows, null, 2));
  } catch (error) {
    console.error("Error:", error);
  } finally {
    pool.end();
  }
}

alterTable();
