import fs from "fs";
import path from "path";
import { getCommunityDocumentCatalog, searchCommunityDocsByKeyword } from "../repositories/document.repository.js";
import pool from "../../DB/db.js";

import {
  parsePDF,
  parseWord,
  parseExcel,
  parsePPTX,
  parseZip,
  parseImageViaLLM
} from "../services/ai/documentParser.service.js";
import { extractContext } from "../services/chat/conversationContext.service.js";
import { detectIntent } from "../services/chat/intentDetection.service.js";
import { recognizeEntities } from "../services/chat/entityRecognition.service.js";
import { rewriteQuery } from "../services/chat/queryRewrite.service.js";
import { retrieveContext } from "../services/chat/retrieval.service.js";
import { buildPrompt } from "../services/chat/promptBuilder.service.js";
import { planResponse } from "../services/chat/responsePlanning.service.js";
import { chunkText, generateEmbeddings } from "../services/ai/embedding.service.js";
import { storeTemporaryDocument } from "../services/chat/tempDocumentStore.service.js";
import { detectSource } from "../services/chat/sourceDetection.service.js";

// Đường dẫn API: POST /api/chat/upload-temp
export async function uploadTempFile(req, res) {
  if (!req.file) {
    return res.status(400).json({ error: "Không tìm thấy tệp tải lên." });
  }

  // Sửa lỗi mã hóa latin1 của multer đối với tên tệp tiếng Việt
  let originalName = req.file.originalname;
  try {
    originalName = Buffer.from(originalName, 'latin1').toString('utf8');
  } catch (e) {
    // quay lại sử dụng tên gốc nếu chuyển đổi thất bại
  }

  const mimeType = req.file.mimetype;
  const ext = path.extname(originalName).toLowerCase();

  // Đảm bảo thư mục temp_uploads tồn tại
  const tempDir = path.join(process.cwd(), "temp_uploads");
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }

  const tempFilePath = path.join(tempDir, `temp_${Date.now()}_${originalName}`);
  let fileWritten = false;
  let extractedText = "";

  try {
    // 1. Xử lý các tệp yêu cầu đường dẫn tệp
    if (ext === ".pptx" || ext === ".zip") {
      fs.writeFileSync(tempFilePath, req.file.buffer);
      fileWritten = true;
    }

    // 2. Định tuyến xử lý phân tách dựa trên phần mở rộng (đuôi file)
    if (ext === ".pdf") {
      extractedText = await parsePDF(req.file.buffer);
    } else if (ext === ".docx") {
      extractedText = await parseWord(req.file.buffer);
    } else if (ext === ".xlsx" || ext === ".xls") {
      extractedText = await parseExcel(req.file.buffer);
    } else if (ext === ".pptx") {
      extractedText = await parsePPTX(tempFilePath);
    } else if (ext === ".zip") {
      extractedText = await parseZip(tempFilePath);
    } else if ([".png", ".jpg", ".jpeg", ".webp"].includes(ext)) {
      const base64Data = req.file.buffer.toString("base64");
      extractedText = await parseImageViaLLM(base64Data, mimeType);
    } else if (ext === ".txt" || ext === ".json" || ext === ".js" || ext === ".py" || ext === ".md") {
      extractedText = req.file.buffer.toString("utf8");
    } else {
      // Dự phòng cho các tệp mã/văn bản tùy ý: kiểm tra xem bộ đệm có chứa byte NULL trong 512 byte đầu tiên không
      const hasNullBytes = req.file.buffer.slice(0, 512).includes(0);
      if (!hasNullBytes) {
        extractedText = req.file.buffer.toString("utf8");
      } else {
        // Hỗ trợ tốt các định dạng nhị phân khác bằng cách ghi nhận việc tải lên của chúng trong ngữ cảnh
        extractedText = `[Đã đính kèm tệp nhị phân: ${originalName} (Kích thước: ${(req.file.size / 1024).toFixed(1)} KB). Hệ thống đã ghi nhận tệp nhị phân này làm ngữ cảnh cuộc trò chuyện.]`;
      }
    }

    // --- CHUNKING & EMBEDDING CHO UPLOAD PIPELINE ---
    const textChunks = chunkText(extractedText, 1000, 200);
    const embeddings = await generateEmbeddings(textChunks);
    
    const chunksWithEmbeddings = textChunks.map((text, i) => ({
      text,
      embedding: embeddings[i] || []
    }));

    // Lấy sessionId (nếu đã đăng nhập, dùng userId để bảo mật Ownership)
    const sessionId = req.userId ? String(req.userId) : "anonymous_session";
    const tempDocId = storeTemporaryDocument(sessionId, originalName, chunksWithEmbeddings);

    return res.json({
      fileName: originalName,
      fileSize: req.file.size,
      fileType: ext.replace(".", "").toUpperCase(),
      extractedText: extractedText,
      documentId: tempDocId,
      chatMode: "UPLOADED_DOCUMENT"
    });
  } catch (error) {
    console.error("Error parsing upload file:", error);
    return res.status(500).json({ error: `Lỗi xử lý tài liệu: ${error.message}` });
  } finally {
    // Dọn dẹp các tệp tạm thời
    if (fileWritten && fs.existsSync(tempFilePath)) {
      try {
        fs.unlinkSync(tempFilePath);
      } catch (err) {
        console.error("Cleanup temp file error:", err);
      }
    }
  }
}

