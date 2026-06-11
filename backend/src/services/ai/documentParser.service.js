import fs from "fs";
import path from "path";
import { PDFParse } from "pdf-parse";
import mammoth from "mammoth";
import xlsx from "xlsx";
import StreamZip from "node-stream-zip";
import xml2js from "xml2js";

// Helper to check if file extension is a text/code file
function isCodeOrTextFile(filename) {
  const ext = path.extname(filename).toLowerCase();
  const textExtensions = [
    ".js", ".jsx", ".ts", ".tsx", ".html", ".css", ".json", ".py", ".java", 
    ".cpp", ".c", ".h", ".hpp", ".cs", ".sh", ".xml", ".md", ".sql", ".txt", ".yml", ".yaml"
  ];
  return textExtensions.includes(ext);
}

// Recursive function to extract all text from xml2js object representation
function extractTextFromXml(obj) {
  let text = "";
  if (typeof obj === "string") {
    return obj;
  }
  if (Array.isArray(obj)) {
    for (const item of obj) {
      text += extractTextFromXml(item) + " ";
    }
  } else if (typeof obj === "object" && obj !== null) {
    if (obj._) {
      text += obj._ + " ";
    }
    for (const key in obj) {
      if (key !== "$") { // skip attributes
        text += extractTextFromXml(obj[key]) + " ";
      }
    }
  }
  return text;
}

// 1. PDF Parser
export async function parsePDF(buffer) {
  const parser = new PDFParse({ data: buffer });
  const data = await parser.getText();
  return data.text || "";
}

// 2. Word Parser (DOCX)
export async function parseWord(buffer) {
  const data = await mammoth.extractRawText({ buffer });
  return data.value || "";
}

// 3. Excel Parser (XLSX)
export async function parseExcel(buffer) {
  const workbook = xlsx.read(buffer, { type: "buffer" });
  let text = "";
  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    const sheetText = xlsx.utils.sheet_to_txt(sheet);
    if (sheetText.trim()) {
      text += `--- Trang tính: ${sheetName} ---\n${sheetText}\n\n`;
    }
  }
  return text;
}

// 4. PPTX Parser (PowerPoint)
export async function parsePPTX(filePath) {
  const zip = new StreamZip.async({ file: filePath });
  try {
    const entries = await zip.entries();
    let text = "";
    
    // PPTX slides are typically stored as ppt/slides/slide1.xml, ppt/slides/slide2.xml, etc.
    const slideEntries = Object.keys(entries)
      .filter(name => name.startsWith("ppt/slides/slide") && name.endsWith(".xml"))
      .sort((a, b) => {
        const numA = parseInt(a.replace(/[^0-9]/g, "")) || 0;
        const numB = parseInt(b.replace(/[^0-9]/g, "")) || 0;
        return numA - numB;
      });

    for (let i = 0; i < slideEntries.length; i++) {
      const entryName = slideEntries[i];
      const data = await zip.entryData(entryName);
      const xmlString = data.toString("utf8");
      
      const parsedXml = await xml2js.parseStringPromise(xmlString);
      const slideText = extractTextFromXml(parsedXml);
      if (slideText.trim()) {
        text += `--- Slide ${i + 1} ---\n${slideText.trim().replace(/\s+/g, " ")}\n\n`;
      }
    }
    return text;
  } finally {
    await zip.close();
  }
}

// 5. ZIP Code Parser
export async function parseZip(filePath) {
  const zip = new StreamZip.async({ file: filePath });
  try {
    const entries = await zip.entries();
    let text = "Cấu trúc thư mục (File Tree):\n";
    
    const entryKeys = Object.keys(entries).sort();
    
    // Build file tree representation
    for (const key of entryKeys) {
      const entry = entries[key];
      const isDir = entry.isDirectory;
      const depth = key.split("/").filter(Boolean).length - 1;
      const indent = "  ".repeat(depth);
      const name = path.basename(key);
      text += `${indent}${isDir ? "📁" : "📄"} ${name}\n`;
    }

    text += "\n--- Nội dung chi tiết các tệp mã nguồn ---\n\n";

    let totalLength = 0;
    const MAX_LENGTH = 450000; // limit character extraction to avoid payload limits

    for (const key of entryKeys) {
      const entry = entries[key];
      if (entry.isDirectory) continue;

      // Skip non-code files or files in ignored directories (like node_modules, .git, dist, etc.)
      const isIgnoredDir = key.includes("node_modules/") || key.includes(".git/") || key.includes("dist/") || key.includes("build/");
      if (isIgnoredDir) continue;

      if (!isCodeOrTextFile(key)) continue;

      // Read files under 50KB
      if (entry.size > 50000) continue;

      try {
        const data = await zip.entryData(key);
        const fileContent = data.toString("utf8");
        const fileBlock = `\n==================================================\nTỆP: ${key}\n==================================================\n${fileContent}\n`;
        
        if (totalLength + fileBlock.length > MAX_LENGTH) {
          text += `\n[CẢNH BÁO: Đạt giới hạn kích thước trích xuất tài liệu mã nguồn]\n`;
          break;
        }
        
        text += fileBlock;
        totalLength += fileBlock.length;
      } catch (err) {
        text += `\n[Lỗi khi đọc tệp ${key}: ${err.message}]\n`;
      }
    }
    
    return text;
  } finally {
    await zip.close();
  }
}

// 6. Image vision helper via LLM
export async function parseImageViaLLM(base64Data, mimeType) {
  const apiKey = process.env.GEMINI_API_KEY || process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return "[Ảnh đính kèm: Vui lòng cấu hình GEMINI_API_KEY hoặc OPENAI_API_KEY ở tệp .env của backend để kích hoạt tính năng trích xuất công thức và phân tích ảnh học thuật]";
  }

  const prompt = "Hãy phân tích hình ảnh này chi tiết nhất có thể. Trích xuất toàn bộ văn bản tiếng Việt/tiếng Anh, công thức toán học (định dạng LaTeX nếu có), sơ đồ, bảng dữ liệu hoặc bất kỳ thông tin nào xuất hiện trong ảnh.";

  try {
    if (process.env.GEMINI_API_KEY) {
      // Use Gemini 1.5 Flash Vision
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{
            parts: [
              { text: prompt },
              {
                inlineData: {
                  mimeType: mimeType,
                  data: base64Data
                }
              }
            ]
          }]
        })
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Gemini API error: ${errText}`);
      }

      const resJson = await response.json();
      return resJson.candidates?.[0]?.content?.parts?.[0]?.text || "Không thể phân tích ảnh.";
    } else {
      // Use OpenAI GPT-4o-mini Vision
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [
            {
              role: "user",
              content: [
                { type: "text", text: prompt },
                {
                  type: "image_url",
                  image_url: {
                    url: `data:${mimeType};base64,${base64Data}`
                  }
                }
              ]
            }
          ]
        })
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`OpenAI API error: ${errText}`);
      }

      const resJson = await response.json();
      return resJson.choices?.[0]?.message?.content || "Không thể phân tích ảnh.";
    }
  } catch (error) {
    console.error("Image analysis error:", error);
    return `[Lỗi phân tích hình ảnh: ${error.message}]`;
  }
}
