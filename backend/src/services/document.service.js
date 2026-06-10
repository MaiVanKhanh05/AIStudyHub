import * as documentRepository from "../repositories/document.repository.js";
import * as tagRepository from "../repositories/tag.repository.js";
import * as subjectRepository from "../repositories/subject.repository.js";
import { processDocumentInBackground } from "./ai/documentProcessor.service.js";


// Retrieve dashboard aggregates: user documents and total storage consumption
export const getDashboardData = async (userId) => {
    try {
        let documents = [];
        let storageUsage = 0;

        try {
            documents = await documentRepository.getUserDocuments(userId);
            storageUsage = await documentRepository.getStorageUsage(userId);
        } catch (dbError) {
            console.error("Database query error, using fallback mock documents:", dbError);
            // Fallback to empty documents if database fails
            documents = [];
        }

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

// Retrieve all public community documents
export const getCommunityDocs = async (userId = null) => {
    try {
        return await documentRepository.getCommunityDocuments(userId);
    } catch (error) {
        throw error;
    }
};

export const shareDocument = async (documentId, userId, description) => {
    try {
        return await documentRepository.updateDocumentVisibility(documentId, userId, 'PUBLIC', description);
    } catch (error) {
        throw error;
    }
};

// Create new document file entry
export const uploadNewDocument = async (docData) => {
    try {
        const { tags, ...restDocData } = docData;

        // Auto-resolve or create subject_code if provided to avoid foreign key violations
        let subjectCode = restDocData.subject_code || restDocData.subject;
        if (!subjectCode || subjectCode === "Chọn môn học") {
            subjectCode = "OTHER";
        }
        
        const resolvedSubject = await subjectRepository.getOrCreateSubject(subjectCode, "Other Subject");
        if (resolvedSubject) {
            restDocData.subject_code = resolvedSubject.subject_code;
        } else {
            restDocData.subject_code = "OTHER";
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
            // Trigger AI RAG Pipeline processing in background (Do not await!)
            processDocumentInBackground(newDoc).catch(err => {
                console.error("[Background Error] RAG Pipeline failed:", err);
            });

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

export const getDocumentById = async (id) => {
    try {
        return await documentRepository.getDocumentById(id);
    } catch (error) {
        throw error;
    }
};

export const editDocument = async (id, userId, { title, subject, tags, description }) => {
    try {
        let subjectCode = "OTHER";
        if (subject && subject.trim() !== "") {
            const subjCodeStr = subject.trim().toUpperCase();
            const subjectObj = await subjectRepository.getOrCreateSubject(subjCodeStr, subjCodeStr);
            if (subjectObj) {
                subjectCode = subjectObj.subject_code;
            }
        }
        
        // Ensure "OTHER" exists if we fallback to it
        if (subjectCode === "OTHER") {
            await subjectRepository.getOrCreateSubject("OTHER", "OTHER");
        }

        const updatedDoc = await documentRepository.updateDocumentMeta(id, userId, { title, subject_code: subjectCode, description });
        if (!updatedDoc) {
            throw new Error("Document not found or unauthorized");
        }

        const tagList = tags && Array.isArray(tags) ? tags : [];
        const tagIds = [];
        const resolvedTags = [];

        for (const tagName of tagList) {
            const tagObj = await tagRepository.getOrCreateTag(tagName);
            if (tagObj) {
                tagIds.push(tagObj.tag_id);
                resolvedTags.push(tagObj);
            }
        }

        await documentRepository.replaceDocumentTags(id, tagIds);
        updatedDoc.tags = resolvedTags;

        return updatedDoc;
    } catch (error) {
        throw error;
    }
};

export const toggleBookmark = async (userId, documentId) => {
    try {
        return await documentRepository.toggleBookmark(userId, documentId);
    } catch (error) {
        console.error("Error toggling bookmark in service:", error);
        throw error;
    }
};

export const getBookmarkedDocuments = async (userId) => {
    try {
        return await documentRepository.getBookmarkedDocuments(userId);
    } catch (error) {
        console.error("Error fetching bookmarked documents in service:", error);
        throw error;
    }
};
export const getAllDocuments = async () => {
    try {
        return await documentRepository.getAllDocuments();
    } catch (error) {
        throw error;
    }
};

