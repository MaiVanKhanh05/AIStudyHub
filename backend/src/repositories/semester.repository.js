import pool from "../../DB/db.js";

/**
 * Get all semesters with their subject codes and doc counts
 */
export const getSemestersWithSubjects = async () => {
    const { rows } = await pool.query(`
        SELECT
            t.semester_id,
            t.name,
            t.description,
            t.generated_at,
            COALESCE(
                JSON_AGG(
                    JSON_BUILD_OBJECT(
                        'subject_code', ts.subject_code,
                        'subject_name', s.subject_name,
                        'doc_count',    COALESCE(dc.doc_count, 0)
                    )
                ) FILTER (WHERE ts.subject_code IS NOT NULL),
                '[]'
            ) AS subjects
        FROM semester t
        LEFT JOIN semester_subject ts ON ts.semester_id = t.semester_id
        LEFT JOIN subject s ON s.subject_code = ts.subject_code
        LEFT JOIN (
            SELECT subject_code, COUNT(*) AS doc_count
            FROM document
            WHERE visibility = 'PUBLIC'
            GROUP BY subject_code
        ) dc ON dc.subject_code = ts.subject_code
        GROUP BY t.semester_id
        ORDER BY t.name ASC
    `);
    return rows;
};

export const createSemester = async (semester) => {
  const { rows } = await pool.query(
    "INSERT INTO semester (name, description, generated_at) VALUES ($1, $2, NOW()) RETURNING *",
    [semester.name, semester.description || null]
  );
  return rows[0];
};

export const updateSemester = async (id, semester) => {
  const { rows } = await pool.query(
    "UPDATE semester SET name = $1, description = $2 WHERE semester_id = $3 RETURNING *",
    [semester.name, semester.description || null, id]
  );
  return rows[0];
};

export const deleteSemester = async (id) => {
  await pool.query("DELETE FROM semester WHERE semester_id = $1", [id]);
};

export const assignSubjectsToSemester = async (id, subjectCodes) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("DELETE FROM semester_subject WHERE semester_id = $1", [id]);
    for (const code of subjectCodes) {
      const exists = await client.query("SELECT 1 FROM subject WHERE subject_code = $1", [code.trim().toUpperCase()]);
      if (exists.rows.length > 0) {
        await client.query("INSERT INTO semester_subject (semester_id, subject_code) VALUES ($1, $2) ON CONFLICT DO NOTHING", [id, code.trim().toUpperCase()]);
      }
    }
    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
};
