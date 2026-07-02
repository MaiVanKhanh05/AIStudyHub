import pool from "../../DB/db.js";
import { generateQuizJSON } from "./ai/ai.service.js";

/**
 * Perform distributed chunk sampling for large text content
 * @param {number} documentId 
 * @param {string} fallbackText 
 * @returns {Promise<string>} Sampled context
 */
async function getDistributedDocumentContext(documentId, fallbackText) {
    if (!documentId) return fallbackText;

    // Fetch all document chunks ordered by chunk index
    const chunkQuery = `
        SELECT chunk_text 
        FROM document_chunks 
        WHERE document_id = $1 
        ORDER BY chunk_index ASC
    `;
    const { rows } = await pool.query(chunkQuery, [documentId]);

    if (!rows || rows.length === 0) {
        return fallbackText;
    }

    const chunks = rows.map(r => r.chunk_text);

    // If chunks are small, merge all
    if (chunks.length <= 15) {
        return chunks.join("\n\n");
    }

    // Distributed sampling of exactly 15 chunks evenly spread throughout the document
    const step = (chunks.length - 1) / 14;
    const sampled = [];
    for (let i = 0; i < 15; i++) {
        const index = Math.round(i * step);
        sampled.push(chunks[index]);
    }

    return sampled.join("\n\n");
}

/**
 * Generate and save quiz from a document text context
 * @param {string} rawText Raw fallback text
 * @param {number} count Number of questions
 * @param {string} userId Owner user_id
 * @param {number|null} documentId Related document_id
 * @param {string} sourceType 'DOCUMENT_PREVIEW', 'RESEARCH_ASSISTANT', or 'CHAT_PROMPT'
 * @returns {Promise<Object>} Created Quiz metadata
 */
