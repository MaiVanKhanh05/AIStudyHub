import pool from './DB/db.js';

async function test() {
  try {
    const { rows } = await pool.query(
      `SELECT d.document_id, d.title, d.description, d.file_type, d.subject_code, s.subject_name, 
              (u.last_name || ' ' || u.first_name) as author, u.role as user_role
       FROM document d
       JOIN users u ON d.user_id = u.user_id
       LEFT JOIN subject s ON d.subject_code = s.subject_code
       WHERE d.is_community = TRUE OR d.visibility = 'PUBLIC' OR u.role = 'LECTURE'
       ORDER BY d.view_count DESC, d.upload_date DESC
       LIMIT 1`
    );
    console.log('Query success:', rows);
  } catch (error) {
    console.error('Query error:', error.message);
    console.error(error.code);
  }
  process.exit();
}
test();
