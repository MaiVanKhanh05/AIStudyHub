import pool from "./DB/db.js";

async function run() {
  try {
    const { rows } = await pool.query("SELECT user_id, email, role, status FROM users WHERE role = 'ADMIN'");
    console.log("Admin users found:", rows);
  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}

run();