export async function generateQuizFromText(rawText, count, userId, documentId, sourceType, customInstructions = "") {
    const totalQuestionsRequested = Math.min(Math.max(1, count), 150); // support up to 150 questions safely to prevent cost spikes
    const BATCH_SIZE = 25; // 25 questions per API call is safe
    
    // Determine how chunks are retrieved
    let chunks = [];
    if (documentId) {
        // 1. Verify document accessibility
        const docQuery = `
            SELECT user_id, visibility, is_community, extracted_content 
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

        const chunkQuery = `
            SELECT chunk_text 
            FROM document_chunks 
            WHERE document_id = $1 
            ORDER BY chunk_index ASC
        `;
        let { rows } = await pool.query(chunkQuery, [documentId]);
        chunks = (rows || []).map(r => r.chunk_text);

        if (chunks.length === 0) {
            if (doc.extracted_content && doc.extracted_content.trim().length > 0) {
                chunks = doc.extracted_content.split(/\n\n+/).filter(c => c.trim().length > 0);
                if (chunks.length === 0) {
                    chunks = [doc.extracted_content];
                }
            }
        }
    }
    
    // If no database chunks, we slice rawText into paragraphs or sentences
    if (chunks.length === 0) {
        if (rawText && rawText.trim().length > 0) {
            chunks = rawText.split(/\n\n+/).filter(c => c.trim().length > 0);
            if (chunks.length === 0 && rawText.trim().length > 0) {
                chunks = [rawText];
            }
        } else {
            throw new Error("Không tìm thấy nội dung tài liệu để tạo Quiz.");
        }
    }

    const numBatches = Math.ceil(totalQuestionsRequested / BATCH_SIZE);
    const masterQuestions = [];
    const masterTopics = new Set();
    let quizTitle = "Quiz ôn tập";

    // Distribute chunks to batches
    // Each batch gets a sub-segment of chunks to ensure even document coverage and no duplicates
    const chunksPerBatch = Math.ceil(chunks.length / numBatches);

    for (let i = 0; i < numBatches; i++) {
        // Calculate slice of chunks for this batch
        const startIdx = i * chunksPerBatch;
        const endIdx = Math.min(startIdx + chunksPerBatch, chunks.length);
        const batchChunks = chunks.slice(startIdx, endIdx);
        
        let batchContext = batchChunks.join("\n\n");
        // If the chunk set is empty, fallback to the entire set of chunks
        if (!batchContext || batchContext.trim() === "") {
            batchContext = chunks.slice(0, 15).join("\n\n");
        }

        // Determine questions count for this batch
        const batchCount = (i === numBatches - 1) 
            ? (totalQuestionsRequested - (i * BATCH_SIZE))
            : BATCH_SIZE;

        console.log(`[Quiz Service] Generating batch ${i + 1}/${numBatches}. Questions to generate: ${batchCount}. Chunks range: ${startIdx}-${endIdx}`);
        
        try {
            // Call AI Service for this batch
            const batchQuizJSON = await generateQuizJSON(batchContext, batchCount, customInstructions);
            
            if (batchQuizJSON.title && i === 0) {
                quizTitle = batchQuizJSON.title;
            }
            if (Array.isArray(batchQuizJSON.topics)) {
                batchQuizJSON.topics.forEach(t => masterTopics.add(t));
            }
            if (Array.isArray(batchQuizJSON.questions)) {
                masterQuestions.push(...batchQuizJSON.questions);
            }
        } catch (err) {
            console.error(`[Quiz Service] Batch ${i + 1} generation failed:`, err);
            throw err;
        }
    }

    if (masterQuestions.length === 0) {
        throw new Error("Không thể tạo câu hỏi từ tài liệu ôn tập.");
    }

    // 3. Database Transaction to save quizzes and quiz_questions
    const client = await pool.connect();
    try {
        await client.query("BEGIN");

        const topicsJson = JSON.stringify(Array.from(masterTopics));
        
        // Insert quiz
        const quizInsertQuery = `
            INSERT INTO quizzes (document_id, user_id, title, source_type, topics, status)
            VALUES ($1, $2, $3, $4, $5, 'ACTIVE')
            RETURNING quiz_id, title, topics, created_at;
        `;
        const quizRes = await client.query(quizInsertQuery, [
            documentId || null,
            userId || null,
            quizTitle,
            sourceType || "CHAT_PROMPT",
            topicsJson
        ]);

        const quizId = quizRes.rows[0].quiz_id;

        // Insert questions
        const questionInsertQuery = `
            INSERT INTO quiz_questions (quiz_id, question_text, options, correct_answer, explanation, topic)
            VALUES ($1, $2, $3, $4, $5, $6);
        `;

        for (const q of masterQuestions) {
            const optionsJson = JSON.stringify(q.options);
            await client.query(questionInsertQuery, [
                quizId,
                q.question_text,
                optionsJson,
                q.correct_answer,
                q.explanation,
                q.topic
            ]);
        }

        await client.query("COMMIT");

        return {
            quizId: quizId,
            title: quizRes.rows[0].title,
            count: masterQuestions.length,
            topics: Array.from(masterTopics),
            createdAt: quizRes.rows[0].created_at
        };
    } catch (error) {
        await client.query("ROLLBACK");
        console.error("[Quiz Service] Error creating quiz in database transaction:", error);
        throw error;
    } finally {
        client.release();
    }
}

/**
 * Fetch Quiz Metadata (clean metadata, no questions) with ownership and soft-delete active check
 * @param {number} quizId 
 * @param {string} userId 
 * @returns {Promise<Object>} Quiz Metadata
 */
export async function getQuizMeta(quizId, userId) {
    const query = `
        SELECT q.quiz_id, q.title, q.topics, q.status, q.created_at, q.document_id,
               (SELECT COUNT(*) FROM quiz_questions WHERE quiz_id = q.quiz_id)::INT AS count
        FROM quizzes q
        WHERE q.quiz_id = $1 AND q.user_id = $2 AND q.status = 'ACTIVE'
    `;
    const { rows } = await pool.query(query, [quizId, userId]);

    if (rows.length === 0) {
        throw new Error("Không tìm thấy bộ Quiz ôn tập này hoặc bạn không có quyền truy cập.");
    }

    return {
        quizId: rows[0].quiz_id,
        title: rows[0].title,
        count: rows[0].count,
        topics: rows[0].topics || [],
        createdAt: rows[0].created_at,
        documentId: rows[0].document_id
    };
}

/**
 * Get Quiz questions (without answers or explanations) for test taking. Checks ownership & active status.
 * @param {number} quizId 
 * @param {string} userId 
 * @returns {Promise<Object>} Quiz metadata + safe questions list
 */
export async function getQuiz(quizId, userId) {
    // 1. Ownership & Active Check
    const quizQuery = `
        SELECT quiz_id, title, topics, document_id 
        FROM quizzes 
        WHERE quiz_id = $1 AND user_id = $2 AND status = 'ACTIVE'
    `;
    const quizRes = await pool.query(quizQuery, [quizId, userId]);

    if (quizRes.rows.length === 0) {
        throw new Error("Bộ Quiz không tồn tại hoặc bạn không có quyền ôn tập.");
    }

    // 2. Fetch questions securely (no correct_answer, no explanation)
    const questionsQuery = `
        SELECT question_id, question_text, options, topic
        FROM quiz_questions 
        WHERE quiz_id = $1 
        ORDER BY question_id ASC
    `;
    const questionsRes = await pool.query(questionsQuery, [quizId]);

    return {
        quizId: quizRes.rows[0].quiz_id,
        title: quizRes.rows[0].title,
        topics: quizRes.rows[0].topics || [],
        documentId: quizRes.rows[0].document_id,
        questions: questionsRes.rows.map(q => ({
            questionId: q.question_id,
            questionText: q.question_text,
            options: q.options || [],
            topic: q.topic
        }))
    };
}

/**
 * Submit quiz answers, score them, log historical records (attempts + answer details) inside a Transaction, and return correct answers review.
 * @param {number} quizId 
 * @param {string} userId 
 * @param {Array<Object>} answers Array of { questionId, answer } where answer is integer 0-3
 * @param {number} timeSpentSeconds Duration of test taking in seconds
 * @returns {Promise<Object>} Summary and question-by-question review results
 */
export async function submitQuiz(quizId, userId, answers = [], timeSpentSeconds = 0) {
    // 1. Security Check
    const quizQuery = `
        SELECT quiz_id, title 
        FROM quizzes 
        WHERE quiz_id = $1 AND user_id = $2 AND status = 'ACTIVE'
    `;
    const quizRes = await pool.query(quizQuery, [quizId, userId]);
    if (quizRes.rows.length === 0) {
        throw new Error("Không tìm thấy bộ Quiz này hoặc bạn không có quyền làm bài.");
    }

    // 2. Fetch all correct questions data
    const questionsQuery = `
        SELECT question_id, question_text, options, correct_answer, explanation, topic
        FROM quiz_questions
        WHERE quiz_id = $1
        ORDER BY question_id ASC
    `;
    const questionsRes = await pool.query(questionsQuery, [quizId]);
    const questions = questionsRes.rows;

    if (questions.length === 0) {
        throw new Error("Bộ câu hỏi rỗng.");
    }

    // Create a map of user answers for quick O(1) lookup
    const userAnswersMap = {};
    for (const ans of answers) {
        userAnswersMap[ans.questionId] = ans.answer; // Number or null
    }

    let score = 0;
    const review = [];

    // Grade each question
    for (const q of questions) {
        const selected = userAnswersMap[q.question_id]; // Selected index (0-3)
        const isCorrect = selected !== undefined && selected !== null && Number(selected) === q.correct_answer;
        
        if (isCorrect) {
            score++;
        }

        review.push({
            questionId: q.question_id,
            questionText: q.question_text,
            options: q.options || [],
            selectedAnswer: selected !== undefined && selected !== null ? Number(selected) : null,
            correctAnswer: q.correct_answer,
            explanation: q.explanation,
            topic: q.topic,
            isCorrect: isCorrect
        });
    }

    // 3. Database Transaction to insert attempts and attempts answers
    const client = await pool.connect();
    try {
        await client.query("BEGIN");

        // Insert into quiz_attempts
        const attemptInsertQuery = `
            INSERT INTO quiz_attempts (quiz_id, user_id, score, total_questions, time_spent_seconds)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING attempt_id, created_at;
        `;
        const attemptRes = await client.query(attemptInsertQuery, [
            quizId,
            userId,
            score,
            questions.length,
            timeSpentSeconds || 0
        ]);

        const attemptId = attemptRes.rows[0].attempt_id;

        // Bulk insert answers for analytics
        const answerInsertQuery = `
            INSERT INTO quiz_attempt_answers (attempt_id, question_id, selected_answer, is_correct)
            VALUES ($1, $2, $3, $4);
        `;

        for (const item of review) {
            await client.query(answerInsertQuery, [
                attemptId,
                item.questionId,
                item.selectedAnswer,
                item.isCorrect
            ]);
        }

        await client.query("COMMIT");

        return {
            score: score,
            total: questions.length,
            timeSpentSeconds: timeSpentSeconds,
            createdAt: attemptRes.rows[0].created_at,
            review: review
        };
    } catch (error) {
        await client.query("ROLLBACK");
        console.error("[Quiz Service] Error inserting attempt logs:", error);
        throw error;
    } finally {
        client.release();
    }
}
