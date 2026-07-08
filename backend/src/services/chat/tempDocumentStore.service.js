import crypto from "crypto";

/**
 * Temporary Document Model:
 * {
 *   id: "temp-doc-123",
 *   fileName: "DongChi.pdf",
 *   chunks: [{ text: "...", embedding: [0.1, ...] }],
 *   status: "ACTIVE", // ACTIVE, IDLE, EXPIRED
 *   createdAt: 1711234567,
 *   expiresAt: 1711320967,
 *   lastAccessedAt: 1711234567
 * }
 * 
 * Session Model:
 * {
 *   sessionId: "sess_123", // Or userId
 *   documents: Map<string, TemporaryDocument>
 * }
 */

// In-Memory Store
// Key: sessionId -> Value: Map<tempDocId, TemporaryDocument>
const sessionStore = new Map();

// Constants
const TTL_HOURS = 24;
const IDLE_HOURS = 12;

/**
 * Cleanup job runs every 1 hour to remove expired documents.
 */
setInterval(() => {
    const now = Date.now();
    for (const [sessionId, docsMap] of sessionStore.entries()) {
        for (const [docId, doc] of docsMap.entries()) {
            // Update status based on last access
            if (now > doc.expiresAt) {
                doc.status = "EXPIRED";
                docsMap.delete(docId);
                console.log(`[TempStore] Deleted expired document: ${docId}`);
            } else if (now - doc.lastAccessedAt > IDLE_HOURS * 60 * 60 * 1000) {
                doc.status = "IDLE";
            }
        }
        // If session has no docs, remove session
        if (docsMap.size === 0) {
            sessionStore.delete(sessionId);
        }
    }
}, 60 * 60 * 1000); // 1 hour

/**
 * Store a new temporary document
 * @param {string} sessionId 
 * @param {string} fileName 
 * @param {Array<{text: string, embedding: Array<number>}>} chunks 
 * @returns {string} tempDocId
 */
export function storeTemporaryDocument(sessionId, fileName, chunks) {
    if (!sessionId) sessionId = "anonymous_session";

    const tempDocId = `temp-doc-${crypto.randomUUID()}`;
    const now = Date.now();
    
    const doc = {
        id: tempDocId,
        fileName,
        chunks,
        status: "ACTIVE",
        createdAt: now,
        expiresAt: now + (TTL_HOURS * 60 * 60 * 1000),
        lastAccessedAt: now
    };

    if (!sessionStore.has(sessionId)) {
        sessionStore.set(sessionId, new Map());
    }

    sessionStore.get(sessionId).set(tempDocId, doc);
    console.log(`[TempStore] Stored new temp document: ${tempDocId} for session: ${sessionId}`);
    return tempDocId;
}

/**
 * Retrieve a temporary document and validate session ownership
 * @param {string} sessionId 
 * @param {string} tempDocId 
 * @returns {Object|null} The document or null if not found/unauthorized
 */
export function getTemporaryDocument(sessionId, tempDocId) {
    if (!sessionId) sessionId = "anonymous_session";

    const docsMap = sessionStore.get(sessionId);
    if (!docsMap) return null;

    const doc = docsMap.get(tempDocId);
    if (!doc) return null;

    if (Date.now() > doc.expiresAt) {
        docsMap.delete(tempDocId);
        return null;
    }

    doc.lastAccessedAt = Date.now();
    doc.status = "ACTIVE";
    return doc;
}

/**
 * Delete a temporary document manually
 * @param {string} sessionId 
 * @param {string} tempDocId 
 */
export function deleteTemporaryDocument(sessionId, tempDocId) {
    if (!sessionId) sessionId = "anonymous_session";
    const docsMap = sessionStore.get(sessionId);
    if (docsMap) {
        docsMap.delete(tempDocId);
        console.log(`[TempStore] Manually deleted temp document: ${tempDocId}`);
    }
}

/**
 * Get all documents for a session (Useful for multi-file ambiguity resolution)
 * @param {string} sessionId 
 * @returns {Array<Object>}
 */
export function getAllSessionDocuments(sessionId) {
    if (!sessionId) sessionId = "anonymous_session";
    const docsMap = sessionStore.get(sessionId);
    if (!docsMap) return [];
    
    const validDocs = [];
    for (const [id, doc] of docsMap.entries()) {
        if (Date.now() <= doc.expiresAt) {
            validDocs.push(doc);
        }
    }
    return validDocs;
}
