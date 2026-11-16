import pool from "../../../DB/db.js";
import { getTemporaryDocument } from "./tempDocumentStore.service.js";

/**
 * Distributed sampling of text chunks so large documents are covered evenly
 * from start to end without exceeding LLM context limits.
 */
function sampleChunksEvenly(chunks, maxChunks = 15, maxTotalChars = 18000) {
  if (!chunks || chunks.length === 0) return "";

  let selected = [];
  if (chunks.length <= maxChunks) {
    selected = chunks;
  } else {
    const step = (chunks.length - 1) / (maxChunks - 1);
    for (let i = 0; i < maxChunks; i++) {
      selected.push(chunks[Math.round(i * step)]);
    }
  }

  let combined = selected.join("\n\n");
  if (combined.length > maxTotalChars) {
    combined = combined.slice(0, maxTotalChars) + "\n\n[...nội dung được rút gọn bớt...]";
  }
  return combined;
}

/**
 * Split raw text into manageable chunks for distributed sampling.
 */
function splitTextIntoChunks(rawText, chunkSize = 1200) {
  if (!rawText || !rawText.trim()) return [];
  const paragraphs = rawText.split(/\n\n+/).map(p => p.trim()).filter(Boolean);
  const chunks = [];
  let current = "";

  for (const para of paragraphs) {
    if ((current + "\n\n" + para).length > chunkSize && current.length > 0) {
      chunks.push(current);
      current = para;
    } else {
      current = current ? `${current}\n\n${para}` : para;
    }
  }
  if (current) chunks.push(current);
  return chunks.length > 0 ? chunks : [rawText];
}

/**
 * Gather document context from uploaded files, temp store, system DB, or RAG chunks.
 */
export async function gatherStudyContext({ documentContext, sourceData, retrievalData }) {
  let titleHint = "";

  // 1. Direct documentContext from current request or chat history
  if (documentContext && documentContext.trim().length > 0) {
    const titleMatch = documentContext.match(/^---\s*TẬP TIN:\s*(.*?)\s*---/m);
    if (titleMatch) titleHint = titleMatch[1];

    const chunks = splitTextIntoChunks(documentContext);
    return {
      hasDocument: true,
      titleHint,
      contextText: sampleChunksEvenly(chunks)
    };
  }

  // 2. Uploaded temp document(s) in memory store
  if (sourceData?.sourceType === "UPLOADED_DOCUMENT") {
    const ids = sourceData.sourceIds?.length > 0
      ? sourceData.sourceIds
      : (sourceData.sourceId ? [sourceData.sourceId] : []);

    const allChunks = [];
    for (const id of ids) {
      const tempDoc = getTemporaryDocument(sourceData.sessionId, id);
      if (tempDoc) {
        if (!titleHint) titleHint = tempDoc.fileName;
        allChunks.push(...tempDoc.chunks.map(c => c.text));
      }
    }

    if (allChunks.length > 0) {
      return {
        hasDocument: true,
        titleHint,
        contextText: sampleChunksEvenly(allChunks)
      };
    }
  }

  // 3. System document in PostgreSQL
  if (sourceData?.sourceType === "SYSTEM_DOCUMENT" && sourceData.sourceId) {
    const docId = Number(sourceData.sourceId);
    if (!Number.isNaN(docId)) {
      const docRes = await pool.query(
        `SELECT title, extracted_content FROM document WHERE document_id = $1`,
        [docId]
      );
      if (docRes.rows.length > 0) {
        titleHint = docRes.rows[0].title || "";
        const chunkRes = await pool.query(
          `SELECT chunk_text FROM document_chunks WHERE document_id = $1 ORDER BY chunk_index ASC`,
          [docId]
        );
        let chunks = chunkRes.rows.map(r => r.chunk_text);
        if (chunks.length === 0 && docRes.rows[0].extracted_content) {
          chunks = splitTextIntoChunks(docRes.rows[0].extracted_content);
        }
        if (chunks.length > 0) {
          return {
            hasDocument: true,
            titleHint,
            contextText: sampleChunksEvenly(chunks)
          };
        }
      }
    }
  }

  // 4. Optional RAG evidence from Global Chat
  if (retrievalData?.chunks && retrievalData.chunks.length > 0) {
    const ragText = retrievalData.chunks.map(c => c.chunk_text).join("\n\n---\n\n");
    return {
      hasDocument: false,
      hasRagContext: true,
      titleHint: "",
      contextText: ragText.slice(0, 12000)
    };
  }

  return {
    hasDocument: false,
    hasRagContext: false,
    titleHint: "",
    contextText: ""
  };
}

/**
 * Parse requested item count from user prompt (no artificial upper cap).
 */
