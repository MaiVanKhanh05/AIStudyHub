import * as documentRepository from "../../repositories/document.repository.js";
import { parsePDF, parseWord, parseExcel, parsePPTX, parseZip, parseImageViaLLM, cleanText } from "./documentParser.service.js";
import { chunkText, generateEmbeddings } from "./embedding.service.js";
import { insertChunks } from "../../repositories/chunk.repository.js";
import fs from "fs";
import path from "path";

/**
 * Xử lý tài liệu chạy ngầm (Background) sau khi người dùng upload thành công:
 * - Tải nội dung file từ đường dẫn lưu trữ của Supabase
 * - Bóc tách chữ (parse text) dựa trên loại file (định dạng)
 * - Lưu nội dung đã bóc tách để phục vụ tìm kiếm AI (RAG pipeline)
 */
export const processDocumentInBackground = async (doc) => {
    // Nếu thiếu ID tài liệu hoặc đường dẫn file thì bỏ qua
    if (!doc || !doc.document_id || !doc.file_url) {
        console.warn("[DocumentProcessor] Bỏ qua: thiếu document_id hoặc file_url");
        return;
    }

    console.log(`[DocumentProcessor] Bắt đầu xử lý ngầm cho tài liệu: ${doc.document_id} (${doc.title})`);

    try {
        const fileUrl = doc.file_url;
        // Loại bỏ các tham số query (ví dụ: các token bảo mật của Supabase URL) để lấy đúng tên file
        const urlPath = fileUrl.split("?")[0]; 
        // Lấy đuôi file (extension)
        const ext = path.extname(urlPath).toLowerCase().replace(".", "");
        // Xác định loại file để có phương án bóc tách phù hợp
        const fileType = (doc.file_type || ext || "").toLowerCase();

        let extractedText = "";

        // Tải file từ Cloud (Supabase) về máy chủ dưới dạng dữ liệu thô (Buffer)
        const response = await fetch(fileUrl);
        if (!response.ok) {
            throw new Error(`Tải file thất bại: ${response.status} ${response.statusText}`);
        }

        // Xử lý file PDF
        if (["pdf"].includes(fileType)) {
            const buffer = Buffer.from(await response.arrayBuffer());
            extractedText = await parsePDF(buffer);

        // Xử lý file Word
        } else if (["doc", "docx"].includes(fileType)) {
            const buffer = Buffer.from(await response.arrayBuffer());
            extractedText = await parseWord(buffer);

        // Xử lý file Excel
        } else if (["xls", "xlsx"].includes(fileType)) {
            const buffer = Buffer.from(await response.arrayBuffer());
            extractedText = await parseExcel(buffer);

        // Xử lý file PowerPoint (PPT/PPTX)
        } else if (["ppt", "pptx"].includes(fileType)) {
            // Thư viện đọc PPTX cần một file vật lý trên ổ cứng, không đọc được trực tiếp từ RAM
            const buffer = Buffer.from(await response.arrayBuffer());
            const tempPath = path.join(process.cwd(), `temp_${doc.document_id}.pptx`); // Tạo đường dẫn file tạm
            fs.writeFileSync(tempPath, buffer); // Ghi file ra ổ cứng
            try {
                extractedText = await parsePPTX(tempPath); // Đọc nội dung
            } finally {
                // Đảm bảo phải xóa file tạm đi dù thành công hay lỗi, tránh đầy bộ nhớ
                if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
            }

        // Xử lý file nén (ZIP/RAR)
        } else if (["zip", "rar"].includes(fileType)) {
            const buffer = Buffer.from(await response.arrayBuffer());
            const tempPath = path.join(process.cwd(), `temp_${doc.document_id}.${fileType}`);
            fs.writeFileSync(tempPath, buffer);
            try {
                extractedText = await parseZip(tempPath);
            } finally {
                if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
            }

        // Xử lý Hình ảnh bằng Trí tuệ Nhân tạo (LLM OCR)
        } else if (["jpg", "jpeg", "png", "webp", "gif", "bmp"].includes(fileType)) {
            const buffer = Buffer.from(await response.arrayBuffer());
            const base64 = buffer.toString("base64"); // Mã hóa ảnh thành chuỗi base64
            const mimeType = `image/${fileType === "jpg" ? "jpeg" : fileType}`;
            // Gửi ảnh cho AI để AI đọc và trích xuất chữ viết trong ảnh
            extractedText = await parseImageViaLLM(base64, mimeType);

        // Xử lý file văn bản thuần túy (TXT, File code...)
        } else {
            const text = await response.text();
            extractedText = cleanText(text); // Lọc bỏ ký tự rác
        }

        // Nếu trích xuất thành công và có nội dung
        if (extractedText && extractedText.trim().length > 0) {
            // Cắt ngắn nếu nội dung quá dài để bảo vệ Database (giới hạn 1Tr ký tự)
            const MAX_CONTENT_LENGTH = 10000000;
            const truncated = extractedText.length > MAX_CONTENT_LENGTH
                ? extractedText.substring(0, MAX_CONTENT_LENGTH) + "\n\n[Nội dung bị cắt ngắn do vượt giới hạn lưu trữ]"
                : extractedText;

            // Lưu nội dung thô vào bảng documents
            await documentRepository.updateExtractedContent(doc.document_id, truncated);
            console.log(`[DocumentProcessor] Hoàn tất: doc ${doc.document_id} — bóc tách được ${truncated.length} ký tự`);

            // --- BẮT ĐẦU CHIA NHỎ VÀ TẠO VECTOR (EMBEDDING) CHO AI ---
            console.log(`[DocumentProcessor] Bắt đầu chia nhỏ văn bản cho doc: ${doc.document_id}`);
            // Chia đoạn văn bản lớn thành nhiều đoạn nhỏ (chunk), mỗi đoạn khoảng 1000 ký tự, trồng lấn nhau 200 ký tự
            const textChunks = chunkText(truncated, 1000, 200);
            console.log(`[DocumentProcessor] Đã tạo ${textChunks.length} chunks. Bắt đầu nhúng (Generating embeddings)...`);
            
            // Dùng AI (như OpenAI) để biến từng đoạn text thành một dãy số Vector (Embedding)
            const embeddings = await generateEmbeddings(textChunks);
            
            // Nếu số lượng text bằng số lượng vector tạo ra (Không bị lỗi)
            if (textChunks.length === embeddings.length) {
                // Chuẩn bị dữ liệu để lưu vào bảng chunks
                const chunksToInsert = textChunks.map((text, index) => ({
                    chunk_index: index,
                    chunk_text: text,
                    embedding: embeddings[index]
                }));
                // Đẩy vào cơ sở dữ liệu Vector để phục vụ tính năng Hỏi/Đáp
                await insertChunks(doc.document_id, chunksToInsert);
                console.log(`[DocumentProcessor] Đã lưu thành công ${chunksToInsert.length} chunks vào DB.`);
            } else {
                console.warn(`[DocumentProcessor] Lệch dữ liệu: Có ${textChunks.length} đoạn text nhưng chỉ có ${embeddings.length} vector.`);
            }
        } else {
            console.warn(`[DocumentProcessor] Không trích xuất được chữ nào từ tài liệu: ${doc.document_id}`);
        }

    } catch (error) {
        // Vì đây là tiến trình chạy ngầm, không được dùng "throw" gây sập server, chỉ log ra lỗi
        console.error(`[DocumentProcessor] Lỗi xử lý tài liệu ${doc.document_id}:`, error.message);
    }
};
