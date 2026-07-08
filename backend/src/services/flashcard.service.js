import pool from "../../DB/db.js";
import { generateFlashcardJSON } from "./ai/ai.service.js";

/**
 * Generate a Flashcard Set from document context
 * @param {number|null} documentId Related document
 * @param {string} customPrompt Focus topics prompt
 * @param {string} userId Active student user_id
 * @param {string|null} documentContext Optional raw text fallback when documentId is null
 * @returns {Promise<Object>} Created Flashcard Set info
 */
export async function generateFlashcardSet(documentId, customPrompt = "", userId, documentContext = null, targetCardCount = null) {
    let documentTitle = "Thẻ ghi nhớ";
    let chunks = [];

    if (documentId) {
        // 1. Verify document accessibility
        const docQuery = `
            SELECT user_id, title, visibility, is_community, extracted_content 
            FROM document 
            WHERE document_id = $1
        `;
        const { rows: docRows } = await pool.query(docQuery, [documentId]);
        if (docRows.length === 0) {
            throw new Error("Tài liệu không tồn tại hoặc đã bị xóa.");
        }
        
        const doc = docRows[0];
        let hasAccess = false;
        
        if (doc.user_id === userId) {
            hasAccess = true;
        } else if (doc.visibility === "PUBLIC" || doc.is_community === true) {
            hasAccess = true;
        } else if (doc.visibility === "RESTRICTED") {
            const permQuery = `
                SELECT role 
                FROM document_permissions 
                WHERE document_id = $1 AND user_id = $2
            `;
            const { rows: permRows } = await pool.query(permQuery, [documentId, userId]);
            if (permRows.length > 0 && ["EDITOR", "VIEWER"].includes(permRows[0].role)) {
                hasAccess = true;
            }
        }
        
        if (!hasAccess) {
            throw new Error("Bạn không có quyền truy cập vào tài liệu này.");
        }
        documentTitle = doc.title;

        // 2. Fetch document chunks
        const chunkQuery = `
            SELECT chunk_text 
            FROM document_chunks 
            WHERE document_id = $1 
            ORDER BY chunk_index ASC
        `;
        let { rows: chunkRows } = await pool.query(chunkQuery, [documentId]);
        chunks = chunkRows.map(r => r.chunk_text);

        if (chunks.length === 0) {
            if (doc.extracted_content && doc.extracted_content.trim().length > 0) {
                chunks = doc.extracted_content.split(/\n\n+/).filter(c => c.trim().length > 0);
                if (chunks.length === 0) {
                    chunks = [doc.extracted_content];
                }
            } else {
                throw new Error("Tài liệu chưa được trích xuất nội dung văn bản (chunks = 0). Vui lòng thử lại sau khi tài liệu đã được xử lý xong.");
            }
        }
    } else {
        // Fallback to documentContext (direct chat attachments)
        if (!documentContext || documentContext.trim().length === 0) {
            throw new Error("Vui lòng mở xem trước tài liệu hoặc gửi tệp đính kèm trong chat để tôi có thể tạo bộ thẻ ghi nhớ Flashcard ôn tập dựa trên nội dung đó nhé.");
        }

        // Try extracting title if formatted like: --- TẬP TIN: Giao_Trinh_Python_Co_Ban.docx ---
        const titleMatch = documentContext.match(/^---\s*TẬP TIN:\s*(.*?)\s*---/);
        if (titleMatch) {
            documentTitle = titleMatch[1];
        } else {
            documentTitle = "Tài liệu đính kèm";
        }

        // Segment text into paragraphs/chunks
        chunks = documentContext.split(/\n\n+/).filter(c => c.trim().length > 0);
        if (chunks.length === 0) {
            chunks = [documentContext];
        }
    }

    let cardCount = 25;
    if (targetCardCount && typeof targetCardCount === "number" && targetCardCount > 0) {
        cardCount = targetCardCount;
    } else {
        // Calculate approximate page count (assuming ~2 chunks per page or 3000 chars per page)
        const estimatedPages = documentId
            ? Math.max(1, Math.ceil(chunks.length / 2))
            : Math.max(1, Math.ceil((documentContext || "").length / 3000));
        
        // Quantity rules matching prompt:
        // < 15 pages  -> 25 cards (Default changed from 15 to 25)
        // 15-40 pages -> 40 cards
        // > 40 pages  -> 60 cards
        if (estimatedPages >= 15 && estimatedPages <= 40) {
            cardCount = 40;
        } else if (estimatedPages > 40) {
            cardCount = 60;
        } else {
            cardCount = 25;
        }
    }

    // 3. Distributed Chunk Sampling
    let sampledChunks = [];
    if (chunks.length <= 15) {
        sampledChunks = chunks;
    } else {
        const step = (chunks.length - 1) / 14;
        for (let i = 0; i < 15; i++) {
            const idx = Math.round(i * step);
            sampledChunks.push(chunks[idx]);
        }
    }
    const contextText = sampledChunks.length > 0 
        ? sampledChunks.join("\n\n") 
        : "[Tài liệu rỗng hoặc không có nội dung văn bản]";

    // 4. Generate JSON using AI Pipeline
    const setJSON = await generateFlashcardJSON(contextText, cardCount, customPrompt);

    // 5. DB Transaction - Save flashcard_set and flashcards
    const client = await pool.connect();
    try {
        await client.query("BEGIN");
        
        const insertSetQuery = `
            INSERT INTO flashcard_sets (document_id, user_id, title, description, card_count, generation_prompt, topics, document_snapshot)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            RETURNING set_id
        `;
        const insertSetValues = [
            documentId ? Number(documentId) : null,
            userId,
            setJSON.title || documentTitle,
            setJSON.description || "",
            setJSON.flashcards.length,
            customPrompt || "",
            JSON.stringify(setJSON.topics || []),
            contextText
        ];
        const { rows: setRows } = await client.query(insertSetQuery, insertSetValues);
        const setId = setRows[0].set_id;

        const insertCardQuery = `
            INSERT INTO flashcards (set_id, front, back, card_type, topic, importance_score)
            VALUES ($1, $2, $3, $4, $5, $6)
        `;
        for (const card of setJSON.flashcards) {
            await client.query(insertCardQuery, [
                setId,
                card.front,
                card.back,
                card.card_type || 'DEFINITION',
                card.topic || setJSON.title,
                card.importance_score || 50
            ]);
        }

        await client.query("COMMIT");
        
        return {
            setId,
            title: setJSON.title || documentTitle,
            count: setJSON.flashcards.length,
            topics: setJSON.topics || []
        };
    } catch (err) {
        await client.query("ROLLBACK");
        throw err;
    } finally {
        client.release();
    }
}

