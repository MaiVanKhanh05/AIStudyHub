import * as subjectRepository from "../repositories/subject.repository.js";

// GET /api/subjects - Get all subjects or search by query
export const getSubjects = async (req, res) => {
    try {
        const { q } = req.query;
        let subjects;
        if (q) {
            subjects = await subjectRepository.searchSubjects(q);
        } else {
            subjects = await subjectRepository.getAllSubjects();
        }
        return res.json(subjects);
    } catch (error) {
        console.error("Error in getSubjects controller:", error);
        return res.status(500).json({ error: "Failed to load subjects" });
    }
};
