import * as tagRepository from "../repositories/tag.repository.js";

export const getSubjectTags = async (req, res) => {
    try {
        const { subject_code } = req.params;
        if (!subject_code) {
            return res.status(400).json({ error: "subject_code is required" });
        }
        const tags = await tagRepository.getTagsBySubject(subject_code);
        return res.json(tags);
    } catch (error) {
        console.error("Error in getSubjectTags controller:", error);
        return res.status(500).json({ error: "Failed to get tags for subject" });
    }
};

export const searchTags = async (req, res) => {
    try {
        const { q } = req.query;
        const tags = await tagRepository.searchTags(q || "");
        return res.json(tags);
    } catch (error) {
        console.error("Error in searchTags controller:", error);
        return res.status(500).json({ error: "Failed to search tags" });
    }
};

export const createTag = async (req, res) => {
    try {
        const { tag_name } = req.body;
        if (!tag_name) {
            return res.status(400).json({ error: "tag_name is required" });
        }
        const tag = await tagRepository.getOrCreateTag(tag_name);
        return res.status(201).json(tag);
    } catch (error) {
        console.error("Error in createTag controller:", error);
        return res.status(500).json({ error: "Failed to create tag" });
    }
};