// Hàm hỗ trợ: Gọi API Google Gemini Generative AI qua HTTP fetch
async function callGemini(messages, systemInstruction) {
  const apiKey = process.env.GEMINI_API_KEY;
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

  // Định dạng lại các tin nhắn cho Gemini
  // Gemini chấp nhận định dạng: contents: [{ role: "user"|"model", parts: [{ text: "..." }] }]
  const contents = [];

  // Tổng hợp lịch sử và các hướng dẫn
  for (const msg of messages) {
    let role = "user";
    if (msg.role === "assistant" || msg.role === "system") {
      role = "model";
    }

    // Các vai trò (role) của Gemini phải luân phiên giữa user/model. Nếu các vai trò liên tiếp giống nhau, hãy gộp chúng lại.
    const lastContent = contents[contents.length - 1];
    if (lastContent && lastContent.role === role) {
      lastContent.parts[0].text += "\n" + msg.content;
    } else {
      contents.push({
        role,
        parts: [{ text: msg.content }]
      });
    }
  }

  const payload = {
    contents,
    generationConfig: {
      temperature: 0.3,
      maxOutputTokens: 2048
    }
  };

  if (systemInstruction) {
    payload.systemInstruction = {
      parts: [{ text: systemInstruction }]
    };
  }

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Gemini API error: ${errText}`);
  }

  const data = await response.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text || "Không có câu trả lời nào được phản hồi.";
}

// Hàm hỗ trợ: Gọi API chat completions của OpenAI
async function callOpenAI(messages, systemInstruction) {
  const apiKey = process.env.OPENAI_API_KEY;
  const url = "https://api.openai.com/v1/chat/completions";

  const formattedMessages = [];
  if (systemInstruction) {
    formattedMessages.push({ role: "system", content: systemInstruction });
  }
  formattedMessages.push(...messages);

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: formattedMessages,
      temperature: 0.3
    })
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`OpenAI API error: ${errText}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || "Không có câu trả lời nào được phản hồi.";
}

import * as quizService from "../services/quiz.service.js";
import * as flashcardService from "../services/flashcard.service.js";

// Đường dẫn API: POST /api/chat

