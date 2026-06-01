import pool from "./DB/db.js";

async function checkSchema() {
  try {
    const res = await pool.query(`
      SELECT column_name, data_type, character_maximum_length, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'user_profiles';
    `);
    console.log("COLUMNS IN user_profiles:");
    console.log(JSON.stringify(res.rows, null, 2));
  } catch (err) {
    console.error("Error inspecting database tables:", err);
  } finally {
    process.exit(0);
  }
}

checkSchema();