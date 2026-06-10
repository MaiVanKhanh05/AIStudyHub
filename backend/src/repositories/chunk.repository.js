import pool from "../../DB/db.js";

/**
 * Inserts an array of chunks into the document_chunks table.
 * @param {string|number} documentId - The ID of the document.
 * @param {Array<{chunk_index: number, chunk_text: string, embedding: Array<number>}>} chunks 
 */
export const insertChunks = async (documentId, chunks) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        
        // Remove existing chunks for this document if any to avoid duplicates
        await client.query('DELETE FROM document_chunks WHERE document_id = $1', [documentId]);
        
        for (const chunk of chunks) {
            // pgvector expects embeddings as a string like '[0.1, 0.2, ...]'
            const embeddingString = `[${chunk.embedding.join(',')}]`;
            
            await client.query(
                `INSERT INTO document_chunks (document_id, chunk_index, chunk_text, embedding) 
                 VALUES ($1, $2, $3, $4)`,
                [documentId, chunk.chunk_index, chunk.chunk_text, embeddingString]
            );
        }
        
        await client.query('COMMIT');
        return true;
    } catch (error) {
        await client.query('ROLLBACK');
        console.error("Error inserting chunks to repository:", error);
        throw error;
    } finally {
        client.release();
    }
};

/**
 * Helper to delete chunks for a specific document
 */
export const deleteChunksByDocumentId = async (documentId) => {
    try {
        await pool.query('DELETE FROM document_chunks WHERE document_id = $1', [documentId]);
        return true;
    } catch (error) {
        console.error("Error deleting chunks:", error);
        throw error;
    }
};
