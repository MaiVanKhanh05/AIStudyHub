import pool from "./DB/db.js";
import bcrypt from "bcrypt";

async function run() {
  try {
    const { rows } = await pool.query("SELECT password_hash FROM users WHERE email = 'admin1@system.edu.vn'");
    if (rows.length === 0) {
      console.log("admin1 not found");
      return;
    }
    const hash = rows[0].password_hash;
    console.log("Admin1 hash:", hash);

    const candidates = ["123456", "admin123", "admin", "admin@123", "password", "12345678", "admin@system.edu.vn", "admin1"];
    for (const c of candidates) {
      const match = await bcrypt.compare(c, hash);
      if (match) {
        console.log(`FOUND PASSWORD: "${c}"`);
        break;
      }
    }
  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}

run();
