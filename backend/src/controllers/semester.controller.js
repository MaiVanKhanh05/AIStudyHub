import * as semesterRepository from "../repositories/semester.repository.js";

// Lấy danh sách toàn bộ Semester cho Frontend client
export const getSemesters = async (req, res) => {
    try {
        const semesters = await semesterRepository.getSemestersWithSubjects();
        return res.json(semesters);
    } catch (err) {
        console.error("[Semesters] Error:", err);
        return res.status(500).json({ error: "Internal server error" });
    }
};
