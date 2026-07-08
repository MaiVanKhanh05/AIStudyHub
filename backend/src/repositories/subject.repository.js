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

// Get all subjects that have at least one public document, with their doc counts
export const getSubjectsWithDocCounts = async () => {
    try {
        const { rows } = await pool.query(`
            SELECT
                s.subject_code,
                s.subject_name,
                COALESCE(dc.doc_count, 0)::int AS doc_count
            FROM subject s
            INNER JOIN (
                SELECT subject_code, COUNT(*) AS doc_count
                FROM document
                WHERE visibility = 'PUBLIC'
                GROUP BY subject_code
            ) dc ON dc.subject_code = s.subject_code
            ORDER BY s.subject_code ASC
        `);
        return rows;
    } catch (error) {
        console.error("Error in getSubjectsWithDocCounts:", error);
        throw error;
    }
};

// Get or create subject by code
export const getOrCreateSubject = async (subjectCode, subjectName = "") => {
    try {
        if (!subjectCode) return null;
        const code = subjectCode.trim().substring(0, 20).toUpperCase();
        if (!code) return null;

        // Check if subject already exists
        const { rows } = await pool.query(
            "SELECT subject_code, subject_name FROM subject WHERE UPPER(subject_code) = $1",
            [code]
        );
        if (rows.length > 0) {
            return rows[0];
        }

        // Insert new subject
        const name = subjectName.trim() || subjectCode.trim();
        const insertRes = await pool.query(
            "INSERT INTO subject (subject_code, subject_name) VALUES ($1, $2) RETURNING subject_code, subject_name",
            [code, name]
        );
        return insertRes.rows[0];
    } catch (error) {
        console.error("Error in getOrCreateSubject:", error);
        throw error;
    }
};
