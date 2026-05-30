import * as documentRepository from "../repositories/document.repository.js";

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
        const newDoc = await documentRepository.createDocument(docData);
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