// Hàm tìm kiếm tài liệu liên quan dựa theo từ khóa trong câu hỏi của người dùng
async function searchRelevantDocs(message, allDocs) {
  if (!allDocs || allDocs.length === 0) return [];

  const msg = message.toLowerCase();
  const msgWords = msg.split(/[\s\-_.,]+/).filter(w => w.length > 1);

  // Tính điểm liên quan cho từng tài liệu
  const scored = allDocs.map(d => {
    let score = 0;
    const title = (d.title || '').toLowerCase();
    const subject = (d.subject_name || '').toLowerCase();
    const subjectCode = (d.subject_code || '').toLowerCase();
    const desc = (d.description || '').toLowerCase();

    // 1. Match chính xác mã môn hoặc tên môn trong toàn bộ câu query
    if (subjectCode && msg.includes(subjectCode)) score += 50;
    if (subject && msg.includes(subject)) score += 40;

    // 2. Tách từ khóa để match từng phần
    msgWords.forEach(word => {
      // Ưu tiên cực cao nếu từ khóa khớp mã môn (ví dụ: user gõ 'swt', subject_code là 'swt301')
      if (subjectCode && subjectCode.includes(word) && word.length >= 2) {
        score += 20;
      }
      // Khớp tên môn
      if (subject && subject.includes(word) && word.length >= 3) {
        score += 15;
      }
      // Khớp title
      if (title.includes(word) && word.length >= 3) {
        score += 5;
      }
      // Khớp description
      if (desc.includes(word) && word.length >= 4) {
        score += 2;
      }
    });

    // 3. Khớp nhóm từ khóa CNTT chung (chỉ cộng điểm nhẹ)
    const itKeywords = ['tài liệu', 'document', 'học', 'môn', 'bài', 'slide', 'lab', 'assignment',
      'software', 'web', 'programming', 'lập trình', 'kỹ thuật', 'phần mềm',
      'testing', 'kiểm thử', 'database', 'cơ sở dữ liệu', 'java', 'python',
      'javascript', 'algorithm', 'thuật toán', 'network', 'mạng'];
    itKeywords.forEach(kw => {
      if (msg.includes(kw) && (title.includes(kw) || subject.includes(kw))) score += 2;
    });

    // 4. Ưu tiên tài liệu AI Hot Docs CHỈ KHI tài liệu đó ĐÃ CÓ sự liên quan (score > 0)
    // Tránh việc recommend tài liệu không liên quan chỉ vì nó là Hot Docs
    if (score > 0 && d.is_ai_featured) {
      score += 10;
    }

    return { doc: d, score };
  });

  // Lọc và sắp xếp theo điểm (chỉ lấy tài liệu có điểm >= 15 để đảm bảo tính chính xác)
  const relevant = scored
    .filter(s => s.score >= 15)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5) // tối đa 5 tài liệu gợi ý
    .map(s => s.doc);

  return relevant;
}

