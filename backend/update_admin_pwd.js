import pool from "./DB/db.js";
import bcrypt from "bcrypt";

async function run() {
  try {
    const hashedPassword = await bcrypt.hash("admin123", 10);
    const result = await pool.query(
      "UPDATE users SET password_hash = $1 WHERE email = 'admin1@system.edu.vn' RETURNING *",
      [hashedPassword]
    );
    console.log("Updated user:", result.rows);
  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}

run();