export function parseRequestedCount(message, type, defaultCount = 10) {
  const pattern = type === "flashcard"
    ? /(\d+)\s*(thẻ ghi nhớ|thẻ|flashcards|flashcard|flash cards|flash card|cards|card)/i
    : /(\d+)\s*(câu hỏi|câu|questions|question|q|bài)/i;

  const match = message.match(pattern);
  if (!match) return defaultCount;

  const parsed = parseInt(match[1], 10);
  if (Number.isNaN(parsed) || parsed < 1) return defaultCount;
  return parsed;
}

function extractAndParseJSON(rawText) {
  let cleaned = (rawText || "").trim();
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  }
  const firstBrace = cleaned.indexOf("{");
  const lastBrace = cleaned.lastIndexOf("}");
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    cleaned = cleaned.slice(firstBrace, lastBrace + 1);
  }
  return JSON.parse(cleaned);
}

async function callLLMForJSON(systemInstruction, userPrompt) {
  if (process.env.GEMINI_API_KEY) {
    const apiKey = process.env.GEMINI_API_KEY;
    const geminiModel = process.env.GEMINI_MODEL || "gemini-3.8-flash";
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent?key=${apiKey}`;

    const payload = {
      systemInstruction: { parts: [{ text: systemInstruction }] },
      contents: [{ role: "user", parts: [{ text: userPrompt }] }],
      generationConfig: {
        temperature: 0.4,
        maxOutputTokens: 4096,
        responseMimeType: "application/json"
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
    const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
    return extractAndParseJSON(rawText);
  }

  if (process.env.OPENAI_API_KEY) {
    const apiKey = process.env.OPENAI_API_KEY;
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || "gpt-6-luna",
        messages: [
          { role: "system", content: systemInstruction },
          { role: "user", content: userPrompt }
        ],
        response_format: { type: "json_object" }
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`OpenAI API error: ${errText}`);
    }

    const data = await response.json();
    const rawText = data.choices?.[0]?.message?.content || "{}";
    return extractAndParseJSON(rawText);
  }

  throw new Error("Chưa cấu hình GEMINI_API_KEY hoặc OPENAI_API_KEY.");
}

function normalizeCorrectAnswer(correctAnswer, options) {
  const raw = String(correctAnswer || "").trim();
  const letterMatch = raw.match(/^([A-Da-d])(?:[.):\s]|$)/);
  if (letterMatch) return letterMatch[1].toUpperCase();

  // If LLM returned full option text, match against options
  const idx = options.findIndex(opt => opt.toLowerCase().includes(raw.toLowerCase()));
  if (idx >= 0 && idx < 4) {
    return ["A", "B", "C", "D"][idx];
  }
  return "A";
}

/**
 * Generate a Quiz from prompt and/or document context (supports any count via batching).
 */
export async function generateQuiz({ message, documentContext, sourceData, retrievalData }) {
  const totalCount = parseRequestedCount(message, "quiz", 10);
  const studyCtx = await gatherStudyContext({ documentContext, sourceData, retrievalData });

  const BATCH_SIZE = 25;
  const numBatches = Math.ceil(totalCount / BATCH_SIZE);
  const allRawQuestions = [];
  let resolvedTitle = "";
  let resolvedTopic = "";

  // Prepare raw chunks for multi-batch coverage if documentContext is large
  const docChunks = studyCtx.hasDocument && documentContext
    ? splitTextIntoChunks(documentContext, 1500)
    : [];

  for (let b = 0; b < numBatches; b++) {
    const batchCount = b === numBatches - 1 ? totalCount - b * BATCH_SIZE : BATCH_SIZE;

    let batchContext = studyCtx.contextText;
    if (docChunks.length > 0 && numBatches > 1) {
      const perBatch = Math.max(1, Math.ceil(docChunks.length / numBatches));
      const slice = docChunks.slice(b * perBatch, (b + 1) * perBatch);
      if (slice.length > 0) {
        batchContext = sampleChunksEvenly(slice, 15, 18000);
      }
    }

    const systemInstruction = `Bạn là trợ lý học thuật AIStudyHub chuyên tạo câu hỏi trắc nghiệm (Quiz) chất lượng cao.
Bạn PHẢI trả về JSON hợp lệ theo đúng cấu trúc sau (không thêm văn bản ngoài JSON):
{
  "title": "Tiêu đề ngắn gọn của bài Quiz",
  "topic": "Chủ đề chính",
  "questions": [
    {
      "question": "Nội dung câu hỏi rõ ràng?",
      "options": ["A. Lựa chọn A", "B. Lựa chọn B", "C. Lựa chọn C", "D. Lựa chọn D"],
      "correctAnswer": "A",
      "explanation": "Giải thích ngắn gọn, chính xác vì sao đáp án này đúng."
    }
  ]
}

QUY TẮC:
- Tạo đúng ${batchCount} câu hỏi trắc nghiệm 4 lựa chọn (A, B, C, D).
- "correctAnswer" chỉ ghi 1 chữ cái in hoa: "A", "B", "C", hoặc "D".
- Không lặp lại câu hỏi đã có ở phần trước (nếu đây là phần ${b + 1}/${numBatches}).
- Nếu có tài liệu đính kèm, CHỈ tạo câu hỏi dựa trên nội dung tài liệu đó, không bịa đặt thông tin sai lệch.
- Nếu không có tài liệu đính kèm, hãy tạo câu hỏi chính xác về mặt học thuật theo yêu cầu trong prompt của người dùng.
- Ngôn ngữ: mặc định Tiếng Việt (trừ khi người dùng yêu cầu ngôn ngữ khác hoặc tài liệu hoàn toàn bằng tiếng Anh và người dùng không chỉ định).`;

    let userPrompt = `Yêu cầu của người dùng: "${message}"\nSố lượng câu hỏi phần này: ${batchCount} (Phần ${b + 1}/${numBatches})\n`;
    if (studyCtx.hasDocument) {
      userPrompt += `\n[NỘI DUNG TÀI LIỆU${studyCtx.titleHint ? ` - ${studyCtx.titleHint}` : ""}]\n${batchContext}\n[HẾT NỘI DUNG TÀI LIỆU]`;
    } else if (studyCtx.hasRagContext) {
      userPrompt += `\n[TÀI LIỆU THAM KHẢO TRONG HỆ THỐNG]\n${batchContext}\n[HẾT TÀI LIỆU THAM KHẢO]`;
    }

    const parsed = await callLLMForJSON(systemInstruction, userPrompt);
    if (!resolvedTitle && parsed.title) resolvedTitle = String(parsed.title).trim();
    if (!resolvedTopic && parsed.topic) resolvedTopic = String(parsed.topic).trim();
    if (Array.isArray(parsed.questions)) {
      allRawQuestions.push(...parsed.questions);
    }
  }

  if (allRawQuestions.length === 0) {
    throw new Error("Không thể tạo câu hỏi trắc nghiệm từ yêu cầu này. Vui lòng thử lại với nội dung rõ ràng hơn.");
  }

  const questions = allRawQuestions.map((q, idx) => {
    const options = Array.isArray(q.options) && q.options.length > 0
      ? q.options.map(String)
      : ["A. Đúng", "B. Sai", "C. Không xác định", "D. Khác"];
    const correctAnswer = normalizeCorrectAnswer(q.correctAnswer, options);
    return {
      id: idx + 1,
      question: String(q.question || `Câu hỏi ${idx + 1}`).trim(),
      options,
      correctAnswer,
      explanation: String(q.explanation || "").trim()
    };
  });

  const title = resolvedTitle || (studyCtx.titleHint ? `Quiz: ${studyCtx.titleHint}` : "Bài Quiz ôn tập");
  const topic = resolvedTopic;

  let mdText = `✅ **Đã tạo bài Quiz: ${title}** (${questions.length} câu hỏi)\n\n`;
  questions.forEach((q, i) => {
    mdText += `**Câu ${i + 1}:** ${q.question}\n`;
    q.options.forEach(opt => {
      mdText += `- ${opt}\n`;
    });
    mdText += `\n**Đáp án đúng:** ${q.correctAnswer}\n`;
    if (q.explanation) {
      mdText += `**Giải thích:** ${q.explanation}\n`;
    }
    mdText += `\n---\n\n`;
  });

  return {
    markdown: mdText.trim(),
    quizData: {
      title,
      topic,
      count: questions.length,
      fromDocument: studyCtx.hasDocument,
      questions
    }
  };
}

/**
 * Generate a Flashcard set from prompt and/or document context (supports any count via batching).
 */
export async function generateFlashcards({ message, documentContext, sourceData, retrievalData }) {
  const totalCount = parseRequestedCount(message, "flashcard", 10);
  const studyCtx = await gatherStudyContext({ documentContext, sourceData, retrievalData });

  const BATCH_SIZE = 25;
  const numBatches = Math.ceil(totalCount / BATCH_SIZE);
  const allRawCards = [];
  let resolvedTitle = "";
  let resolvedTopic = "";

  const docChunks = studyCtx.hasDocument && documentContext
    ? splitTextIntoChunks(documentContext, 1500)
    : [];

  for (let b = 0; b < numBatches; b++) {
    const batchCount = b === numBatches - 1 ? totalCount - b * BATCH_SIZE : BATCH_SIZE;

    let batchContext = studyCtx.contextText;
    if (docChunks.length > 0 && numBatches > 1) {
      const perBatch = Math.max(1, Math.ceil(docChunks.length / numBatches));
      const slice = docChunks.slice(b * perBatch, (b + 1) * perBatch);
      if (slice.length > 0) {
        batchContext = sampleChunksEvenly(slice, 15, 18000);
      }
    }

    const systemInstruction = `Bạn là trợ lý học thuật AIStudyHub chuyên tạo bộ thẻ ghi nhớ (Flashcard) ngắn gọn, súc tích, dễ ôn tập.
Bạn PHẢI trả về JSON hợp lệ theo đúng cấu trúc sau (không thêm văn bản ngoài JSON):
{
  "title": "Tiêu đề bộ Flashcard",
  "topic": "Chủ đề chính",
  "flashcards": [
    {
      "front": "Thuật ngữ, khái niệm hoặc câu hỏi ngắn ở mặt trước",
      "back": "Định nghĩa, giải thích hoặc đáp án súc tích ở mặt sau"
    }
  ]
}

QUY TẮC:
- Tạo đúng ${batchCount} thẻ ghi nhớ.
- Mỗi thẻ tập trung vào 1 khái niệm/công thức/ý chính quan trọng, dễ nhớ.
- Không lặp lại thẻ đã có ở phần trước (nếu đây là phần ${b + 1}/${numBatches}).
- Nếu có tài liệu đính kèm, CHỈ tạo thẻ dựa trên nội dung tài liệu đó.
- Nếu không có tài liệu đính kèm, hãy tạo thẻ chính xác về mặt học thuật theo yêu cầu trong prompt của người dùng.
- Ngôn ngữ: mặc định Tiếng Việt (trừ khi người dùng yêu cầu ngôn ngữ khác).`;

    let userPrompt = `Yêu cầu của người dùng: "${message}"\nSố lượng thẻ phần này: ${batchCount} (Phần ${b + 1}/${numBatches})\n`;
    if (studyCtx.hasDocument) {
      userPrompt += `\n[NỘI DUNG TÀI LIỆU${studyCtx.titleHint ? ` - ${studyCtx.titleHint}` : ""}]\n${batchContext}\n[HẾT NỘI DUNG TÀI LIỆU]`;
    } else if (studyCtx.hasRagContext) {
      userPrompt += `\n[TÀI LIỆU THAM KHẢO TRONG HỆ THỐNG]\n${batchContext}\n[HẾT TÀI LIỆU THAM KHẢO]`;
    }

    const parsed = await callLLMForJSON(systemInstruction, userPrompt);
    if (!resolvedTitle && parsed.title) resolvedTitle = String(parsed.title).trim();
    if (!resolvedTopic && parsed.topic) resolvedTopic = String(parsed.topic).trim();
    if (Array.isArray(parsed.flashcards)) {
      allRawCards.push(...parsed.flashcards);
    }
  }

  if (allRawCards.length === 0) {
    throw new Error("Không thể tạo bộ Flashcard từ yêu cầu này. Vui lòng thử lại với nội dung rõ ràng hơn.");
  }

  const flashcards = allRawCards.map((c, idx) => ({
    id: idx + 1,
    front: String(c.front || `Khái niệm ${idx + 1}`).trim(),
    back: String(c.back || "").trim()
  }));

  const title = resolvedTitle || (studyCtx.titleHint ? `Flashcard: ${studyCtx.titleHint}` : "Bộ thẻ ghi nhớ ôn tập");
  const topic = resolvedTopic;

  let mdText = `✅ **Đã tạo bộ Flashcard: ${title}** (${flashcards.length} thẻ)\n\n`;
  flashcards.forEach((card, i) => {
    mdText += `**Thẻ ${i + 1}:**\n- **Mặt trước:** ${card.front}\n- **Mặt sau:** ${card.back}\n\n`;
  });

  return {
    markdown: mdText.trim(),
    flashcardData: {
      title,
      topic,
      count: flashcards.length,
      fromDocument: studyCtx.hasDocument,
      flashcards
    }
  };
}

/**
 * When user specifies a target section in customPrompt (e.g. "buổi 3", "chương 2", "35-37"),
 * locate ALL matching sections in raw documentContext and return their full content
 * (up to next sibling section, or up to maxChars).
 */
function extractFocusedDocumentSlice(documentContext, customPrompt, maxChars = 60000) {
  if (!documentContext || !customPrompt || !customPrompt.trim()) return null;

  const promptLower = customPrompt.toLowerCase().trim();
  const markerMatches = promptLower.match(/(?:buổi|buoi|chương|chuong|phần|phan|unit|lesson|part|bài|bai|test)\s*\d+|\d+\s*-\s*\d+/gi) || [];
  if (markerMatches.length === 0) return null;

  const collected = [];
  let totalLen = 0;

  for (const rawMarker of markerMatches) {
    const cleanMarker = rawMarker.replace(/\s+/g, "\\s*").replace(/-/g, "\\s*-\\s*");
    const regex = new RegExp(cleanMarker, "gi");
    const matches = [...documentContext.matchAll(regex)];
    if (matches.length === 0) continue;

    // Determine next sibling marker pattern (e.g. "buổi 3" -> next "buổi \d+" that isn't 3)
    const numMatch = rawMarker.match(/\d+/);
    const prefixMatch = rawMarker.match(/^(buổi|buoi|chương|chuong|phần|phan|unit|lesson|part|bài|bai|test)/i);

    for (let i = 0; i < matches.length; i++) {
      const m = matches[i];
      const start = Math.max(0, m.index - 100);
      let end = Math.min(documentContext.length, start + maxChars);

      if (prefixMatch) {
        const nextSiblingRegex = new RegExp(`\\n\\s*${prefixMatch[1]}\\s*\\d+`, "i");
        const afterText = documentContext.slice(m.index + m[0].length);
        const nextMatch = nextSiblingRegex.exec(afterText);
        if (nextMatch && nextMatch.index > 150) {
          // Only stop at next sibling if it's a different number
          const nextNum = nextMatch[0].match(/\d+/);
          if (!numMatch || !nextNum || nextNum[0] !== numMatch[0]) {
            end = Math.min(end, m.index + m[0].length + nextMatch.index);
          }
        }
      }

      const slice = documentContext.slice(start, end);
      // Avoid tiny TOC-only snippets if there's a real content match
      if (slice.trim().length > 100 || matches.length === 1) {
        if (totalLen + slice.length <= maxChars) {
          collected.push(slice);
          totalLen += slice.length;
        }
      }
    }
  }

  return collected.length > 0 ? collected.join("\n\n---\n\n") : null;
}

/**
 * Analyze a document (or prompt) and organize it into:
 * 1 Master Folder -> Large Sections -> Small Practice Lessons.
 * Loads ALL sections across the full document (using multi-window analysis for very large files).
 */
export async function analyzeDocumentForPractice({ fileName = "", documentContext = "", documentId = null, sessionId = "anonymous_session", customPrompt = "" }) {
  const sourceData = documentId
    ? {
        sourceType: String(documentId).startsWith("temp-doc-") ? "UPLOADED_DOCUMENT" : "SYSTEM_DOCUMENT",
        sourceId: documentId,
        sourceIds: [documentId],
        sessionId
      }
    : null;

  let fullText = documentContext || "";
  if (!fullText && sourceData) {
    const studyCtx = await gatherStudyContext({ documentContext: "", sourceData, retrievalData: null });
    fullText = studyCtx.contextText || "";
  }

  const focusedSlice = extractFocusedDocumentSlice(fullText, customPrompt, 60000);
  const effectiveText = focusedSlice || fullText;
  const hasDocument = Boolean(effectiveText && effectiveText.trim().length > 0);

  if (!hasDocument && !customPrompt.trim()) {
    throw new Error("Vui lòng tải lên tài liệu hoặc nhập chủ đề muốn luyện tập.");
  }

  const systemInstruction = `Bạn là chuyên gia thiết kế lộ trình học tập của AIStudyHub.
Nhiệm vụ: Phân tích tài liệu (hoặc chủ đề) được cung cấp và chia thành cấu trúc cây học tập gồm:
- 1 Folder tổng (folderTitle)
- Các Mục lớn (sections: chương, phần, chủ đề lớn trong tài liệu)
- Bên trong mỗi Mục lớn là các Bài tập nhỏ (lessons: các phần kiến thức/từ vựng nhỏ gọn để ôn tập hiệu quả).

Trả về JSON hợp lệ theo đúng cấu trúc sau:
{
  "folderTitle": "Tên Folder tổng (ngắn gọn, rõ ràng)",
  "description": "Mô tả tổng quan nội dung tài liệu/chủ đề",
  "isVocabularyDoc": true,
  "sections": [
    {
      "id": "sec-1",
      "title": "Mục lớn 1: Tên phần/chương",
      "summary": "Tóm tắt ngắn mục lớn này",
      "lessons": [
        {
          "id": "les-1-1",
          "title": "Bài 1.1: Tên bài tập nhỏ (ghi rõ mã phần/câu nếu có, VD: Câu 35-37)",
          "focus": "Ghi chính xác tiêu đề/mã số xuất hiện trong tài liệu (VD: '35-37:', 'Buổi 3') và mô tả ngắn nội dung cần trích xuất"
        }
      ]
    }
  ]
}

QUY TẮC:
- Nếu người dùng chỉ định rõ một phần cụ thể trong yêu cầu (ví dụ: "buổi 3", "chương 2", "35-37"), CHỈ phân tích và tạo cấu trúc cho ĐÚNG phần đó, nhưng PHẢI lấy ĐẦY ĐỦ tất cả các mục lớn và bài nhỏ nằm trong phần đó (không được bỏ sót phần cuối).
- Nếu tài liệu có nhiều phần/chương/nhóm câu (ví dụ: 32-34, 35-37, 38-40, Part 3, Part 4, Part 6, Part 7...), hãy chia ĐẦY ĐỦ tất cả các nhóm đó thành các Bài tập nhỏ và ghi CHÍNH XÁC mã nhóm/tiêu đề vào "title" và "focus".
- "isVocabularyDoc": đặt true nếu tài liệu chủ yếu về từ vựng tiếng Anh/ngoại ngữ hoặc thuật ngữ song ngữ; đặt false nếu là kiến thức môn học thông thường.
- Ngôn ngữ tiêu đề/mô tả: Tiếng Việt rõ ràng.`;

  // Split into 50,000-char windows if the text is very large so NO section is skipped
  const WINDOW_SIZE = 50000;
  const windows = [];
  if (!hasDocument) {
    windows.push("");
  } else if (effectiveText.length <= WINDOW_SIZE) {
    windows.push(effectiveText);
  } else {
    for (let pos = 0; pos < effectiveText.length; pos += WINDOW_SIZE) {
      windows.push(effectiveText.slice(pos, pos + WINDOW_SIZE));
    }
  }

  let folderTitle = "";
  let description = "";
  let isVocabularyDoc = false;
  const allSections = [];

  for (let wIdx = 0; wIdx < windows.length; wIdx++) {
    let userPrompt = "";
    if (customPrompt.trim()) {
      userPrompt += `Yêu cầu bổ sung của người dùng: "${customPrompt.trim()}"\n`;
    }
    if (fileName) {
      userPrompt += `Tên file tài liệu: ${fileName}\n`;
    }
    if (hasDocument) {
      userPrompt += `\n[NỘI DUNG TÀI LIỆU${windows.length > 1 ? ` - PHẦN ${wIdx + 1}/${windows.length}` : ""}]\n${windows[wIdx]}\n[HẾT NỘI DUNG TÀI LIỆU]`;
    }

    const parsed = await callLLMForJSON(systemInstruction, userPrompt);
    if (!folderTitle && parsed.folderTitle) folderTitle = String(parsed.folderTitle).trim();
    if (!description && parsed.description) description = String(parsed.description).trim();
    if (parsed.isVocabularyDoc) isVocabularyDoc = true;

    if (Array.isArray(parsed.sections)) {
      allSections.push(...parsed.sections);
    }
  }

  if (allSections.length === 0) {
    throw new Error("Không thể phân tích cấu trúc từ tài liệu này. Vui lòng thử lại.");
  }

  const sections = allSections.map((sec, sIdx) => ({
    id: `sec-${sIdx + 1}`,
    title: String(sec.title || `Phần ${sIdx + 1}`).trim(),
    summary: String(sec.summary || "").trim(),
    lessons: (Array.isArray(sec.lessons) && sec.lessons.length > 0
      ? sec.lessons
      : [{ title: `Bài ${sIdx + 1}.1: Ôn tập tổng hợp`, focus: sec.title || "" }]
    ).map((les, lIdx) => ({
      id: `les-${sIdx + 1}-${lIdx + 1}`,
      title: String(les.title || `Bài ${sIdx + 1}.${lIdx + 1}`).trim(),
      focus: String(les.focus || les.title || "").trim()
    }))
  }));

  return {
    folderTitle: folderTitle || fileName || customPrompt || "Folder Luyện Tập",
    description,
    isVocabularyDoc,
    sections
  };
}

/**
 * Extract the exact contiguous block for a lesson if a heading/range marker (e.g. "35-37")
 * matches in documentContext; otherwise fall back to keyword-scored chunks.
 */
function pickRelevantChunksForLesson(documentContext, sectionTitle, lessonTitle, lessonFocus, maxChunks = 10, maxChars = 14000) {
  const combinedQuery = `${lessonTitle} ${lessonFocus} ${sectionTitle}`;

  // 1. Try exact range or section marker match (e.g., "35-37", "38-40", "Unit 3", "Part 2")
  const markerMatches = combinedQuery.match(/\d+\s*-\s*\d+|(?:buổi|buoi|chương|chuong|phần|phan|unit|lesson|part|bài|bai)\s*\d+/gi) || [];
  const lowerDoc = documentContext.toLowerCase();

  for (const rawMarker of markerMatches) {
    const cleanMarker = rawMarker.replace(/\s+/g, "").toLowerCase();
    // Search with flexible whitespace around hyphen
    const regex = new RegExp(rawMarker.trim().replace(/\s*-\s*/g, "\\s*-\\s*"), "i");
    const match = regex.exec(documentContext);
    if (match && match.index !== -1) {
      const start = match.index;
      // Find next range marker (e.g., 38-40:) after this block so we don't bleed into the next lesson
      const afterText = documentContext.slice(start + match[0].length);
      const nextRangeMatch = afterText.match(/\n\s*(?:\d+\s*-\s*\d+\s*:|(?:buổi|chương|unit|part|bài)\s*\d+)/i);
      const endOffset = nextRangeMatch && nextRangeMatch.index > 80
        ? match[0].length + nextRangeMatch.index
        : Math.min(8000, documentContext.length - start);

      const exactBlock = documentContext.slice(start, start + Math.min(endOffset, maxChars));
      if (exactBlock.trim().length > 40) {
        return exactBlock;
      }
    }
    // Also check simple lowercase index
    const simpleIdx = lowerDoc.indexOf(cleanMarker);
    if (simpleIdx !== -1) {
      return documentContext.slice(simpleIdx, simpleIdx + 6000);
    }
  }

  // 2. Fallback: keyword-scored chunk retrieval
  const chunks = splitTextIntoChunks(documentContext, 1200);
  if (chunks.length <= maxChunks) {
    return chunks.join("\n\n").slice(0, maxChars);
  }

  const keywords = combinedQuery
    .toLowerCase()
    .split(/[\s,.;:!?()\[\]\-_\/]+/)
    .filter(w => w.length >= 2);

  const scored = chunks.map((chunk, idx) => {
    const lower = chunk.toLowerCase();
    let score = 0;
    for (const kw of keywords) {
      if (lower.includes(kw)) score += 1;
    }
    return { chunk, idx, score };
  });

  scored.sort((a, b) => b.score - a.score || a.idx - b.idx);
  const top = scored.slice(0, maxChunks).sort((a, b) => a.idx - b.idx);
  return top.map(t => t.chunk).join("\n\n").slice(0, maxChars);
}

/**
 * Generate a complete practice pack (Flashcards + MC Quiz + Fill-in-the-blank Vocab Quiz)
 * for a specific small lesson inside a Practice Folder.
 */
export async function generatePracticeLesson({
  folderTitle = "",
  sectionTitle = "",
  lessonTitle = "",
  lessonFocus = "",
  isVocabularyDoc = false,
  documentContext = "",
  documentId = null,
  sessionId = "anonymous_session",
  itemCount = "auto"
}) {
  const isAutoCount = itemCount === "auto" || itemCount === null || itemCount === undefined || itemCount === "";
  const count = isAutoCount ? null : Math.max(3, Number(itemCount) || 10);

  let relevantContext = "";
  if (documentContext && documentContext.trim().length > 0) {
    relevantContext = pickRelevantChunksForLesson(
      documentContext,
      sectionTitle,
      lessonTitle,
      lessonFocus
    );
  } else if (documentId) {
    const sourceData = {
      sourceType: String(documentId).startsWith("temp-doc-") ? "UPLOADED_DOCUMENT" : "SYSTEM_DOCUMENT",
      sourceId: documentId,
      sourceIds: [documentId],
      sessionId
    };
    const studyCtx = await gatherStudyContext({ documentContext: "", sourceData, retrievalData: null });
    relevantContext = studyCtx.contextText;
  }

  const systemInstruction = `Bạn là trợ lý học tập AIStudyHub chuyên tạo bộ bài tập luyện tập tương tác BÁM SÁT 100% NGUYÊN BẢN TÀI LIỆU cho 1 bài học nhỏ.
Trả về JSON hợp lệ theo đúng cấu trúc sau:
{
  "flashcards": [
    {
      "front": "Từ vựng / Thuật ngữ gốc trong tài liệu (VD: Apply to/for /ə'plaɪ tu: / fɔ:r/)",
      "back": "Đúng nghĩa tiếng Việt / định nghĩa trong tài liệu (VD: Nộp đơn vào / xin (việc, học, vay...))"
    }
  ],
  "mcQuestions": [
    {
      "question": "Từ/cụm từ '...' trong bài có nghĩa là gì?",
      "options": ["A. Lựa chọn A", "B. Lựa chọn B", "C. Lựa chọn C", "D. Lựa chọn D"],
      "correctAnswer": "A",
      "explanation": "Giải thích ngắn gọn theo đúng tài liệu"
    }
  ],
  "fillQuestions": [
    {
      "englishTerm": "Từ tiếng Anh gốc (bỏ ký hiệu từ loại như (n), (v), (a), (adv), (vp) để người học dễ gõ)",
      "vietnameseMeaning": "Nghĩa tiếng Việt ngắn gọn, chính xác theo tài liệu",
      "acceptedEnglish": ["từ tiếng Anh chính", "biến thể/từ đồng nghĩa nếu có"],
      "acceptedVietnamese": ["nghĩa tiếng Việt chính", "các nghĩa tách riêng nếu tài liệu có nhiều nghĩa ngăn cách bởi dấu / hoặc ,"],
      "contextSentenceEn": "Câu gợi ý ngữ cảnh tiếng Anh ngắn (không bắt buộc nếu là bảng từ đơn)",
      "contextSentenceVi": "Câu gợi ý ngữ cảnh tiếng Việt ngắn (không bắt buộc)",
      "explanation": "Nghĩa đầy đủ và từ loại theo tài liệu"
    }
  ]
}

QUY TẮC BẮT BUỘC:
1. BÁM SÁT 100% TÀI LIỆU GỐC: CHỈ sử dụng đúng các từ vựng, thuật ngữ và nghĩa có trong [NỘI DUNG TÀI LIỆU LIÊN QUAN]. TUYỆT ĐỐI KHÔNG tự bịa thêm từ mới, KHÔNG tự ghép 2 từ riêng biệt thành từ mới (ví dụ bảng có 'Loan' và 'Officer' thì giữ riêng từng từ, không tự ghép thành 'loan officer' nếu bảng không có), KHÔNG đổi nghĩa gốc của tài liệu.
2. ${isAutoCount
    ? "KHỚP ĐỦ SỐ LƯỢNG 1-1: Nếu đoạn tài liệu là bảng/danh sách từ vựng gồm N từ (ví dụ 18 từ đánh số 1..18), PHẢI tạo ĐỦ N flashcards, ĐỦ N câu mcQuestions và ĐỦ N câu fillQuestions tương ứng 1-1 với TỪNG từ trong danh sách đó, KHÔNG được bỏ sót bất kỳ từ nào."
    : `Tạo đúng ${count} flashcards, ${count} câu mcQuestions (4 đáp án A, B, C, D), và ${count} câu fillQuestions từ nội dung tài liệu.`}
3. Tập trung CHẶT CHẼ vào bài tập nhỏ: "${lessonTitle}" thuộc mục "${sectionTitle}" (trọng tâm: ${lessonFocus}).
4. Với "fillQuestions": thiết kế để người học luyện tập cả 2 chiều Anh -> Việt và Việt -> Anh từ đúng từ vựng trong bảng/tài liệu.${isVocabularyDoc ? "\n5. Đây là tài liệu từ vựng: giữ nguyên từng từ vựng và nghĩa tiếng Việt trong bảng; các đáp án nhiễu ở mcQuestions lấy từ các từ khác trong cùng bài." : ""}`;

  let userPrompt = `Folder tổng: ${folderTitle}\nMục lớn: ${sectionTitle}\nBài tập nhỏ: ${lessonTitle}\nTrọng tâm: ${lessonFocus}\n`;
  if (relevantContext) {
    userPrompt += `\n[NỘI DUNG TÀI LIỆU LIÊN QUAN]\n${relevantContext}\n[HẾT NỘI DUNG TÀI LIỆU]`;
  }

  const parsed = await callLLMForJSON(systemInstruction, userPrompt);

  const flashcards = (Array.isArray(parsed.flashcards) ? parsed.flashcards : []).map((c, idx) => ({
    id: idx + 1,
    front: String(c.front || "").trim(),
    back: String(c.back || "").trim()
  })).filter(c => c.front && c.back);

  const mcQuestions = (Array.isArray(parsed.mcQuestions) ? parsed.mcQuestions : []).map((q, idx) => {
    const options = Array.isArray(q.options) && q.options.length > 0
      ? q.options.map(String)
      : ["A. Đúng", "B. Sai", "C. Không xác định", "D. Khác"];
    return {
      id: idx + 1,
      question: String(q.question || `Câu hỏi ${idx + 1}`).trim(),
      options,
      correctAnswer: normalizeCorrectAnswer(q.correctAnswer, options),
      explanation: String(q.explanation || "").trim()
    };
  });

  const fillQuestions = (Array.isArray(parsed.fillQuestions) ? parsed.fillQuestions : []).map((f, idx) => {
    const en = String(f.englishTerm || "").trim();
    const vi = String(f.vietnameseMeaning || "").trim();
    const accEn = Array.isArray(f.acceptedEnglish) ? f.acceptedEnglish.map(s => String(s).trim()).filter(Boolean) : [];
    const accVi = Array.isArray(f.acceptedVietnamese) ? f.acceptedVietnamese.map(s => String(s).trim()).filter(Boolean) : [];
    if (en && !accEn.some(x => x.toLowerCase() === en.toLowerCase())) accEn.unshift(en);
    if (vi && !accVi.some(x => x.toLowerCase() === vi.toLowerCase())) accVi.unshift(vi);
    return {
      id: idx + 1,
      englishTerm: en,
      vietnameseMeaning: vi,
      acceptedEnglish: accEn,
      acceptedVietnamese: accVi,
      contextSentenceEn: String(f.contextSentenceEn || "").trim(),
      contextSentenceVi: String(f.contextSentenceVi || "").trim(),
      explanation: String(f.explanation || "").trim()
    };
  }).filter(f => f.englishTerm && f.vietnameseMeaning);

  return {
    flashcards,
    mcQuestions,
    fillQuestions
  };
}
