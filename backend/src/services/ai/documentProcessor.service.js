import { parsePDF, parseWord, parseExcel, parsePPTX } from "./documentParser.service.js";
import { chunkText, generateEmbeddings } from "./embedding.service.js";
import { insertChunks } from "../../repositories/chunk.repository.js";


/**
 * Tải file từ một URL public và chuyển thành dạng buffer.
 * Nếu file nằm trên Supabase và ở chế độ private, bạn có thể cần thêm header xác thực.
 * Giả định rằng URL truyền vào ở đây là public hoặc đã được cấp quyền (signed URL).
 */
const downloadFileToBuffer = async (url) => {
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`Failed to download file from ${url}: ${response.statusText}`);
    }
    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
};

/**
 * Luồng chính (pipeline) để xử lý một tài liệu mới được tải lên.
 * Hàm này nên được gọi bất đồng bộ (chạy ngầm) và không dùng `await` ở API chính.
 * 
 * @param {Object} document Bản ghi tài liệu trong CSDL (cần có document_id, file_url, file_type)
 */
export const processDocumentInBackground = async (document) => {
    console.log(`[AI RAG Pipeline] Starting processing for document ID: ${document.document_id}`);
    
    try {
        if (!document.file_url) {
            console.log(`[AI RAG Pipeline] Skipped ID ${document.document_id} - No file URL`);
            return;
        }

        // 1. Tải file về máy chủ
        console.log(`[AI RAG Pipeline] Downloading file for ID: ${document.document_id}`);
        const buffer = await downloadFileToBuffer(document.file_url);
        
        let parsedText = "";
        
        // Cải thiện nhận diện loại file từ MIME type, tên file hoặc đuôi file
        const rawType = (document.file_type || "").toUpperCase();
        const urlStr = (document.file_url || "").toUpperCase();
        const titleStr = (document.title || "").toUpperCase();
        
        let fileType = "UNKNOWN";
        if (rawType.includes("PDF") || urlStr.includes(".PDF") || titleStr.includes(".PDF")) {
            fileType = "PDF";
        } else if (rawType.includes("WORD") || rawType.includes("DOC") || urlStr.includes(".DOC") || titleStr.includes(".DOC")) {
            fileType = "DOCX";
        } else if (rawType.includes("EXCEL") || rawType.includes("SPREADSHEET") || rawType.includes("XLS") || rawType.includes("CSV") || urlStr.includes(".XLS") || urlStr.includes(".CSV") || titleStr.includes(".XLS") || titleStr.includes(".CSV")) {
            fileType = "XLSX";
        } else if (rawType.includes("POWERPOINT") || rawType.includes("PRESENTATION") || rawType.includes("PPT") || urlStr.includes(".PPT") || titleStr.includes(".PPT")) {
            fileType = "PPTX";
        }

        // 2. Phân tích tệp và làm sạch văn bản
        console.log(`[AI RAG Pipeline] Parsing document type: ${fileType}`);
        if (fileType === "PDF") {
            parsedText = await parsePDF(buffer);
        } else if (fileType === "DOCX" || fileType === "DOC") {
            parsedText = await parseWord(buffer);
        } else if (fileType === "XLSX" || fileType === "XLS" || fileType === "CSV") {
            parsedText = await parseExcel(buffer);
        } else if (fileType === "PPTX" || fileType === "PPT") {
            parsedText = await parsePPTX(buffer);
        } else {
            console.log(`[AI RAG Pipeline] Unsupported file type: ${fileType} for ID: ${document.document_id}`);
            return;
        }

        if (!parsedText || parsedText.trim() === "") {
            console.log(`[AI RAG Pipeline] No text extracted for ID: ${document.document_id}`);
            return;
        }

        // 3. Cắt văn bản thành các đoạn nhỏ (Chunking)
        console.log(`[AI RAG Pipeline] Chunking text...`);
        const chunks = chunkText(parsedText);
        console.log(`[AI RAG Pipeline] Created ${chunks.length} chunks.`);

        if (chunks.length === 0) return;

        // 4. Gọi OpenAI để tạo Vector Embeddings
        console.log(`[AI RAG Pipeline] Requesting embeddings from OpenAI...`);
        // Gửi cùng lúc tất cả các đoạn (chunks) lên OpenAI (giới hạn một lần gửi thường là 2048)
        const embeddings = await generateEmbeddings(chunks);
        
        // 5. Lưu kết quả vào CSDL PostgreSQL (bảng document_chunks)
        console.log(`[AI RAG Pipeline] Saving chunks to database...`);
        const chunkDataArray = chunks.map((text, index) => ({
            chunk_index: index,
            chunk_text: text,
            embedding: embeddings[index]
        }));

        await insertChunks(document.document_id, chunkDataArray);
        
        console.log(`[AI RAG Pipeline] SUCCESS! Document ID: ${document.document_id} is now vector searchable.`);

    } catch (error) {
        console.error(`[AI RAG Pipeline] ERROR processing document ID ${document.document_id}:`, error);
    }
};
