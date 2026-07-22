import * as topicRepository from "../repositories/topic.repository.js";
import * as subjectRepository from "../repositories/subject.repository.js";

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

