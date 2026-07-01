import fs from "fs";
import path from "path";
import { getCommunityDocumentCatalog, searchCommunityDocsByKeyword } from "../repositories/document.repository.js";

import {
  parsePDF,
  parseWord,
  parseExcel,
  parsePPTX,
  parseZip,
  parseImageViaLLM
} from "../services/ai/documentParser.service.js";
import { searchVectorDB, initOpenAI } from "../services/ai/chat.service.js";
import pool from "../../DB/db.js";

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

  // Tính điểm liên quan cho từng tài liệu
  const scored = allDocs.map(d => {
    let score = 0;
    const title = (d.title || '').toLowerCase();
    const subject = (d.subject_name || d.subject_code || '').toLowerCase();
    const desc = (d.description || '').toLowerCase();

    // Khớp chính xác tên môn học hoặc mã môn → điểm cao
    if (subject && msg.includes(subject)) score += 10;
    if (d.subject_code && msg.includes(d.subject_code.toLowerCase())) score += 10;

    // Ưu tiên tài liệu AI Hot Docs
    if (d.is_ai_featured) score += 15;

    // Khớp từng từ trong title
    const titleWords = title.split(/[\s\-_.,]+/).filter(w => w.length > 2);
    titleWords.forEach(word => {
      if (msg.includes(word)) score += 3;
    });

    // Khớp trong description
    const descWords = desc.split(/[\s\-_.,]+/).filter(w => w.length > 3);
    descWords.forEach(word => {
      if (msg.includes(word)) score += 1;
    });

    // Từ khóa chuyên ngành CNTT chung → gợi ý tài liệu liên quan lĩnh vực
    const itKeywords = ['tài liệu', 'document', 'học', 'môn', 'bài', 'slide', 'lab', 'assignment',
      'software', 'web', 'programming', 'lập trình', 'kỹ thuật', 'phần mềm',
      'testing', 'kiểm thử', 'database', 'cơ sở dữ liệu', 'java', 'python',
      'javascript', 'algorithm', 'thuật toán', 'network', 'mạng'];
    itKeywords.forEach(kw => {
      if (msg.includes(kw) && (title.includes(kw) || subject.includes(kw))) score += 2;
    });

    return { doc: d, score };
  });

  // Lọc và sắp xếp theo điểm
  const relevant = scored
    .filter(s => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5) // tối đa 5 tài liệu gợi ý
    .map(s => s.doc);

  // Bỏ đi fallback trả về top 3 tài liệu ngẫu nhiên vì nó gây khó hiểu cho người dùng
  // (ví dụ trả về bài văn "Đồng Chí" khi đang nói về kiểm thử phần mềm)

  return relevant;
}

