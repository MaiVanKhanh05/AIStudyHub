import * as semesterRepository from "../repositories/semester.repository.js";

// Lấy danh sách toàn bộ Semester
export const getAdminSemesters = async (req, res) => {
    try {
        const semesters = await semesterRepository.getSemestersWithSubjects();
        return res.json(semesters);
    } catch (err) {
        console.error("[Admin Semesters] Error:", err);
        return res.status(500).json({ error: "Internal server error" });
    }
};

// Tạo Semester mới
export const createAdminSemester = async (req, res) => {
    try {
        const { name, description } = req.body;
        if (!name) return res.status(400).json({ error: "Name is required" });
        const semester = await semesterRepository.createSemester({ name, description });
        return res.json(semester);
    } catch (err) {
        console.error("[Admin Semesters] Error:", err);
        return res.status(500).json({ error: "Internal server error" });
    }
};

// Cập nhật Semester
export const updateAdminSemester = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, description } = req.body;
        const semester = await semesterRepository.updateSemester(id, { name, description });
        return res.json(semester);
    } catch (err) {
        console.error("[Admin Semesters] Error:", err);
        return res.status(500).json({ error: "Internal server error" });
    }
};

// Xóa Semester
export const deleteAdminSemester = async (req, res) => {
    try {
        const { id } = req.params;
        await semesterRepository.deleteSemester(id);
        return res.json({ success: true });
    } catch (err) {
        console.error("[Admin Semesters] Error:", err);
        return res.status(500).json({ error: "Internal server error" });
    }
};

// Cập nhật danh sách môn học cho Semester
export const assignSubjectsToSemester = async (req, res) => {
    try {
        const { id } = req.params;
        const { subjects } = req.body;
        if (!Array.isArray(subjects)) return res.status(400).json({ error: "Subjects must be an array" });
        await semesterRepository.assignSubjectsToSemester(id, subjects);
        return res.json({ success: true });
    } catch (err) {
        console.error("[Admin Semesters] Error:", err);
        return res.status(500).json({ error: "Internal server error" });
    }
};
