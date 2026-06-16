import { createRequire } from 'module';
const require = createRequire(import.meta.url);

const pdf = require('pdf-parse');
const mammoth = require('mammoth');
const StreamZip = require('node-stream-zip');
const xml2js = require('xml2js');

import * as xlsx from 'xlsx';

/**
 * Xóa các ký tự điều khiển, khoảng trắng thừa, và lọc các footer/header lặp lại.
 */
export const cleanText = (text) => {
  if (!text) return "";

  // 1. Loại bỏ ký tự điều khiển (ngoại trừ xuống dòng và tab)
  let cleaned = text.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "");

  // 2. Chuẩn hóa khoảng trắng: gom nhiều dấu cách/tab thành 1 khoảng trắng duy nhất
  cleaned = cleaned.replace(/[ \t]+/g, " ");

  // 3. Xóa các dòng trống thừa mứa (gom từ 3 dòng trống liên tiếp trở lên thành 2 dòng)
  cleaned = cleaned.replace(/\n{3,}/g, "\n\n");

  // 4. Lọc bỏ phần chân trang (footer) hoặc đầu trang (header) theo quy luật
  // Ví dụ: Bắt các cụm từ như "Page 1", "Trang 1/10" đứng đầu hoặc cuối dòng
  cleaned = cleaned.replace(/^(Trang|Page)\s+\d+(\s*\/\s*\d+)?\s*$/gmi, "");

  // 5. Cắt khoảng trắng dư thừa ở đầu và cuối mỗi dòng
  cleaned = cleaned.split('\n').map(line => line.trim()).join('\n');

  // Loại bỏ khoảng trắng ở 2 đầu văn bản lần cuối
  return cleaned.trim();
};

/**
 * Phân tích tệp PDF và trích xuất văn bản, cố gắng giữ lại cấu trúc đoạn văn bản.
 */
export const parsePDF = async (buffer) => {
  try {
    const data = await pdf(buffer);
    return cleanText(data.text);
  } catch (error) {
    console.error("Error parsing PDF:", error);
    throw new Error("Failed to parse PDF document.");
  }
};

/**
 * Phân tích tệp DOCX (Word) bằng thư viện mammoth để trích xuất văn bản thô
 * kèm theo cấu trúc phân tách dòng hợp lý.
 */
export const parseWord = async (buffer) => {
  try {
    const result = await mammoth.extractRawText({ buffer });
    return cleanText(result.value);
  } catch (error) {
    console.error("Error parsing Word document:", error);
    throw new Error("Failed to parse Word document.");
  }
};

/**
 * Phân tích tệp Excel/CSV và tự động chuyển đổi dữ liệu của mỗi sheet thành bảng Markdown.
 */
export const parseExcel = async (buffer) => {
  try {
    const workbook = xlsx.read(buffer, { type: 'buffer' });
    let allMarkdown = "";

    for (const sheetName of workbook.SheetNames) {
      const worksheet = workbook.Sheets[sheetName];
      // Chuyển sheet thành mảng 2 chiều (2D array)
      const jsonData = xlsx.utils.sheet_to_json(worksheet, { header: 1 });

      if (jsonData.length === 0) continue;

      allMarkdown += `\n### Bảng (Sheet): ${sheetName}\n\n`;

      // Chuyển đổi thành Bảng Markdown (Markdown Table)
      const headers = jsonData[0];
      allMarkdown += `| ${headers.map(h => String(h || "").replace(/\|/g, "\\|")).join(" | ")} |\n`;
      allMarkdown += `| ${headers.map(() => "---").join(" | ")} |\n`;

      for (let i = 1; i < jsonData.length; i++) {
        const row = jsonData[i];
        // Độn thêm cột rỗng nếu dòng đó có ít cột hơn dòng tiêu đề
        const paddedRow = headers.map((_, colIndex) => row[colIndex] || "");
        allMarkdown += `| ${paddedRow.map(cell => String(cell).replace(/\|/g, "\\|").replace(/\n/g, " ")).join(" | ")} |\n`;
      }
      allMarkdown += "\n";
    }
    return cleanText(allMarkdown);
  } catch (error) {
    console.error("Error parsing Excel document:", error);
    throw new Error("Failed to parse Excel document.");
  }
};

/**
 * Phân tích tệp PPTX bằng cách đọc trực tiếp các file XML bên trong file zip.
 * Tách riêng văn bản theo từng slide và đính kèm Tiêu đề Slide vào trước nội dung.
 */
export const parsePPTX = async (buffer) => {
  return new Promise((resolve, reject) => {
    // node-stream-zip yêu cầu đầu vào là file hoặc stream, nhưng buffer vẫn được hỗ trợ.
    const zip = new StreamZip.async({ file: buffer });
    let extractedText = "";

    zip.entries().then(async entries => {
      const slideEntries = Object.keys(entries).filter(name => name.startsWith('ppt/slides/slide') && name.endsWith('.xml'));

      // Sắp xếp các slide theo số thứ tự chuẩn xác (slide1.xml, slide2.xml, ...)
      slideEntries.sort((a, b) => {
        const numA = parseInt(a.match(/slide(\d+)\.xml/)[1]);
        const numB = parseInt(b.match(/slide(\d+)\.xml/)[1]);
        return numA - numB;
      });

      for (let i = 0; i < slideEntries.length; i++) {
        const entryName = slideEntries[i];
        const xmlData = await zip.entryData(entryName);
        const parser = new xml2js.Parser();
        const result = await parser.parseStringPromise(xmlData.toString('utf8'));

        let slideText = "";
        // Văn bản trong PowerPoint thường nằm sâu bên trong thẻ <a:t>
        const extractTextRecursive = (obj) => {
          if (!obj) return;
          if (typeof obj === 'string') {
            // Bỏ qua nếu là dữ liệu rỗng hoặc định dạng
          } else if (Array.isArray(obj)) {
            for (const item of obj) extractTextRecursive(item);
          } else if (typeof obj === 'object') {
            if (obj['a:t']) {
              const texts = Array.isArray(obj['a:t']) ? obj['a:t'] : [obj['a:t']];
              for (const t of texts) {
                if (typeof t === 'string') slideText += t + " ";
                else if (t._) slideText += t._ + " ";
              }
            }
            for (const key in obj) {
              if (key !== 'a:t') extractTextRecursive(obj[key]);
            }
          }
        };

        extractTextRecursive(result);
        slideText = slideText.trim();
        if (slideText) {
          extractedText += `\n[Slide ${i + 1}]\n${slideText}\n`;
        }
      }
      await zip.close();
      resolve(cleanText(extractedText));
    }).catch(async err => {
      console.error("Error parsing PPTX zip:", err);
      await zip.close();
      reject(new Error("Failed to parse PPTX document."));
    });
  });
};
