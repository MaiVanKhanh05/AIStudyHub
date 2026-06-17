import fs from "fs";
import path from "path";
import { orchestrateSearch } from "../services/ai/search.service.js";
import {
  parsePDF,
  parseWord,
  parseExcel,
  parsePPTX,
  parseZip,
  parseImageViaLLM
} from "../services/ai/documentParser.service.js";
import pool from "../../DB/db.js";

// Endpoint: POST /api/chat/upload-temp
export async function uploadTempFile(req, res) {
  if (!req.file) {
    return res.status(400).json({ error: "Không tìm thấy tệp tải lên." });
  }

  const originalName = req.file.originalname;
  const mimeType = req.file.mimetype;
  const ext = path.extname(originalName).toLowerCase();
  
  // Ensure temp_uploads directory exists
  const tempDir = path.join(process.cwd(), "temp_uploads");
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }

  const tempFilePath = path.join(tempDir, `temp_${Date.now()}_${originalName}`);
  let fileWritten = false;
  let extractedText = "";

  try {
    // 1. Process files that require a file path
    if (ext === ".pptx" || ext === ".zip") {
      fs.writeFileSync(tempFilePath, req.file.buffer);
      fileWritten = true;
    }

    // 2. Route parsing based on extension
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
      // Fallback for arbitrary code/text files: check if buffer contains NULL bytes in the first 512 bytes
      const hasNullBytes = req.file.buffer.slice(0, 512).includes(0);
      if (!hasNullBytes) {
        extractedText = req.file.buffer.toString("utf8");
      } else {
        // Gracefully support other binary formats by acknowledging their upload in the context
        extractedText = `[Đã đính kèm tệp nhị phân: ${originalName} (Kích thước: ${(req.file.size / 1024).toFixed(1)} KB). Hệ thống đã ghi nhận tệp nhị phân này làm ngữ cảnh cuộc trò chuyện.]`;
      }
    }

    return res.json({
      fileName: originalName,
      fileSize: req.file.size,
      fileType: ext.replace(".", "").toUpperCase(),
      extractedText: extractedText
    });
  } catch (error) {
    console.error("Error parsing upload file:", error);
    return res.status(500).json({ error: `Lỗi xử lý tài liệu: ${error.message}` });
  } finally {
    // Clean up temporary files
    if (fileWritten && fs.existsSync(tempFilePath)) {
      try {
        fs.unlinkSync(tempFilePath);
      } catch (err) {
        console.error("Cleanup temp file error:", err);
      }
    }
  }
}