export async function chatQuery(req, res) {
  const { message, history = [], aiMode = "General AI", documentId = null } = req.body;
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

      const eventString = JSON.stringify({
        event: "flashcard_created",
        setId: flashcardResult.setId
      });

      return res.json({
        response: eventString,
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
      const eventString = JSON.stringify({
        event: "quiz_created",
        quizId: quizResult.quizId
      });

      return res.json({
        response: eventString,
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

  const apiKey = process.env.GEMINI_API_KEY || process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return res.json({
      response: "⚠️ **[LỖI CẤU HÌNH HỆ THỐNG]**\nChưa phát hiện thấy API Key của AI trên máy chủ.\n\nVui lòng làm theo hướng dẫn sau:\n1. Mở tệp `.env` tại thư mục `/backend` của dự án.\n2. Cấu hình khóa học thuật của bạn bằng cách bổ sung dòng:\n   `GEMINI_API_KEY=your_gemini_api_key` hoặc `OPENAI_API_KEY=your_openai_api_key`\n3. Khởi động lại máy chủ backend để áp dụng cấu hình."
    });
  }

  try {
    let systemInstruction = "";
    let additionalContext = "";

    // 1. Thiết lập các hướng dẫn theo chế độ (mode)
    const modeInstructions = {
      "Scholar": "Bạn là Học giả AI (Scholar Core). Hãy giải thích kiến thức theo phong cách sư phạm học thuật, bài bản, khoa học nhưng cực kỳ dễ hiểu, diễn giải chi tiết các định nghĩa khó và cung cấp ví dụ thực tiễn trực quan.",
      "Research": "Bạn là Nhà nghiên cứu AI (Research Expert). Hãy tìm kiếm, tổng hợp và đối chiếu thông tin từ các nguồn học thuật uy tín. Trình bày chặt chẽ, khách quan và trích dẫn trực tiếp nguồn tham khảo rõ ràng.",
      "Coding": "Bạn là Chuyên gia Lập trình AI (Coding Agent). Hãy tạo code chất lượng cao, tối ưu, sạch sẽ, debug lỗi chi tiết và giải thích cấu trúc lập trình rõ ràng từng dòng lệnh.",
      "Summarize": "Bạn là Chuyên gia Tóm tắt AI. Hãy phân tích tài liệu hoặc nội dung được cung cấp, tóm tắt cực kỳ súc tích, cô đọng các ý chính, số liệu và kiến trúc tổng quan dưới dạng danh sách.",
      "Translation": "Bạn là Chuyên gia Dịch thuật AI. Hãy dịch thuật chính xác, tự nhiên giữa các ngôn ngữ, đảm bảo truyền tải đúng sắc thái và thuật ngữ chuyên ngành học thuật.",
      "General AI": "Bạn là Trợ lý Học tập AIStudyHub đa năng. Hãy trò chuyện thân thiện, cởi mở, giải đáp chung các vấn đề học tập và hỗ trợ tư duy học viên."
    };

    systemInstruction = modeInstructions[aiMode] || modeInstructions["General AI"];

    // 2. Phục hồi documentContext từ lịch sử nếu người dùng không upload file mới nhưng đã upload file trước đó trong cùng phiên chat
    if (!documentContext && history && history.length > 0) {
      const historyFiles = [];
      for (const h of history) {
        if (h.sender === "user" && h.files && h.files.length > 0) {
          h.files.forEach(f => {
            historyFiles.push(`--- TẬP TIN (Từ lịch sử): ${f.name} ---\n${f.content || ""}`);
          });
        }
      }
      if (historyFiles.length > 0) {
        documentContext = historyFiles.join("\n\n");
      }
    }

    // 3. Kiểm tra xem chat có bị giới hạn trong ngữ cảnh tài liệu hay không
    let suggestedDocs = []; // Danh sách tài liệu gợi ý trả về cho frontend

    if (documentContext) {
      systemInstruction += "\n\nCRITICAL: Bạn phải TRẢ LỜI CÂU HỎI CHỈ DỰA TRÊN ngữ cảnh tài liệu đã tải lên dưới đây. Tuyệt đối không dùng thông tin hoặc kiến thức bên ngoài tài liệu. Nếu câu hỏi nằm ngoài tài liệu, hãy trả lời lịch sự rằng thông tin này không có trong tài liệu và khuyên người dùng tập trung vào chủ đề của file.";
      additionalContext = `[NGỮ CẢNH TÀI LIỆU ĐÃ UPLOAD]\n${documentContext}\n\n[HẾT NGỮ CẢNH TÀI LIỆU - Vui lòng trả lời câu hỏi dựa trên nội dung này]`;
    } else {
      // 1. Tạo Context tìm kiếm từ lịch sử chat để RAG hiểu được ý định "tài liệu trên nói về gì"
      let searchContext = message;
      if (history && history.length > 0) {
        const lastFewUserMsgs = history
          .filter(h => h.sender === "user" || h.sender === "ai")
          .slice(-3) // lấy 3 tin nhắn gần nhất để lấy bối cảnh
          .map(h => h.text)
          .join("\n");
        searchContext = lastFewUserMsgs + "\nCâu hỏi hiện tại: " + message;
      }

      // Lấy catalog tài liệu cộng đồng để map ID sang Docs
      const allCommunityDocs = await getCommunityDocumentCatalog();
      console.log(`[AI CHAT] Catalog: ${allCommunityDocs.length} docs | Query: "${message.slice(0, 80)}"`);

      // 2. Vector Search (RAG)
      const aiClient = initOpenAI();
      let ragContext = "";
      if (aiClient && process.env.OPENAI_API_KEY) {
        try {
          const embedResponse = await aiClient.embeddings.create({
            model: "text-embedding-3-small",
            input: searchContext.slice(-2000), // giới hạn độ dài string gửi lên OpenAI embed
          });
          const queryEmbedding = embedResponse.data[0].embedding;
          const relevantChunks = await searchVectorDB(queryEmbedding, 6);

          if (relevantChunks && relevantChunks.length > 0) {
            ragContext = relevantChunks.map(chunk => chunk.chunk_text).join("\n\n---\n\n");
            additionalContext = `[NGỮ CẢNH TỪ HỆ THỐNG TÀI LIỆU]\n${ragContext}\n\n[HẾT NGỮ CẢNH HỆ THỐNG TÀI LIỆU]`;
            systemInstruction += "\n\nCRITICAL: Bạn đang đóng vai trò tìm kiếm tài liệu. Hãy trả lời câu hỏi dựa trên [NGỮ CẢNH TỪ HỆ THỐNG TÀI LIỆU] được trích xuất từ CSDL dưới đây. Trích dẫn đúng tên tài liệu nếu cần.";

            // Map chunk to suggested docs
            const docIds = [...new Set(relevantChunks.map(c => c.document_id))];
            suggestedDocs = allCommunityDocs.filter(d => docIds.includes(d.document_id)).slice(0, 3);
          }
        } catch (e) {
          console.error("[Vector Search Error]", e);
        }
      }

      // 3. Nếu Vector DB không tìm thấy (hoặc bị lỗi), fallback về keyword search truyền thống
      if (!ragContext && allCommunityDocs.length > 0) {
        suggestedDocs = await searchRelevantDocs(searchContext, allCommunityDocs);
        systemInstruction += `\n\nHệ thống AIStudyHub có ${allCommunityDocs.length} tài liệu cộng đồng. Hãy trả lời câu hỏi của học viên một cách hữu ích.`;
      }
    }

    // 3. Xây dựng mảng tin nhắn
    const queryMessages = [];

    // Chuyển đổi lịch sử yêu cầu sang định dạng của LLM và tự động phân giải nội dung sự kiện
    for (const h of history) {
      let content = h.text || "";
      if (h.sender === "ai" && content.trim().startsWith("{") && content.trim().endsWith("}")) {
        try {
          const parsed = JSON.parse(content);
          if (parsed.event === "flashcard_created" && parsed.setId) {
            try {
              const setRes = await pool.query(
                `SELECT title, description, card_count FROM flashcard_sets WHERE set_id = $1`,
                [parsed.setId]
              );
              if (setRes.rows.length > 0) {
                const setInfo = setRes.rows[0];
                const cardsRes = await pool.query(
                  `SELECT front, back, card_type, topic FROM flashcards WHERE set_id = $1 AND status = 'ACTIVE' ORDER BY card_id ASC`,
                  [parsed.setId]
                );
                let cardsText = cardsRes.rows.map((c, idx) => 
                  `${idx + 1}. [${c.card_type}] Mặt trước: "${c.front}" -> Mặt sau: "${c.back}" (Chủ đề: ${c.topic})`
                ).join("\n");
                
                content = `[HỆ THỐNG]: Đã tạo thành công bộ thẻ ghi nhớ (Flashcard) "${setInfo.title}" (${setInfo.card_count} câu).\nDưới đây là danh sách các thẻ ghi nhớ đã tạo:\n${cardsText}`;
              }
            } catch (err) {
              console.error("Error enrichment history flashcard:", err);
            }
          } else if (parsed.event === "quiz_created" && parsed.quizId) {
            try {
              const quizRes = await pool.query(
                `SELECT title FROM quizzes WHERE quiz_id = $1`,
                [parsed.quizId]
              );
              if (quizRes.rows.length > 0) {
                const quizInfo = quizRes.rows[0];
                const qRes = await pool.query(
                  `SELECT question_text, options, correct_answer, explanation, topic FROM quiz_questions WHERE quiz_id = $1 ORDER BY question_id ASC`,
                  [parsed.quizId]
                );
                let qText = qRes.rows.map((q, idx) => {
                  const opts = Array.isArray(q.options) ? q.options : JSON.parse(q.options || "[]");
                  return `${idx + 1}. Câu hỏi: "${q.question_text}"\n   Các phương án: ${opts.join(", ")}\n   Đáp án đúng: Phương án chỉ số ${q.correct_answer} (Nội dung: ${opts[q.correct_answer]})\n   Giải thích: ${q.explanation}\n   Chủ đề: ${q.topic}`;
                }).join("\n\n");
                
                content = `[HỆ THỐNG]: Đã tạo thành công bộ câu hỏi trắc nghiệm (Quiz) "${quizInfo.title}" (${qRes.rows.length} câu).\nDưới đây là chi tiết các câu hỏi đã tạo:\n${qText}`;
              }
            } catch (err) {
              console.error("Error enrichment history quiz:", err);
            }
          }
        } catch (e) {
          // not a valid JSON event, keep original text
        }
      }

      queryMessages.push({
        role: h.sender === "ai" ? "assistant" : "user",
        content: content
      });
    }

    // Nối ngữ cảnh vào user message nếu có (chỉ khi có documentContext upload)
    const currentQueryWithContext = additionalContext
      ? `${additionalContext}\n\nCâu hỏi của học viên: ${message}`
      : message;

    queryMessages.push({
      role: "user",
      content: currentQueryWithContext
    });

    // 4. Gọi LLM đã được chọn
    let responseText = "";
    if (process.env.GEMINI_API_KEY) {
      responseText = await callGemini(queryMessages, systemInstruction);
    } else {
      responseText = await callOpenAI(queryMessages, systemInstruction);
    }

    // 5. Nối các link tài liệu gợi ý vào cuối câu trả lời của AI
    // Việc này giúp frontend (đã có hàm extractDocumentLinks) tự động nhận diện
    // và biến đổi các link này thành các Document Card đẹp mắt, đồng thời
    // cũng giúp lưu lịch sử chat vào DB dễ dàng dưới dạng văn bản.
    let finalResponseText = responseText;
    if (suggestedDocs && suggestedDocs.length > 0) {
      finalResponseText += "\n\n";
      suggestedDocs.forEach(d => {
        finalResponseText += `http://localhost:3000/preview/${d.document_id}\n`;
      });
    }

    return res.json({
      response: finalResponseText
    });
  } catch (error) {
    console.error("Chat Query Error:", error);
    return res.status(500).json({ error: `Lỗi kết nối AI: ${error.message}` });
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