/**
 * Retrieve metadata for a Flashcard Set
 * @param {number} setId Flashcard Set ID
 * @param {string} userId Owner user_id
 * @returns {Promise<Object>} Metadata
 */
export async function getFlashcardSetMeta(setId, userId) {
    const query = `
        SELECT set_id, title, card_count, topics, document_id
        FROM flashcard_sets
        WHERE set_id = $1 AND user_id = $2 AND status = 'ACTIVE'
    `;
    const { rows } = await pool.query(query, [setId, userId]);
    if (rows.length === 0) {
        throw new Error("Không tìm thấy bộ thẻ ghi nhớ hoặc bạn không có quyền truy cập.");
    }
    const row = rows[0];
    return {
        setId: row.set_id,
        title: row.title,
        cardCount: row.card_count,
        topics: row.topics || [],
        documentId: row.document_id
    };
}

/**
 * Retrieve full details of a Flashcard Set with all active cards
 * @param {number} setId Flashcard Set ID
 * @param {string} userId Owner user_id
 * @returns {Promise<Object>} Details
 */
export async function getFlashcardSetDetails(setId, userId) {
    const setQuery = `
        SELECT set_id, title, description, card_count, topics, generation_prompt, document_id
        FROM flashcard_sets
        WHERE set_id = $1 AND user_id = $2 AND status = 'ACTIVE'
    `;
    const { rows: setRows } = await pool.query(setQuery, [setId, userId]);
    if (setRows.length === 0) {
        throw new Error("Không tìm thấy bộ thẻ ghi nhớ hoặc bạn không có quyền truy cập.");
    }
    
    const cardsQuery = `
        SELECT card_id, front, back, card_type, topic, importance_score
        FROM flashcards
        WHERE set_id = $1 AND status = 'ACTIVE'
        ORDER BY card_id ASC
    `;
    const { rows: cardRows } = await pool.query(cardsQuery, [setId]);

    const set = setRows[0];
    return {
        setId: set.set_id,
        title: set.title,
        description: set.description,
        cardCount: set.card_count,
        topics: set.topics || [],
        generationPrompt: set.generation_prompt,
        documentId: set.document_id,
        flashcards: cardRows.map(r => ({
            cardId: r.card_id,
            front: r.front,
            back: r.back,
            cardType: r.card_type,
            topic: r.topic,
            importanceScore: r.importance_score
        }))
    };
}

/**
 * Retrieve all flashcard sets belonging to user
 * @param {string} userId 
 * @returns {Promise<Array>} List of sets
 */
export async function getUserFlashcardSets(userId) {
    const query = `
        SELECT set_id, title, description, card_count, topics, created_at
        FROM flashcard_sets
        WHERE user_id = $1 AND status = 'ACTIVE'
        ORDER BY created_at DESC
    `;
    const { rows } = await pool.query(query, [userId]);
    return rows.map(row => ({
        setId: row.set_id,
        title: row.title,
        description: row.description,
        cardCount: row.card_count,
        topics: row.topics || [],
        createdAt: row.created_at
    }));
}
