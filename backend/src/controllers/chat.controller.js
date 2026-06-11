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
      return res.status(400).json({ error: `Định dạng tệp ${ext} không được hỗ trợ.` });
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