export async function chatQuery(req, res) {
  const { message, history = [], aiMode = "General AI", documentId = null, documentIds = [] } = req.body;
  const userId = req.userId;
  let documentContext = req.body.documentContext || "";

  // Try to retrieve documentContext from chat history if not provided in the current request
  if (!documentContext && history && Array.isArray(history)) {
    for (let i = history.length - 1; i >= 0; i--) {
      const msg = history[i];
      if (msg.sender === "user" && msg.files && Array.isArray(msg.files) && msg.files.length > 0) {
        const foundContext = msg.files
          .filter(file => file.content)
          .map(file => `--- TẬP TIN: ${file.name} ---\n${file.content}`)
          .join("\n\n");
        if (foundContext) {
          documentContext = foundContext;
          break;
        }
      }
    }
  }

  if (!message) {
    return res.status(400).json({ error: "Câu hỏi không được để trống." });
  }

  try {
    // 1. Source Detection
    const sourceData = detectSource(aiMode, documentId, documentIds);
    sourceData.sessionId = req.userId ? String(req.userId) : "anonymous_session";

    const context = await extractContext(history, message);
    context.documentContextStr = documentContext;
    const intentData = await detectIntent(context, message);
    context.intent = intentData.intent;
    const entities = await recognizeEntities(context, message);
    
    // Nếu intent là tạo bài tập, đẩy xuống logic Flashcard/Quiz cũ
    if (!["GENERATE_FLASHCARD", "GENERATE_QUIZ"].includes(intentData.intent)) {
        const rewritten = await rewriteQuery(context, message);
        const retrievalData = await retrieveContext(rewritten, intentData.intent, entities, sourceData);

        // Error Handling: Không Fallback nếu SYSTEM / UPLOAD bị lỗi (Timeout / Empty)
        if (retrievalData.fallbackUsed && (sourceData.sourceType === "UPLOADED_DOCUMENT" || sourceData.sourceType === "SYSTEM_DOCUMENT")) {
            return res.json({ response: "Không thể truy xuất tài liệu hiện tại, vui lòng thử lại." });
        }

        const prompt = buildPrompt(context, retrievalData, message, sourceData);
        
        const queryMessages = history.map(h => ({
          role: h.sender === "ai" ? "assistant" : "user",
          content: h.text || ""
        }));
        queryMessages.push({ role: "user", content: rewritten });
        
        let responseText = "";
        if (process.env.GEMINI_API_KEY) {
          responseText = await callGemini(queryMessages, prompt);
        } else {
          responseText = await callOpenAI(queryMessages, prompt);
        }
        
        const finalResponse = planResponse(responseText, context, retrievalData, sourceData);
        
        let finalResponseText = finalResponse.text;
        if (finalResponse.suggestedDocs && finalResponse.suggestedDocs.length > 0) {
          finalResponseText += "\n\n";
          // Nối link document để frontend render UI thẻ tài liệu
          finalResponse.suggestedDocs.forEach(d => {
            finalResponseText += `http://localhost:3000/preview/${d.document_id}\n`;
          });
        }
        
        return res.json({ response: finalResponseText });
    }
  } catch (err) {
    console.error("[NEW PIPELINE ERROR]", err);
    return res.status(500).json({ error: "Đã xảy ra lỗi trong quá trình xử lý Context-Aware RAG." });
  }


  // Intercept flashcard creation requests
  const messageLower = message.toLowerCase();
  const hasFlashcardKeyword = messageLower.includes("flashcard") ||
    messageLower.includes("flash card") ||
    messageLower.includes("flashard") || // common typo
    messageLower.includes("flash ard") || // common typo
    messageLower.includes("thẻ ghi nhớ") ||
    messageLower.includes("thẻ ôn tập") ||
    messageLower.includes("study card") ||
    messageLower.includes("revision card");

  const hasCreateIntent = messageLower.includes("tạo") ||
    messageLower.includes("taoj") || // telex typo
    messageLower.includes("tao") || // unmarked
    messageLower.includes("làm") ||
    messageLower.includes("lam") ||
    messageLower.includes("sinh") ||
    messageLower.includes("học") ||
    messageLower.includes("hoc") ||
    messageLower.includes("ôn") ||
    messageLower.includes("on") ||
    messageLower.includes("create") ||
    messageLower.includes("generate") ||
    messageLower.includes("make") ||
    messageLower.includes("study") ||
    messageLower.includes("practice") ||
    messageLower.includes("review") ||
    messageLower.includes("revision") ||
    messageLower.includes("giúp tôi ôn tập");

  const isFlashcardRequest = messageLower.includes("giúp tôi ôn tập tài liệu này") ||
    (hasFlashcardKeyword && hasCreateIntent);

  if (isFlashcardRequest) {
    try {
      console.log("[Chat Query] Flashcard generation intent detected!");

      if (!userId) {
        return res.status(401).json({ error: "Bạn cần đăng nhập để tạo thẻ ghi nhớ." });
      }

      if (!documentId && !documentContext) {
        return res.json({
          response: "Vui lòng mở xem trước tài liệu hoặc gửi tệp đính kèm trong chat để tôi có thể tạo bộ thẻ ghi nhớ Flashcard ôn tập dựa trên nội dung đó nhé."
        });
      }

      // Parse target card count if explicitly specified by user (e.g. "tạo 30 thẻ", "tạo 15 flashcard")
      let targetCardCount = null;
      const countMatch = message.match(/(\d+)\s*(thẻ ghi nhớ|thẻ|câu|flashcard|flash card|cards|card)/i);
      if (countMatch) {
        targetCardCount = parseInt(countMatch[1], 10);
      }

      const flashcardResult = await flashcardService.generateFlashcardSet(
        documentId ? Number(documentId) : null,
        message, // Pass raw prompt message as customPrompt/focusPrompt
        userId,
        documentContext,
        targetCardCount
      );

      // Fetch flashcards from database to display in chat
      const flashcardsRes = await pool.query(`SELECT front, back FROM flashcards WHERE set_id = $1`, [flashcardResult.setId]);
      let mdText = `✅ **Đã tạo thành công bộ Flashcard: ${flashcardResult.title}** gồm ${flashcardResult.count} thẻ.\n*(Tính năng giao diện Flashcard đang được hoàn thiện, dưới đây là bộ thẻ của bạn)*\n\n`;
      flashcardsRes.rows.forEach((card, i) => {
        mdText += `**Thẻ ${i + 1}:**\n- **Mặt trước (Câu hỏi/Thuật ngữ):** ${card.front}\n- **Mặt sau (Đáp án/Giải nghĩa):** ${card.back}\n\n`;
      });

      return res.json({
        response: mdText,
        messageType: "flashcard_set",
        data: {
          setId: flashcardResult.setId,
          title: flashcardResult.title,
          count: flashcardResult.count,
          topics: flashcardResult.topics
        }
      });
    } catch (error) {
      console.error("[Chat Query] Failed to auto-generate flashcards in chat:", error);
      return res.status(200).json({
        response: `❌ **Lỗi sinh bộ thẻ ghi nhớ:** ${error.message || "Lỗi không xác định."}`
      });
    }
  }

  // Intercept quiz creation requests
  const hasQuizKeyword = messageLower.includes("quiz") ||
    messageLower.includes("quizz") ||
    messageLower.includes("trắc nghiệm") ||
    messageLower.includes("test my knowledge") ||
    messageLower.includes("kiểm tra kiến thức");

  const isExplanationQuery = (messageLower.includes("giải thích") || messageLower.includes("tại sao") || messageLower.includes("vì sao") || messageLower.includes("sửa") || messageLower.includes("chữa")) &&
    (messageLower.includes("câu") || messageLower.includes("question") || messageLower.includes("đáp án"));

  const isQuizRequest = hasQuizKeyword && !isExplanationQuery;

  if (isQuizRequest) {
    try {
      console.log("[Chat Query] Quiz generation intent detected!");

      // Parse question count
      let count = 10;
      const countMatch = message.match(/(\d+)\s*(câu hỏi|câu|questions|question|q)/i);
      if (countMatch) {
        count = parseInt(countMatch[1], 10);
      }

      // We need either a documentContext or documentId
      if (!documentContext && !documentId) {
        return res.json({
          response: "Vui lòng mở xem trước tài liệu hoặc gửi tệp đính kèm trong chat để tôi có thể tạo Quiz ôn tập dựa trên nội dung đó nhé."
        });
      }

      const quizResult = await quizService.generateQuizFromText(
        documentContext,
        count,
        userId || null,
        documentId ? Number(documentId) : null,
        "CHAT_PROMPT",
        message // Pass raw prompt message as customInstructions
      );

      // Return event string as the main response text so it is stored in chat logs,
      // along with helper metadata for immediate rendering
      // Fetch quiz questions from database to display in chat
      const questionsRes = await pool.query(`SELECT question_text, options, correct_answer, explanation FROM quiz_questions WHERE quiz_id = $1`, [quizResult.quizId]);
      let mdText = `✅ **Đã tạo thành công bài Quiz: ${quizResult.title}** gồm ${quizResult.count} câu hỏi.\n*(Tính năng giao diện Quiz đang được hoàn thiện, dưới đây là bài tập của bạn)*\n\n`;
      questionsRes.rows.forEach((q, i) => {
        mdText += `**Câu ${i + 1}:** ${q.question_text}\n`;
        const opts = typeof q.options === 'string' ? JSON.parse(q.options) : q.options;
        opts.forEach(opt => {
          mdText += `- ${opt}\n`;
        });
        mdText += `\n**Đáp án đúng:** ${q.correct_answer}\n**Giải thích:** ${q.explanation}\n\n---\n\n`;
      });

      return res.json({
        response: mdText,
        messageType: "quiz_card",
        data: quizResult
      });
    } catch (error) {
      console.error("[Chat Query] Failed to auto-generate quiz in chat:", error);
      return res.status(200).json({
        response: `❌ **Lỗi sinh câu hỏi ôn tập:** ${error.message || "Lỗi không xác định."}`
      });
    }
  }

}

