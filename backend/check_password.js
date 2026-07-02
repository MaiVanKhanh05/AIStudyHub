import pool from "./DB/db.js";

async function run() {
  try {
    const { rows } = await pool.query("SELECT user_id, email, password_hash, role FROM users LIMIT 5");
    console.log("Users:", rows);
  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}

run();
