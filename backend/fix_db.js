import pool from "./DB/db.js";

async function fixName() {
    try {
        console.log("Checking for corrupted names in users table...");
        const { rows } = await pool.query("SELECT user_id, first_name, last_name FROM users");
        
        for (const user of rows) {
            let fn = user.first_name || "";
            let ln = user.last_name || "";
            
            if (fn.includes("Kh") || ln.includes("Mai") || fn.includes("V")) {
                console.log(`Corrupted name found: ${ln} ${fn}`);
                await pool.query("UPDATE users SET first_name = $1, last_name = $2 WHERE user_id = $3", ["Văn Khánh", "Mai", user.user_id]);
                console.log(`Updated to Mai Văn Khánh`);
            }
        }
        console.log("Done.");
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

fixName();