// Đường dẫn API: GET /api/chat/history
export async function getHistory(req, res) {
  const userId = req.userId;
  if (!userId) {
    return res.status(401).json({ error: "Người dùng không được xác định." });
  }

  try {
    const sessionsRes = await pool.query(
      `SELECT id, title, is_pinned AS "isPinned", updated_at AS "updatedAt"
       FROM chat_sessions
       WHERE user_id = $1
       ORDER BY is_pinned DESC, updated_at DESC`,
      [userId]
    );

    if (sessionsRes.rows.length === 0) {
      return res.json([]);
    }

    const sessionIds = sessionsRes.rows.map(s => s.id);
    const messagesRes = await pool.query(
      `SELECT id, session_id AS "sessionId", sender, text, files, created_at
       FROM chat_messages
       WHERE session_id = ANY($1)
       ORDER BY created_at ASC`,
      [sessionIds]
    );

    // Nhóm các tin nhắn theo session_id (ID phiên)
    const messagesBySession = {};
    for (const msg of messagesRes.rows) {
      if (!messagesBySession[msg.sessionId]) {
        messagesBySession[msg.sessionId] = [];
      }
      messagesBySession[msg.sessionId].push({
        id: msg.id,
        sender: msg.sender,
        text: msg.text,
        files: msg.files || []
      });
    }

    const result = sessionsRes.rows.map(s => ({
      id: s.id,
      title: s.title,
      isPinned: s.isPinned,
      updatedAt: s.updatedAt,
      messages: messagesBySession[s.id] || []
    }));

    return res.json(result);
  } catch (error) {
    console.error("Error fetching chat history:", error);
    return res.status(500).json({ error: "Lỗi hệ thống khi tải lịch sử trò chuyện." });
  }
}

