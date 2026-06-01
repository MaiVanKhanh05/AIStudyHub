import * as documentRepository from "../repositories/document.repository.js";
import * as tagRepository from "../repositories/tag.repository.js";
import * as subjectRepository from "../repositories/subject.repository.js";

// Retrieve dashboard aggregates: user documents and total storage consumption
export const getDashboardData = async (userId) => {
    try {
        let documents = await documentRepository.getUserDocuments(userId);
        const storageUsage = await documentRepository.getStorageUsage(userId);

        // Fallback mock documents to keep the workspace visually complete if the DB is empty
        if (documents.length === 0) {
            documents = [
                {
                    document_id: "demo1",
                    title: "Web Design_Thiết kế web nâng cao",
                    subject_code: "WED202c",
                    subject_name: "Web Design",
                    owner_name: "ThongNT",
                    upload_date: new Date(Date.now() - 24 * 60 * 60 * 1000 * 60), // 2 months ago
                    file_size: 10240, // 10KB
                    file_type: "PDF",
                    visibility: "PUBLIC",
                },
                {
                    document_id: "demo2",
                    title: "WED202c - Web design tutorial & layouts",
                    subject_code: "WED202c",
                    subject_name: "Web Design",
                    owner_name: "ThongNT",
                    upload_date: new Date(Date.now() - 24 * 60 * 60 * 1000 * 45), // 1.5 months ago
                    file_size: 10240,
                    file_type: "PDF",
                    visibility: "PUBLIC",
                },
                {
                    document_id: "demo3",
                    title: "Web Design Principles and UI UX Guidelines",
                    subject_code: "WED202c",
                    subject_name: "Web Design",
                    owner_name: "ThongNT",
                    upload_date: new Date(Date.now() - 24 * 60 * 60 * 1000 * 30), // 1 month ago
                    file_size: 10240,
                    file_type: "PDF",
                    visibility: "PRIVATE",
                }
            ];
        }

        return {
            documents,
            storageUsage, // in bytes
        };
    } catch (error) {
        throw error;
    }
};

// Create new document file entry
export const uploadNewDocument = async (docData) => {
    try {
        const { tags, ...restDocData } = docData;

        // Auto-resolve or create subject_code if provided to avoid foreign key violations
        const subjectCode = restDocData.subject_code || restDocData.subject;
        if (subjectCode) {
            const resolvedSubject = await subjectRepository.getOrCreateSubject(subjectCode);
            if (resolvedSubject) {
                restDocData.subject_code = resolvedSubject.subject_code;
            } else {
                restDocData.subject_code = null;
            }
        } else {
            restDocData.subject_code = null;
        }
        if (restDocData.subject !== undefined) {
            delete restDocData.subject;
        }

        // Auto-rename if title already exists in the system
        restDocData.title = await documentRepository.getUniqueTitle(restDocData.title);

        const newDoc = await documentRepository.createDocument(restDocData);

        if (newDoc) {
            const tagList = tags && Array.isArray(tags) ? tags : [];
            const resolvedTags = [];
            const tagIds = [];

            for (const tagName of tagList) {
                const tagObj = await tagRepository.getOrCreateTag(tagName);
                if (tagObj) {
                    tagIds.push(tagObj.tag_id);
                    resolvedTags.push(tagObj);
                }
            }

            if (tagIds.length > 0) {
                await tagRepository.associateTagsWithDocument(newDoc.document_id, tagIds);
            }

            newDoc.tags = resolvedTags;
        }

        return newDoc;
    } catch (error) {
        throw error;
    }
};

// Delete document from repository
export const deleteUserDocument = async (id, userId) => {
    try {
        return await documentRepository.deleteDocument(id, userId);
    } catch (error) {
        throw error;
    }
};

// Increment view count
export const incrementViewCount = async (id) => {
    try {
        return await documentRepository.incrementViewCount(id);
    } catch (error) {
        throw error;
    }
};

// Increment download count
export const incrementDownloadCount = async (id) => {
    try {
        return await documentRepository.incrementDownloadCount(id);
    } catch (error) {
        throw error;
    }
};
