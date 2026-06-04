import pool from "./DB/db.js";

async function addSubjects() {
    try {
        const subjects = [
            { code: "WED202c", name: "Thiết kế Web (WED202c)" },
            { code: "MAS291", name: "Toán rời rạc (MAS291)" },
            { code: "CSI104", name: "Lập trình cơ bản (CSI104)" }
        ];

        console.log("Inserting subjects...");
        for (const sub of subjects) {
            await pool.query(
                "INSERT INTO subject (subject_code, subject_name) VALUES ($1, $2) ON CONFLICT (subject_code) DO NOTHING",
                [sub.code, sub.name]
            );
        }
        console.log("Successfully inserted subject codes into PostgreSQL subject table!");
    } catch (err) {
        console.error("Error inserting subjects:", err);
    } finally {
        process.exit(0);
    }
}

addSubjects();
