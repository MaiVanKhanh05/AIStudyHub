import pool from "../../DB/db.js";

/**
 * Get all topics with their subject codes and doc counts
 */
export const getTopicsWithSubjects = async () => {
    const { rows } = await pool.query(`
        SELECT
            t.topic_id,
            t.name,
            t.description,
            t.icon,
            t.color,
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
        FROM topic t
        LEFT JOIN topic_subject ts ON ts.topic_id = t.topic_id
        LEFT JOIN subject s ON s.subject_code = ts.subject_code
        LEFT JOIN (
            SELECT subject_code, COUNT(*) AS doc_count
            FROM document
            WHERE visibility = 'PUBLIC'
            GROUP BY subject_code
        ) dc ON dc.subject_code = ts.subject_code
        GROUP BY t.topic_id
        ORDER BY t.name ASC
    `);
    return rows;
};

/**
 * Get the timestamp of the most recently generated topic set
 */
export const getLastGeneratedAt = async () => {
    const { rows } = await pool.query(
        "SELECT MAX(generated_at) AS last_at FROM topic"
    );
    return rows[0]?.last_at || null;
};



export const createTopic = async (topic) => {
  const { rows } = await pool.query(
    "INSERT INTO topic (name, description, icon, color, generated_at) VALUES ($1, $2, $3, $4, NOW()) RETURNING *",
    [topic.name, topic.description || null, topic.icon || null, topic.color || null]
  );
  return rows[0];
};

export const updateTopic = async (id, topic) => {
  const { rows } = await pool.query(
    "UPDATE topic SET name = $1, description = $2, icon = $3, color = $4 WHERE topic_id = $5 RETURNING *",
    [topic.name, topic.description || null, topic.icon || null, topic.color || null, id]
  );
  return rows[0];
};

export const deleteTopic = async (id) => {
  await pool.query("DELETE FROM topic WHERE topic_id = $1", [id]);
};

export const assignSubjectsToTopic = async (id, subjectCodes) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("DELETE FROM topic_subject WHERE topic_id = $1", [id]);
    for (const code of subjectCodes) {
      const exists = await client.query("SELECT 1 FROM subject WHERE subject_code = $1", [code.trim().toUpperCase()]);
      if (exists.rows.length > 0) {
        await client.query("INSERT INTO topic_subject (topic_id, subject_code) VALUES ($1, $2) ON CONFLICT DO NOTHING", [id, code.trim().toUpperCase()]);
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
