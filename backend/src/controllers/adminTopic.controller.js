import * as topicRepository from "../repositories/topic.repository.js";

// Lấy danh sách toàn bộ Topic
export const getAdminTopics = async (req, res) => {
    try {
        const topics = await topicRepository.getTopicsWithSubjects();
        return res.json(topics);
    } catch (err) {
        console.error("[Admin Topics] Error:", err);
        return res.status(500).json({ error: "Internal server error" });
    }
};

// Tạo Topic mới
export const createAdminTopic = async (req, res) => {
    try {
        const { name, description, icon, color } = req.body;
        if (!name) return res.status(400).json({ error: "Name is required" });
        const topic = await topicRepository.createTopic({ name, description, icon, color });
        return res.json(topic);
    } catch (err) {
        console.error("[Admin Topics] Error:", err);
        return res.status(500).json({ error: "Internal server error" });
    }
};

// Cập nhật Topic
export const updateAdminTopic = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, description, icon, color } = req.body;
        const topic = await topicRepository.updateTopic(id, { name, description, icon, color });
        return res.json(topic);
    } catch (err) {
        console.error("[Admin Topics] Error:", err);
        return res.status(500).json({ error: "Internal server error" });
    }
};

// Xóa Topic
export const deleteAdminTopic = async (req, res) => {
    try {
        const { id } = req.params;
        await topicRepository.deleteTopic(id);
        return res.json({ success: true });
    } catch (err) {
        console.error("[Admin Topics] Error:", err);
        return res.status(500).json({ error: "Internal server error" });
    }
};

// Cập nhật danh sách môn học cho Topic
export const assignSubjectsToTopic = async (req, res) => {
    try {
        const { id } = req.params;
        const { subjects } = req.body;
        if (!Array.isArray(subjects)) return res.status(400).json({ error: "Subjects must be an array" });
        await topicRepository.assignSubjectsToTopic(id, subjects);
        return res.json({ success: true });
    } catch (err) {
        console.error("[Admin Topics] Error:", err);
        return res.status(500).json({ error: "Internal server error" });
    }
};
