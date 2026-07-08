import { OpenAI } from "openai";
import pool from "../../../DB/db.js";


let openai = null;
export const initOpenAI = () => {
    if (!openai && process.env.OPENAI_API_KEY) {
        openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    }
    return openai;
};

/**
 * Perform a similarity search in vector database
 * @param {Array<number>} queryEmbedding 
 * @param {number} topK 
 * @returns {Array<Object>} List of relevant chunks
 */
export const searchVectorDB = async (queryEmbedding, topK = 5, documentId = null) => {
    try {
        const embeddingString = `[${queryEmbedding.join(',')}]`;
        
        let query = `
            SELECT document_id, chunk_text, 1 - (embedding <=> $1::vector) AS similarity
            FROM document_chunks
            WHERE 1 - (embedding <=> $1::vector) > 0.35
        `;
        const queryParams = [embeddingString, topK];

        if (documentId !== null && documentId !== undefined) {
            query += ` AND document_id = $3`;
            queryParams.push(documentId);
        }

        query += ` ORDER BY embedding <=> $1::vector LIMIT $2;`;

        const { rows } = await pool.query(query, queryParams);
        return rows;
    } catch (error) {
        console.error("[Chat Service] Error querying vector database:", error);
        return [];
    }
};

/**
 * Process the user's chat message using RAG
 * @param {string} userMessage The question from the user
 * @returns {string} AI's response
 */
export const processChatWithRAG = async (userMessage) => {
    const aiClient = initOpenAI();
    if (!aiClient) {
        throw new Error("OPENAI_API_KEY is not configured.");
    }

    try {
        // 1. Dịch câu hỏi thành Vector Embedding
        console.log(`[AI Chat] Generating embedding for question: "${userMessage}"`);
        const embedResponse = await aiClient.embeddings.create({
            model: "text-embedding-3-small",
            input: userMessage,
        });
        const queryEmbedding = embedResponse.data[0].embedding;

        // 2. Tìm kiếm trong Vector DB (PostgreSQL pgvector)
        console.log(`[AI Chat] Searching for similar document chunks...`);
        const relevantChunks = await searchVectorDB(queryEmbedding, 5);

        // 3. Ghép các đoạn văn bản lại làm ngữ cảnh (Context)
        const contextText = relevantChunks.map(chunk => chunk.chunk_text).join("\n\n---\n\n");
        console.log(`[AI Chat] Found ${relevantChunks.length} relevant chunks for context.`);

        // 4. Tạo Prompt cho OpenAI Chat
        const systemPrompt = `
Bạn là AIStudyHub Bot, một trợ lý học thuật thông minh.
Nhiệm vụ của bạn là trả lời câu hỏi của người dùng dựa TRÊN NGỮ CẢNH (CONTEXT) được trích xuất từ tài liệu của hệ thống.
Hãy trả lời một cách chuyên nghiệp, chính xác và có tính học thuật cao.
Nếu ngữ cảnh được cung cấp KHÔNG chứa đủ thông tin để trả lời câu hỏi, hãy nói rõ rằng "Tài liệu hiện tại không chứa thông tin về vấn đề này" và có thể bổ sung thêm một chút kiến thức chung của bạn (nhưng phải nói rõ là kiến thức ngoài).
Trả lời bằng tiếng Việt, trình bày markdown rõ ràng.

NGỮ CẢNH TỪ TÀI LIỆU:
${contextText || "Không tìm thấy ngữ cảnh nào."}
        `;

        console.log(`[AI Chat] Requesting completion from OpenAI...`);
        const chatResponse = await aiClient.chat.completions.create({
            model: "gpt-4o-mini", // hoặc gpt-3.5-turbo
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: userMessage }
            ],
            temperature: 0.3, // Nhiệt độ thấp để trả lời sát với tài liệu hơn
        });

        return chatResponse.choices[0].message.content;
    } catch (error) {
        console.error("[Chat Service] Error processing chat:", error);
        throw error;
    }
};
