import pool from "../../DB/db.js";

// Fetch all subjects from database
export const getAllSubjects = async () => {
    try {
        const { rows } = await pool.query(
            "SELECT subject_code, subject_name FROM subject ORDER BY subject_code ASC"
        );
        return rows;
    } catch (error) {
        console.error("Error in getAllSubjects repository:", error);
        throw error;
    }
};

// Search subjects by code or name
export const searchSubjects = async (searchTerm = "") => {
    try {
        const query = searchTerm ? `%${searchTerm}%` : "%";
        const { rows } = await pool.query(
            `SELECT subject_code, subject_name FROM subject 
             WHERE subject_code ILIKE $1 OR subject_name ILIKE $1 
             ORDER BY subject_code ASC 
             LIMIT 30`,
            [query]
        );
        return rows;
    } catch (error) {
        console.error("Error in searchSubjects repository:", error);
        throw error;
    }
};
