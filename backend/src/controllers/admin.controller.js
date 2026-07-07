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

        const totalStudents = parseInt(studentsResult.rows[0].count, 10);
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
        const { rows } = await pool.query("SELECT user_id, file_size FROM document WHERE document_id = $1", [id]);
        const doc = rows[0];

        await pool.query("DELETE FROM document WHERE document_id = $1", [id]);

        if (doc) {
            await pool.query(
                "UPDATE users SET used_storage = GREATEST(COALESCE(used_storage, 0) - $1, 0) WHERE user_id = $2",
                [doc.file_size, doc.user_id]
            );
        }
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

// GET /api/admin/analytics — Xu hướng đăng ký user & upload tài liệu theo chuỗi thời gian
export const getAnalyticsData = async (req, res) => {
    try {
        const days = parseInt(req.query.days, 10) || 30;

        // Xu hướng đăng ký user theo ngày
        const userTrendsResult = await pool.query(
            `SELECT 
                d.date::date AS date,
                COALESCE(COUNT(u.user_id), 0) AS new_users,
                COALESCE(SUM(CASE WHEN u.role = 'STUDENT' THEN 1 ELSE 0 END), 0) AS new_students,
                COALESCE(SUM(CASE WHEN u.role = 'LECTURER' THEN 1 ELSE 0 END), 0) AS new_lecturers
             FROM generate_series(CURRENT_DATE - ($1 || ' days')::interval, CURRENT_DATE, '1 day') AS d(date)
             LEFT JOIN users u ON DATE(u.created_at) = d.date
             GROUP BY d.date
             ORDER BY d.date ASC`,
            [days]
        );

        // Xu hướng tài liệu (upload, views, downloads) theo ngày
        const docTrendsResult = await pool.query(
            `SELECT 
                d.date::date AS date,
                COALESCE(COUNT(doc.document_id), 0) AS uploads,
                COALESCE(SUM(doc.views), 0) AS views,
                COALESCE(SUM(doc.downloads), 0) AS downloads
             FROM generate_series(CURRENT_DATE - ($1 || ' days')::interval, CURRENT_DATE, '1 day') AS d(date)
             LEFT JOIN document doc ON DATE(doc.upload_date) = d.date
             GROUP BY d.date
             ORDER BY d.date ASC`,
            [days]
        );

        res.json({
            userTrends: userTrendsResult.rows,
            documentTrends: docTrendsResult.rows,
        });
    } catch (error) {
        console.error("Error fetching analytics data:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
};

// GET /api/admin/hot-docs
export const getHotDocs = async (req, res) => {
    try {
        const docs = await hotDocRepository.getHotDocuments(20);
        res.json(docs);
    } catch (error) {
        console.error("Error fetching hot docs:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
};

// GET /api/admin/lecturers
export const getLecturers = async (req, res) => {
    try {
        const lecturers = await hotDocRepository.getAllLecturers();
        res.json(lecturers);
    } catch (error) {
        console.error("Error fetching lecturers:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
};

// GET /api/admin/storage-distribution — Phân bổ tài liệu theo loại file & môn học
export const getStorageDistribution = async (req, res) => {
    try {
        const fileTypeResult = await pool.query(
            `SELECT 
                UPPER(COALESCE(NULLIF(file_type, ''), 'OTHER')) AS type,
                COUNT(*) AS count,
                COALESCE(SUM(file_size), 0) AS size_bytes
             FROM document
             GROUP BY UPPER(COALESCE(NULLIF(file_type, ''), 'OTHER'))
             ORDER BY count DESC`
        );

        const subjectResult = await pool.query(
            `SELECT 
                COALESCE(s.subject_name, 'Khác') AS subject_name,
                COALESCE(d.subject_code, 'OTHER') AS subject_code,
                COUNT(*) AS count,
                COALESCE(SUM(d.file_size), 0) AS size_bytes
             FROM document d
             LEFT JOIN subject s ON d.subject_code = s.subject_code
             GROUP BY d.subject_code, s.subject_name
             ORDER BY count DESC
             LIMIT 8`
        );

        res.json({
            fileTypes: fileTypeResult.rows,
            subjects: subjectResult.rows,
        });
    } catch (error) {
        console.error("Error fetching storage distribution:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
};

// POST /api/admin/hot-docs/:id/send-review
export const sendHotDocReview = async (req, res) => {
    try {
        const adminId = req.userId;
        const documentId = req.params.id;
        const { reviewerId } = req.body;

        if (!reviewerId) {
            return res.status(400).json({ error: "Vui lòng chọn giảng viên để gửi duyệt." });
        }

        const review = await hotDocRepository.createHotDocReview(documentId, adminId, reviewerId);

        // Notify lecturer
        const { createNotification } = await import("../repositories/notification.repository.js");
        const { getDocumentById } = await import("../repositories/document.repository.js");
        const doc = await getDocumentById(documentId);
        const docTitle = doc ? doc.title : "Tài liệu";

        await createNotification({
            userId: reviewerId,
            senderId: adminId,
            type: "SYSTEM_ALERT",
            documentId,
            message: `Admin đã yêu cầu bạn duyệt tài liệu hot: "${docTitle}". Hãy kiểm tra danh sách chờ duyệt.`
        });

        res.json({ message: "Đã gửi yêu cầu duyệt thành công.", review });
    } catch (error) {
        console.error("Error sending hot doc review:", error);
        if (error.message.includes("đã có yêu cầu duyệt")) {
            return res.status(400).json({ error: error.message });
        }
        res.status(500).json({ error: "Internal Server Error" });
    }
};


export const getApiUsage = async (req, res) => {
    try {
        const days = Math.min(parseInt(req.query.days, 10) || 14, 30);
        const apiKey = process.env.OPENAI_ADMIN_KEY;

        if (!apiKey) {
            return res.status(403).json({ 
                error: "NO_API_KEY", 
                message: "Không tìm thấy API Key (Admin) trong cấu hình hệ thống."
            });
        }

        const endTime = Math.floor(Date.now() / 1000);
        const startTime = endTime - (days * 86400);

        const headers = { "Authorization": `Bearer ${apiKey}` };

        const [costRes, usageRes] = await Promise.all([
            fetch(`https://api.openai.com/v1/organization/costs?start_time=${startTime}&end_time=${endTime}&limit=31`, { headers }),
            fetch(`https://api.openai.com/v1/organization/usage/completions?start_time=${startTime}&end_time=${endTime}&limit=31`, { headers })
        ]);

        if (!costRes.ok || !usageRes.ok) {
            const errBody = await costRes.json().catch(() => ({}));
            const errMsg = (errBody.error?.message || '').toLowerCase();
            console.error("OpenAI Admin API Error:", errBody);
            if (costRes.status === 403 || costRes.status === 401 || errMsg.includes("permission") || errMsg.includes("scope") || errMsg.includes("session")) {
                return res.status(403).json({ 
                    error: "PERMISSION_DENIED", 
                    message: "API Key thiếu quyền truy cập Organization/Admin APIs."
                });
            }
            throw new Error(`OpenAI API Error: Costs=${costRes.status}, Usage=${usageRes.status}`);
        }

        const costData = await costRes.json();
        const usageData = await usageRes.json();

        const dailyCostsMap = new Map();
        if (costData.data) {
            costData.data.forEach(bucket => {
                const dateStr = bucket.start_time_iso.split('T')[0];
                let cost = 0;
                bucket.results.forEach(res => {
                    cost += parseFloat(res.amount.value || 0);
                });
                dailyCostsMap.set(dateStr, cost);
            });
        }

        const usageMap = new Map();
        if (usageData.data) {
            usageData.data.forEach(bucket => {
                const dateStr = bucket.start_time_iso.split('T')[0];
                let requests = 0;
                let tokens = 0;
                bucket.results.forEach(res => {
                    requests += res.num_model_requests || 0;
                    tokens += (res.input_tokens || 0) + (res.output_tokens || 0);
                });
                usageMap.set(dateStr, { requests, tokens });
            });
        }

        let totalSpend = 0;
        const apiData = [];
        for (let i = days - 1; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            const dateStr = date.toISOString().split('T')[0];
            const cost = dailyCostsMap.get(dateStr) || 0;
            const usage = usageMap.get(dateStr) || { requests: 0, tokens: 0 };
            
            totalSpend += cost;
            apiData.push({
                date: dateStr,
                cost: parseFloat(cost.toFixed(4)),
                requests: usage.requests,
                tokens: usage.tokens
            });
        }

        res.json({
            apiData,
            totalSpend: parseFloat(totalSpend.toFixed(4))
        });

    } catch (error) {
        console.error("Error fetching API usage:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
};