// Đường dẫn API: POST /api/chat/history/save
export async function saveSession(req, res) {
  const userId = req.userId;
  if (!userId) {
    return res.status(401).json({ error: "Người dùng không được xác định." });
  }

  const { id, title, messages } = req.body;
  if (!id || !title || !messages) {
    return res.status(400).json({ error: "Thiếu thông tin lưu cuộc trò chuyện." });
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // 1. Cập nhật hoặc chèn mới phiên trò chuyện (Upsert)
    const sessionRes = await client.query(
      `INSERT INTO chat_sessions (id, user_id, title, is_pinned, updated_at)
       VALUES ($1, $2, $3, FALSE, CURRENT_TIMESTAMP)
       ON CONFLICT (id) 
       DO UPDATE SET title = EXCLUDED.title, updated_at = CURRENT_TIMESTAMP
       RETURNING *`,
      [String(id), userId, title]
    );

    // 2. Chèn tin nhắn mới hoặc cập nhật tin nhắn đã tồn tại
    const existingMsgsRes = await client.query(
      "SELECT id FROM chat_messages WHERE session_id = $1",
      [String(id)]
    );
    const existingMsgIds = new Set(existingMsgsRes.rows.map(r => String(r.id)));

    for (const msg of messages) {
      const msgId = String(msg.id);
      const filesJson = msg.files ? JSON.stringify(msg.files) : '[]';
      if (!existingMsgIds.has(msgId)) {
        await client.query(
          `INSERT INTO chat_messages (id, session_id, sender, text, files)
           VALUES ($1, $2, $3, $4, $5)`,
          [msgId, String(id), msg.sender, msg.text, filesJson]
        );
      } else {
        await client.query(
          `INSERT INTO chat_messages (id, session_id, sender, text, files)
           VALUES ($1, $2, $3, $4, $5)
           ON CONFLICT (id)
           DO UPDATE SET text = EXCLUDED.text, files = EXCLUDED.files`,
          [msgId, String(id), msg.sender, msg.text, filesJson]
        );
      }
    }

    await client.query("COMMIT");
    return res.json({ success: true, message: "Lưu lịch sử trò chuyện thành công." });
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Error saving chat session:", error);
    return res.status(500).json({ error: "Lỗi hệ thống khi lưu cuộc trò chuyện." });
  } finally {
    client.release();
  }
}

