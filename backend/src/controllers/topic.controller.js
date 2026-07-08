import * as topicRepository from "../repositories/topic.repository.js";
import * as subjectRepository from "../repositories/subject.repository.js";
import { generateTopicsFromSubjects } from "../services/ai/ai.service.js";

const CACHE_TTL_HOURS = 24;

/**
 * GET /api/topics
 * Returns topics with subject lists. Auto-generates via AI if cache is stale.
 */
export const getTopics = async (req, res) => {
    try {
        const topics = await topicRepository.getTopicsWithSubjects();
        return res.json(topics);
    } catch (error) {
        console.error("[Topics] Error in getTopics:", error);
        return res.status(500).json({ error: "Không thể tải danh sách chủ đề" });
    }
};

/**
 * POST /api/topics/regenerate (Admin only)
 * Force AI to regenerate all topics ignoring cache.
 */
export const regenerateTopics = async (req, res) => {
    try {
        const subjects = await subjectRepository.getAllSubjects();
        if (subjects.length === 0) {
            return res.json({ message: "Không có môn học nào để phân loại.", topics: [] });
        }

        const aiTopics = await generateTopicsFromSubjects(subjects);
        await topicRepository.clearAndRebuildTopics(aiTopics);
        const topics = await topicRepository.getTopicsWithSubjects();

        return res.json({ message: `Đã tạo lại ${topics.length} chủ đề.`, topics });
    } catch (error) {
        console.error("[Topics] Error in regenerateTopics:", error);
        return res.status(500).json({ error: "Không thể tạo lại chủ đề: " + error.message });
    }
};
