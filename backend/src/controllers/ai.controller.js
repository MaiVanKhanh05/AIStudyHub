import fs from "fs";
import path from "path";
import pool from "../../DB/db.js";
import { parsePDF, parseWord, parseExcel, parsePPTX } from "../services/ai/documentParser.service.js";

// Helper to download file into buffer
const downloadFileToBuffer = async (url) => {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to download file from ${url}: ${response.statusText}`);
  }
  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
};

// Helper to parse file on the fly
async function extractTextFromBuffer(buffer, fileUrl, fileType, title) {
  const rawType = (fileType || "").toUpperCase();
  const urlStr = (fileUrl || "").toUpperCase();
  const titleStr = (title || "").toUpperCase();

  if (rawType.includes("PDF") || urlStr.includes(".PDF") || titleStr.includes(".PDF")) {
    return await parsePDF(buffer);
  } else if (rawType.includes("WORD") || rawType.includes("DOC") || urlStr.includes(".DOC") || titleStr.includes(".DOC")) {
    return await parseWord(buffer);
  } else if (rawType.includes("EXCEL") || rawType.includes("SPREADSHEET") || rawType.includes("XLS") || rawType.includes("CSV") || urlStr.includes(".XLS") || urlStr.includes(".CSV") || titleStr.includes(".XLS") || titleStr.includes(".CSV")) {
    return await parseExcel(buffer);
  } else if (rawType.includes("PPT") || urlStr.includes(".PPT") || titleStr.includes(".PPT")) {
    const tempDir = path.join(process.cwd(), "temp_uploads");
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    const tempFilePath = path.join(tempDir, `temp_sum_${Date.now()}.pptx`);
    fs.writeFileSync(tempFilePath, buffer);
    try {
      return await parsePPTX(tempFilePath);
    } finally {
      if (fs.existsSync(tempFilePath)) {
        try {
          fs.unlinkSync(tempFilePath);
        } catch (err) {
          console.error("Cleanup temp file error in summarize:", err);
        }
      }
    }
  } else {
    // Plain text/code fallback
    return buffer.toString("utf8");
  }
}

// Call Gemini Generative AI API
async function callGemini(prompt) {
  const apiKey = process.env.GEMINI_API_KEY;
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

  const payload = {
    contents: [
      {
        role: "user",
        parts: [{ text: prompt }]
      }
    ],
    generationConfig: {
      temperature: 0.3,
      maxOutputTokens: 2048
    }
  };

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

// Call OpenAI chat completions
async function callOpenAI(prompt) {
  const apiKey = process.env.OPENAI_API_KEY;
  const url = "https://api.openai.com/v1/chat/completions";

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: "Bạn là một trợ lý tóm tắt học thuật chuyên nghiệp." },
        { role: "user", content: prompt }
      ],
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

// POST /api/ai/summarize
export async function summarizeDocument(req, res) {
  const { documentId, documentName } = req.body;

  if (!documentId) {
    return res.status(400).json({ error: "Mã tài liệu (documentId) là bắt buộc." });
  }

  const apiKey = process.env.GEMINI_API_KEY || process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({
      error: "Cấu hình API Key AI bị thiếu. Vui lòng cấu hình GEMINI_API_KEY hoặc OPENAI_API_KEY ở file .env của backend."
    });
  }

  try {
    // 1. Try to fetch extracted content from database chunks (RAG context)
    console.log(`[AI Summary] Fetching chunks from database for document ID: ${documentId}`);
    const chunkQuery = `
      SELECT chunk_text 
      FROM document_chunks 
      WHERE document_id = $1 
      ORDER BY chunk_index ASC
    `;
    const { rows } = await pool.query(chunkQuery, [documentId]);
    let documentContent = "";

    if (rows && rows.length > 0) {
      documentContent = rows.map(r => r.chunk_text).join("\n\n");
      console.log(`[AI Summary] Found ${rows.length} chunks from database.`);
    } else {
      // 2. Database chunks empty, fallback: fetch doc info & parse file URL on the fly
      console.log(`[AI Summary] No database chunks found. Fetching document metadata for ID: ${documentId}`);
      const docQuery = "SELECT * FROM document WHERE document_id = $1";
      const docResult = await pool.query(docQuery, [documentId]);

      if (docResult.rows.length === 0) {
        return res.status(404).json({ error: "Không tìm thấy thông tin tài liệu trong hệ thống." });
      }

      const doc = docResult.rows[0];
      if (!doc.file_url) {
        return res.status(400).json({ error: "Tài liệu không có đường dẫn tệp tin để tải về." });
      }

      console.log(`[AI Summary] Downloading file on the fly from: ${doc.file_url}`);
      const buffer = await downloadFileToBuffer(doc.file_url);

      console.log(`[AI Summary] Extracting text content on the fly...`);
      documentContent = await extractTextFromBuffer(buffer, doc.file_url, doc.file_type, doc.title);
    }

    if (!documentContent || documentContent.trim() === "") {
      return res.status(400).json({ error: "Nội dung tài liệu rỗng hoặc định dạng này không hỗ trợ trích xuất văn bản." });
    }

    // Limit maximum text content size sent to LLM to prevent token usage limit (around 100k chars)
    const MAX_SUMMARIZE_CHARS = 120000;
    if (documentContent.length > MAX_SUMMARIZE_CHARS) {
      documentContent = documentContent.slice(0, MAX_SUMMARIZE_CHARS) + "\n\n[...Đã cắt bớt phần sau do nội dung tài liệu quá dài...]";
    }

    // 3. Build Prompt matching structured summary requirements
    const prompt = `
Bạn là một chuyên gia tóm tắt học thuật AI. Hãy đọc và phân tích tài liệu "${documentName || 'tài liệu này'}" có nội dung dưới đây:

NỘI DUNG TÀI LIỆU:
${documentContent}

Hãy viết một bản tóm tắt học thuật thật chi tiết, rõ ràng và đầy đủ theo cấu trúc chính xác sau:

1. **Tổng quan (Overview)**: Tóm tắt ngắn gọn mục đích, bối cảnh và ý nghĩa của tài liệu (khoảng 3-5 câu).
2. **Các chủ đề chính (Main Topics)**: Liệt kê các chủ đề/nội dung lớn được đề cập trong tài liệu kèm theo giải thích ngắn gọn cho từng chủ đề.
3. **Các khái niệm quan trọng (Key Concepts)**: Liệt kê các thuật ngữ, khái niệm, công thức hoặc định nghĩa cốt lõi xuất hiện trong tài liệu.
4. **Lưu ý quan trọng (Important Notes)**: Các thông tin, số liệu, bài học hoặc điểm lưu ý quan trọng cần ghi nhớ.
5. **5 câu hỏi ôn tập (5 Review Questions)**: Tạo chính xác 5 câu hỏi tự luận hoặc trắc nghiệm kèm gợi ý đáp án ngắn để người đọc tự ôn tập lại kiến thức trong tài liệu.

Yêu cầu:
- Trình bày bằng tiếng Việt.
- Sử dụng định dạng Markdown rõ ràng, chuyên nghiệp.
- Không tự suy diễn thông tin ngoài tài liệu.
`;

    console.log(`[AI Summary] Sending prompt to AI...`);
    let summaryText = "";
    if (process.env.GEMINI_API_KEY) {
      summaryText = await callGemini(prompt);
    } else {
      summaryText = await callOpenAI(prompt);
    }

    return res.json({ summary: summaryText });
  } catch (error) {
    console.error("AI Summarize Error:", error);
    return res.status(500).json({ error: `Lỗi hệ thống khi tóm tắt: ${error.message}` });
  }
}
