/**
 * Retrieval Strategy Router & Validator
 * Pattern: Strategy
 */
import { getCommunityDocumentCatalog } from "../../repositories/document.repository.js";
import { searchVectorDB, initOpenAI } from "../ai/chat.service.js";
import { getTemporaryDocument } from "./tempDocumentStore.service.js";

// Helper: Tính Cosine Similarity trong Javascript
function cosineSimilarity(vecA, vecB) {
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    for (let i = 0; i < vecA.length; i++) {
        dotProduct += vecA[i] * vecB[i];
        normA += vecA[i] * vecA[i];
        normB += vecB[i] * vecB[i];
    }
    if (normA === 0 || normB === 0) return 0;
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

class GlobalStrategy {
    async retrieve(rewrittenQuery, intent, entities, sourceData, aiClient) {
        let keywordDocs = [];
        let vectorChunks = [];
        const allCommunityDocs = await getCommunityDocumentCatalog();

        // 1. Keyword / Metadata Search
        const lowerQuery = rewrittenQuery.toLowerCase();
        
        // Tokenize query to match sub-strings (e.g. "swt" inside "swt301")
        const queryTokens = lowerQuery
            .replace(/(tìm|tài liệu|file|đề|về|cho|xin|môn|học)/g, ' ')
            .split(/\s+/)
            .filter(t => t.length > 1);

        allCommunityDocs.forEach(d => {
            let score = 0;
            const subjectCode = (d.subject_code || '').toLowerCase();
            const subject = (d.subject_name || '').toLowerCase();
            
            entities.forEach(entity => {
                const eLower = entity.toLowerCase();
                if (subjectCode && subjectCode.includes(eLower)) score += 50;
                if (subject && subject.includes(eLower)) score += 30;
            });
            
            if (subjectCode && lowerQuery.includes(subjectCode)) score += 20;

            queryTokens.forEach(token => {
                if (subjectCode && subjectCode.includes(token)) score += 40;
                if (subject && subject.includes(token)) score += 20;
            });

            if (score > 0) keywordDocs.push({ doc: d, score });
        });

        // 2. Vector Search
        if (aiClient) {
            const embedResponse = await aiClient.embeddings.create({
                model: "text-embedding-3-small",
                input: rewrittenQuery.slice(-2000),
            });
            vectorChunks = await searchVectorDB(embedResponse.data[0].embedding, 6);
        }

        keywordDocs.sort((a, b) => b.score - a.score);
        return { keywordDocs: keywordDocs.slice(0, 4), vectorChunks };
    }
}

class SystemStrategy {
    async retrieve(rewrittenQuery, intent, entities, sourceData, aiClient) {
        let vectorChunks = [];
        if (aiClient && sourceData.sourceId) {
            const embedResponse = await aiClient.embeddings.create({
                model: "text-embedding-3-small",
                input: rewrittenQuery.slice(-2000),
            });
            // Filter vector DB by documentId
            vectorChunks = await searchVectorDB(embedResponse.data[0].embedding, 6, sourceData.sourceId);
        }
        return { keywordDocs: [], vectorChunks };
    }
}

class UploadedStrategy {
    async retrieve(rewrittenQuery, intent, entities, sourceData, aiClient) {
        let vectorChunks = [];
        let allTempDocs = [];
        
        // Lấy tất cả các tempDocs dựa trên danh sách sourceIds
        if (sourceData.sourceIds && sourceData.sourceIds.length > 0) {
            for (const id of sourceData.sourceIds) {
                const doc = getTemporaryDocument(sourceData.sessionId, id);
                if (doc) allTempDocs.push(doc);
            }
        } else if (sourceData.sourceId) {
            const doc = getTemporaryDocument(sourceData.sessionId, sourceData.sourceId);
            if (doc) allTempDocs.push(doc);
        }

        if (allTempDocs.length > 0 && aiClient) {
            const embedResponse = await aiClient.embeddings.create({
                model: "text-embedding-3-small",
                input: rewrittenQuery.slice(-2000),
            });
            const queryVector = embedResponse.data[0].embedding;
            
            // Tính toán cosine similarity in-memory cho tất cả các chunks của tất cả các file
            let allScoredChunks = [];
            for (const tempDoc of allTempDocs) {
                const scoredChunks = tempDoc.chunks.map(chunk => {
                    const similarity = cosineSimilarity(queryVector, chunk.embedding);
                    return { chunk_text: chunk.text, document_id: tempDoc.id, similarity };
                });
                allScoredChunks = allScoredChunks.concat(scoredChunks);
            }

            // Lọc và lấy top 6
            vectorChunks = allScoredChunks
                .filter(c => c.similarity > 0.35)
                .sort((a, b) => b.similarity - a.similarity)
                .slice(0, 6);
        }
        return { keywordDocs: [], vectorChunks, allTempDocs };
    }
}

const strategies = {
    "GLOBAL_CHAT": new GlobalStrategy(),
    "SYSTEM_DOCUMENT": new SystemStrategy(),
    "UPLOADED_DOCUMENT": new UploadedStrategy()
};

/**
 * Validate chunks strictly against the Source Scope
 */
function validateScope(chunks, sourceData) {
    if (sourceData.sourceType === "GLOBAL_CHAT") {
        return chunks; // Cho phép tất cả từ Vector DB
    }
    
    // Hỗ trợ kiểm tra mảng sourceIds
    if (sourceData.sourceIds && sourceData.sourceIds.length > 0) {
        return chunks.filter(c => sourceData.sourceIds.includes(String(c.document_id)));
    }
    
    return chunks.filter(c => String(c.document_id) === String(sourceData.sourceId));
}

/**
 * Strategy Router for Context Retrieval
 */
export async function retrieveContext(rewrittenQuery, intent, entities, sourceData) {
    const result = {
        documents: [],
        chunks: [],
        sources: [],
        retrievalMethod: "none",
        fallbackUsed: false,
        confidence: 0.0
    };

    if (["GENERAL_CHAT", "FOLLOW_UP", "CLARIFICATION"].includes(intent) && entities.length === 0) {
        return result;
    }

    try {
        const aiClient = initOpenAI();
        const strategy = strategies[sourceData.sourceType] || strategies["GLOBAL_CHAT"];
        
        const { keywordDocs, vectorChunks } = await strategy.retrieve(rewrittenQuery, intent, entities, sourceData, aiClient);

        // Validation Scope
        const validChunks = validateScope(vectorChunks, sourceData);

        if (sourceData.sourceType === "UPLOADED_DOCUMENT") {
            // Lấy từ allTempDocs trả về bởi strategy
            const { allTempDocs } = await strategy.retrieve(rewrittenQuery, intent, entities, sourceData, aiClient);
            if (allTempDocs && allTempDocs.length > 0) {
                result.documents = allTempDocs;
            }
            result.retrievalMethod = "vector";
            result.confidence = 0.9;
        } else if (sourceData.sourceType === "SYSTEM_DOCUMENT") {
            const allDocs = await getCommunityDocumentCatalog();
            result.documents = allDocs.filter(d => String(d.document_id) === String(sourceData.sourceId));
            result.retrievalMethod = "vector";
            result.confidence = 0.9;
        } else {
            // GLOBAL_CHAT
            if (keywordDocs.length > 0) {
                result.documents = keywordDocs.map(k => k.doc);
                result.retrievalMethod = validChunks.length > 0 ? "keyword+vector" : "keyword";
                result.confidence = 0.9;
            } else if (validChunks.length > 0) {
                const docIds = [...new Set(validChunks.map(c => c.document_id))];
                const allDocs = await getCommunityDocumentCatalog();
                result.documents = allDocs.filter(d => docIds.includes(d.document_id)).slice(0, 3);
                result.retrievalMethod = "vector";
                result.confidence = 0.7;
            }
        }

        result.chunks = validChunks;
        result.sources = result.documents.map(d => d.title || d.file_name);

    } catch (error) {
        console.error(`[Retrieval Router Error] Strategy: ${sourceData.sourceType}`, error);
        result.fallbackUsed = true;
    }

    return result;
}
