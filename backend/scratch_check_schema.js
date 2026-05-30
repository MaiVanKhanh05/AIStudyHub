import pool from "./DB/db.js";

async function checkSchema() {
  try {
    const res = await pool.query(`
      SELECT column_name, data_type, is_nullable, column_default 
      FROM information_schema.columns 
      WHERE table_name = 'users';
    `);
    console.log("TABLE USERS COLUMNS:");
    console.log(JSON.stringify(res.rows, null, 2));
  } catch (err) {
    console.error("Error inspecting schema:", err);
  } finally {
    process.exit(0);
  }
}

checkSchema();