// Đường dẫn API: PUT /api/chat/history/pin/:id
export async function pinSession(req, res) {
  const userId = req.userId;
  const { id } = req.params;
  const { isPinned } = req.body;

  if (!userId) {
    return res.status(401).json({ error: "Người dùng không được xác định." });
  }

  try {
    const result = await pool.query(
      `UPDATE chat_sessions
       SET is_pinned = $1, updated_at = CURRENT_TIMESTAMP
       WHERE id = $2 AND user_id = $3
       RETURNING *`,
      [isPinned, id, userId]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Không tìm thấy cuộc trò chuyện hoặc bạn không có quyền." });
    }

    return res.json({ success: true, session: result.rows[0] });
  } catch (error) {
    console.error("Error pinning session:", error);
    return res.status(500).json({ error: "Lỗi hệ thống khi ghim cuộc trò chuyện." });
  }
}

// Đường dẫn API: PUT /api/chat/history/rename/:id
export async function renameSession(req, res) {
  const userId = req.userId;
  const { id } = req.params;
  const { title } = req.body;

  if (!userId) {
    return res.status(401).json({ error: "Người dùng không được xác định." });
  }

  try {
    const result = await pool.query(
      `UPDATE chat_sessions
       SET title = $1, updated_at = CURRENT_TIMESTAMP
       WHERE id = $2 AND user_id = $3
       RETURNING *`,
      [title, id, userId]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Không tìm thấy cuộc trò chuyện hoặc bạn không có quyền." });
    }

    return res.json({ success: true, session: result.rows[0] });
  } catch (error) {
    console.error("Error renaming session:", error);
    return res.status(500).json({ error: "Lỗi hệ thống khi đổi tên cuộc trò chuyện." });
  }
}

// Đường dẫn API: DELETE /api/chat/history/:id
export async function deleteSession(req, res) {
  const userId = req.userId;
  const { id } = req.params;

  if (!userId) {
    return res.status(401).json({ error: "Người dùng không được xác định." });
  }

  try {
    const result = await pool.query(
      `DELETE FROM chat_sessions
       WHERE id = $1 AND user_id = $2
       RETURNING *`,
      [id, userId]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: "Không tìm thấy cuộc trò chuyện hoặc bạn không có quyền." });
    }

    return res.json({ success: true, message: "Xóa cuộc trò chuyện thành công." });
  } catch (error) {
    console.error("Error deleting session:", error);
    return res.status(500).json({ error: "Lỗi hệ thống khi xóa cuộc trò chuyện." });
  }
}
