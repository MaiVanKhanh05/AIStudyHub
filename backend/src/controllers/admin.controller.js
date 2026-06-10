
import pool from "../../DB/db.js";

// GET /api/admin/stats — tổng hợp số liệu dashboard
export const getAdminStats = async (req, res) => {
    try {
        const [studentsResult, lecturersResult, documentsResult, storageResult] = await Promise.all([
            // Tổng sinh viên
            pool.query(
                "SELECT COUNT(*) AS count FROM users WHERE role = 'STUDENT' AND status = 'ACTIVE'"
            ),
            // Tổng giảng viên
            pool.query(
                "SELECT COUNT(*) AS count FROM users WHERE role = 'LECTURER' AND status = 'ACTIVE'"
            ),
            // Tổng tài liệu
            pool.query(
                "SELECT COUNT(*) AS count FROM document"
            ),
            // Tổng dung lượng (bytes)
            pool.query(
                "SELECT COALESCE(SUM(file_size), 0) AS total FROM document"
            ),
        ]);

        const totalStudents  = parseInt(studentsResult.rows[0].count, 10);
        const totalLecturers = parseInt(lecturersResult.rows[0].count, 10);
        const totalDocuments = parseInt(documentsResult.rows[0].count, 10);
        const totalStorageBytes = parseInt(storageResult.rows[0].total, 10);
        const totalStorageGB = (totalStorageBytes / (1024 ** 3)).toFixed(2);

        res.json({
            totalStudents,
            totalLecturers,
            totalDocuments,
            totalStorageUsed: parseFloat(totalStorageGB),
            totalStorageLimit: 10,
        });
    } catch (error) {
        console.error("Error fetching admin stats:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
};

// GET /api/admin/users — danh sách tất cả người dùng
export const getAllUsers = async (req, res) => {
    try {
        const { rows } = await pool.query(
            `SELECT 
                u.user_id AS id, 
                (u.last_name || ' ' || u.first_name) AS full_name, 
                u.email, 
                u.role, 
                u.status, 
                u.created_at,
                u.max_storage_bytes,
                COALESCE(SUM(d.file_size), 0) AS used_storage
             FROM users u
             LEFT JOIN document d ON u.user_id = d.user_id
             GROUP BY u.user_id, u.last_name, u.first_name, u.email, u.role, u.status, u.created_at, u.max_storage_bytes
             ORDER BY u.created_at DESC`
        );
        res.json(rows);
    } catch (error) {
        console.error("Error fetching all users:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
};

// POST /api/admin/users/:id/lock — khóa tài khoản (BR-AM-03, BR-AM-06)
export const lockUser = async (req, res) => {
    try {
        const { id } = req.params;
        const adminId = req.userId; // được set bởi authenticateToken middleware

        // Không thể khóa chính mình
        if (String(adminId) === String(id)) {
            return res.status(400).json({ error: "Bạn không thể khóa tài khoản của chính mình" });
        }

        // Kiểm tra target user tồn tại
        const { rows: targetRows } = await pool.query(
            "SELECT user_id, role, status, email FROM users WHERE user_id = $1",
            [id]
        );
        if (targetRows.length === 0) {
            return res.status(404).json({ error: "Người dùng không tồn tại" });
        }
        const target = targetRows[0];

        // Không thể khóa admin khác
        if (target.role === "ADMIN") {
            return res.status(400).json({ error: "Không thể khóa tài khoản Admin" });
        }

        // Đã bị khóa rồi
        if (target.status === "LOCKED") {
            return res.status(400).json({ error: "Tài khoản này đã được khóa từ trước" });
        }

        await pool.query(
            "UPDATE users SET status = 'LOCKED', updated_at = NOW() WHERE user_id = $1",
            [id]
        );
        res.json({ message: "Tài khoản đã bị khóa", userId: id, status: "LOCKED" });
    } catch (error) {
        console.error("Error locking user:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
};

// POST /api/admin/users/:id/unlock — mở khóa tài khoản (BR-AM-03)
export const unlockUser = async (req, res) => {
    try {
        const { id } = req.params;

        // Kiểm tra target user tồn tại
        const { rows: targetRows } = await pool.query(
            "SELECT user_id, status, email FROM users WHERE user_id = $1",
            [id]
        );
        if (targetRows.length === 0) {
            return res.status(404).json({ error: "Người dùng không tồn tại" });
        }
        const target = targetRows[0];

        // Chỉ mở khóa nếu đang LOCKED
        if (target.status !== "LOCKED") {
            return res.status(400).json({ error: "Tài khoản này không ở trạng thái bị khóa" });
        }

        await pool.query(
            "UPDATE users SET status = 'ACTIVE', updated_at = NOW() WHERE user_id = $1",
            [id]
        );
        res.json({ message: "Tài khoản đã được mở khóa", userId: id, status: "ACTIVE" });
    } catch (error) {
        console.error("Error unlocking user:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
};

// GET /api/admin/documents — danh sách tài liệu (BR-AM-07)
export const getAllDocuments = async (req, res) => {
    try {
        const { rows } = await pool.query(
            `SELECT d.document_id AS id, d.title, d.file_size AS size,
                    d.file_type AS type, d.upload_status AS status,
                    d.upload_date AS "uploadedAt",
                    u.email AS uploader
             FROM document d
             JOIN users u ON d.user_id = u.user_id
             ORDER BY d.upload_date DESC`
        );
        res.json(rows);
    } catch (error) {
        console.error("Error fetching documents:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
};

// DELETE /api/admin/documents/:id — xóa tài liệu vi phạm (BR-AM-07)
export const deleteDocument = async (req, res) => {
    try {
        const { id } = req.params;
        await pool.query("DELETE FROM document WHERE document_id = $1", [id]);
        res.json({ message: "Tài liệu đã bị xóa" });
    } catch (error) {
        console.error("Error deleting document:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
};

// GET /api/admin/popular-documents — Top 10 tài liệu phổ biến nhất
export const getPopularDocuments = async (req, res) => {
    try {
        const { rows } = await pool.query(
            `SELECT d.document_id, d.title, d.views, d.downloads, (d.views + d.downloads) AS popularity, d.upload_date, u.email AS uploader, d.subject_code
             FROM document d
             JOIN users u ON d.user_id = u.user_id
             ORDER BY popularity DESC, d.views DESC, d.downloads DESC
             LIMIT 10`
        );
        res.json(rows);
    } catch (error) {
        console.error("Error fetching popular documents:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
};