// Helper: Call Gemini Generative AI API via HTTP fetch
async function callGemini(messages, systemInstruction) {
  const apiKey = process.env.GEMINI_API_KEY;
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

  // Re-format messages for Gemini
  // Gemini accepts: contents: [{ role: "user"|"model", parts: [{ text: "..." }] }]
  const contents = [];
  
  // Compile history and instructions
  for (const msg of messages) {
    let role = "user";
    if (msg.role === "assistant" || msg.role === "system") {
      role = "model";
    }
    
    // Gemini roles must alternate user/model. If consecutive are same role, combine them.
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

// Helper: Call OpenAI chat completions
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

// Endpoint: POST /api/chat
export async function chatQuery(req, res) {
  const { message, history = [], aiMode = "General AI", useWeb = false, useScholar = false, deepResearch = false, documentContext = "" } = req.body;

  if (!message) {
    return res.status(400).json({ error: "Câu hỏi không được để trống." });
  }

  const apiKey = process.env.GEMINI_API_KEY || process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return res.json({
      response: "⚠️ **[LỖI CẤU HÌNH HỆ THỐNG]**\nChưa phát hiện thấy API Key của AI trên máy chủ.\n\nVui lòng làm theo hướng dẫn sau:\n1. Mở tệp `.env` tại thư mục `/backend` của dự án.\n2. Cấu hình khóa học thuật của bạn bằng cách bổ sung dòng:\n   `GEMINI_API_KEY=your_gemini_api_key` hoặc `OPENAI_API_KEY=your_openai_api_key`\n3. Khởi động lại máy chủ backend để áp dụng cấu hình."
    });
  }

  try {
    let systemInstruction = "";
    let additionalContext = "";
    let searchCitations = [];

    // 1. Establish mode instructions
    const modeInstructions = {
      "Scholar": "Bạn là Học giả AI (Scholar Core). Hãy giải thích kiến thức theo phong cách sư phạm học thuật, bài bản, khoa học nhưng cực kỳ dễ hiểu, diễn giải chi tiết các định nghĩa khó và cung cấp ví dụ thực tiễn trực quan.",
      "Research": "Bạn là Nhà nghiên cứu AI (Research Expert). Hãy tìm kiếm, tổng hợp và đối chiếu thông tin từ các nguồn học thuật uy tín. Trình bày chặt chẽ, khách quan và trích dẫn trực tiếp nguồn tham khảo rõ ràng.",
      "Coding": "Bạn là Chuyên gia Lập trình AI (Coding Agent). Hãy tạo code chất lượng cao, tối ưu, sạch sẽ, debug lỗi chi tiết và giải thích cấu trúc lập trình rõ ràng từng dòng lệnh.",
      "Summarize": "Bạn là Chuyên gia Tóm tắt AI. Hãy phân tích tài liệu hoặc nội dung được cung cấp, tóm tắt cực kỳ súc tích, cô đọng các ý chính, số liệu và kiến trúc tổng quan dưới dạng danh sách.",
      "Translation": "Bạn là Chuyên gia Dịch thuật AI. Hãy dịch thuật chính xác, tự nhiên giữa các ngôn ngữ, đảm bảo truyền tải đúng sắc thái và thuật ngữ chuyên ngành học thuật.",
      "General AI": "Bạn là Trợ lý Học tập AIStudyHub đa năng. Hãy trò chuyện thân thiện, cởi mở, giải đáp chung các vấn đề học tập và hỗ trợ tư duy học viên."
    };

    systemInstruction = modeInstructions[aiMode] || modeInstructions["General AI"];

    // 2. Check if chat is restricted to document context
    if (documentContext) {
      systemInstruction += "\n\nCRITICAL: Bạn phải TRẢ LỜI CÂU HỎI CHỈ DỰA TRÊN ngữ cảnh tài liệu đã tải lên dưới đây. Tuyệt đối không dùng thông tin hoặc kiến thức bên ngoài tài liệu. Nếu câu hỏi nằm ngoài tài liệu, hãy trả lời lịch sự rằng thông tin này không có trong tài liệu và khuyên người dùng tập trung vào chủ đề của file.";
      
      additionalContext = `[NGỮ CẢNH TÀI LIỆU ĐÃ UPLOAD]\n${documentContext}\n\n[HẾT NGỮ CẢNH TÀI LIỆU - Vui lòng trả lời câu hỏi dựa trên nội dung này]`;
    } else {
      // Run search if enabled and no document context
      if (useWeb || useScholar) {
        const searchQuery = message;
        const searchResult = await orchestrateSearch(searchQuery, { useWeb, useScholar, deepResearch });
        
        if (searchResult.results.length > 0) {
          additionalContext = `[NGỮ CẢNH TÌM KIẾM HỌC THUẬT / WEB]\n${searchResult.contextString}\n\n`;
          searchCitations = searchResult.results;

          if (deepResearch) {
            systemInstruction += "\n\nBạn đang ở chế độ Lập luận sâu (Deep Research). Hãy phân tích, đối chiếu và so sánh chéo thông tin từ các nguồn tìm kiếm được cung cấp. Phân tích điểm giống/khác nhau và đưa ra kết luận logic, có cấu trúc Markdown rất rõ ràng.";
          }
        }
      }
    }

    // 3. Compile messages array
    const queryMessages = [];
    
    // Convert request history into LLM format
    for (const h of history) {
      queryMessages.push({
        role: h.sender === "ai" ? "assistant" : "user",
        content: h.text
      });
    }

    // Append current query with context
    const currentQueryWithContext = additionalContext 
      ? `${additionalContext}\n\nCâu hỏi của học viên: ${message}` 
      : message;

    queryMessages.push({
      role: "user",
      content: currentQueryWithContext
    });

    // 4. Invoke Selected LLM
    let responseText = "";
    if (process.env.GEMINI_API_KEY) {
      responseText = await callGemini(queryMessages, systemInstruction);
    } else {
      responseText = await callOpenAI(queryMessages, systemInstruction);
    }

    // 5. Enforce citations formatting if searches were performed
    if (searchCitations.length > 0 && !documentContext) {
      let citationSection = "\n\n📚 **Nguồn tham khảo**\n";
      searchCitations.forEach((source, idx) => {
        citationSection += `[${idx + 1}] ${source.title} - *${source.source}*${source.url ? ` (${source.url})` : ""}\n`;
      });
      responseText += citationSection;
    }

    return res.json({ response: responseText });
  } catch (error) {
    console.error("Chat Query Error:", error);
    return res.status(500).json({ error: `Lỗi kết nối AI: ${error.message}` });
  }
}

// Endpoint: GET /api/chat/history
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

    // Group messages by session_id
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

// Endpoint: POST /api/chat/history/save
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

    // 1. Upsert chat session
    const sessionRes = await client.query(
      `INSERT INTO chat_sessions (id, user_id, title, is_pinned, updated_at)
       VALUES ($1, $2, $3, FALSE, CURRENT_TIMESTAMP)
       ON CONFLICT (id) 
       DO UPDATE SET title = EXCLUDED.title, updated_at = CURRENT_TIMESTAMP
       RETURNING *`,
      [String(id), userId, title]
    );

    // 2. Insert new or update existing messages
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

// Endpoint: PUT /api/chat/history/pin/:id
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

// Endpoint: PUT /api/chat/history/rename/:id
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

// Endpoint: DELETE /api/chat/history/:id
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
