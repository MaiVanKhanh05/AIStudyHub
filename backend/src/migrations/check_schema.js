import dotenv from "dotenv";
dotenv.config({ override: true });
import pool from "../../DB/db.js";

async function check() {
    try {
        const { rows } = await pool.query(
            `SELECT column_name, data_type FROM information_schema.columns 
             WHERE table_name = 'users' ORDER BY ordinal_position LIMIT 5`
        );
        console.log("users columns:", JSON.stringify(rows));
        await pool.end();
    } catch(e) {
        console.error(e.message);
    }
}
check();
