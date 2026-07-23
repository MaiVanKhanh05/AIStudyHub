import * as subjectRepository from "../repositories/subject.repository.js";

// GET /api/subjects/doc-counts - Get all subjects that have public documents (public, no auth)
export const getSubjectsWithDocCounts = async (req, res) => {
    try {
        const subjects = await subjectRepository.getSubjectsWithDocCounts();
        return res.json(subjects);
    } catch (error) {
        console.error("Error in getSubjectsWithDocCounts controller:", error);
        return res.status(500).json({ error: "Failed to load subject doc counts" });
    }
};

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

// POST /api/subjects - Create a new subject
export const createSubject = async (req, res) => {
    try {
        const { subject_code, subject_name } = req.body;
        if (!subject_code || !subject_name) {
            return res.status(400).json({ error: "Missing subject_code or subject_name" });
        }
        
        // getOrCreateSubject will create it or return the existing one.
        // We can check if it already existed by a separate query, but getOrCreateSubject is fine.
        const code = subject_code.trim().toUpperCase();
        const existing = await subjectRepository.searchSubjects(code);
        const exactMatch = existing.find(s => s.subject_code.toUpperCase() === code);
        
        if (exactMatch) {
            return res.status(409).json({ error: "Subject code already exists" });
        }

        const newSubject = await subjectRepository.getOrCreateSubject(code, subject_name);
        return res.status(201).json(newSubject);
    } catch (error) {
        console.error("Error in createSubject controller:", error);
        return res.status(500).json({ error: "Failed to create subject" });
    }
};

// PUT /api/subjects/:code - Update a subject
export const updateSubject = async (req, res) => {
    try {
        const { code } = req.params;
        const { subject_name } = req.body;
        
        if (!subject_name) {
            return res.status(400).json({ error: "Missing subject_name" });
        }

        const updatedSubject = await subjectRepository.updateSubject(code, subject_name);
        if (!updatedSubject) {
            return res.status(404).json({ error: "Subject not found" });
        }
        
        return res.json(updatedSubject);
    } catch (error) {
        console.error("Error in updateSubject controller:", error);
        return res.status(500).json({ error: "Failed to update subject" });
    }
};

// DELETE /api/subjects/:code - Delete a subject
export const deleteSubject = async (req, res) => {
    try {
        const { code } = req.params;
        
        const deleted = await subjectRepository.deleteSubject(code);
        if (!deleted) {
            return res.status(404).json({ error: "Subject not found" });
        }
        
        return res.json({ message: "Subject deleted successfully" });
    } catch (error) {
        console.error("Error in deleteSubject controller:", error);
        return res.status(400).json({ error: error.message || "Failed to delete subject" });
    }
};
