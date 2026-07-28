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

// Update subject name
export const updateSubject = async (subjectCode, newSubjectName) => {
    try {
        if (!subjectCode || !newSubjectName) return null;
        const code = subjectCode.trim().toUpperCase();
        const name = newSubjectName.trim();

        const { rows } = await pool.query(
            "UPDATE subject SET subject_name = $1 WHERE subject_code = $2 RETURNING subject_code, subject_name",
            [name, code]
        );
        return rows[0] || null;
    } catch (error) {
        console.error("Error in updateSubject:", error);
        throw error;
    }
};

// Delete a subject
export const deleteSubject = async (subjectCode) => {
    try {
        if (!subjectCode) return false;
        const code = subjectCode.trim().toUpperCase();
        
        // First check if it's being used by any documents
        const docCheck = await pool.query(
            "SELECT COUNT(*) FROM document WHERE subject_code = $1",
            [code]
        );
        
        if (parseInt(docCheck.rows[0].count) > 0) {
            throw new Error(`Môn học đang được gán cho ${docCheck.rows[0].count} tài liệu, không thể xóa.`);
        }

        // Also check if it's in topic_subject or semester_subject
        const tsCheck = await pool.query("SELECT COUNT(*) FROM topic_subject WHERE subject_code = $1", [code]);
        if (parseInt(tsCheck.rows[0].count) > 0) throw new Error(`Môn học đang nằm trong ${tsCheck.rows[0].count} chủ đề, không thể xóa.`);

        const ssCheck = await pool.query("SELECT COUNT(*) FROM semester_subject WHERE subject_code = $1", [code]);
        if (parseInt(ssCheck.rows[0].count) > 0) throw new Error(`Môn học đang nằm trong ${ssCheck.rows[0].count} học kỳ, không thể xóa.`);

        const { rowCount } = await pool.query(
            "DELETE FROM subject WHERE subject_code = $1",
            [code]
        );

        return rowCount > 0;
    } catch (error) {
        console.error("Error in deleteSubject:", error);
        throw error;
    }
};
