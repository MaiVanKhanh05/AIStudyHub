import * as documentRepository from "../../repositories/document.repository.js";
import { parsePDF, parseWord, parseExcel, parsePPTX, parseZip, parseImageViaLLM, cleanText } from "./documentParser.service.js";
import { chunkText, generateEmbeddings } from "./embedding.service.js";
import { insertChunks } from "../../repositories/chunk.repository.js";
import fs from "fs";
import path from "path";

/**
 * Process a document in the background after upload:
 * - Download file content from Supabase Storage URL
 * - Parse text based on file type
 * - Store extracted content for AI search (RAG pipeline)
 */
export const processDocumentInBackground = async (doc) => {
    if (!doc || !doc.document_id || !doc.file_url) {
        console.warn("[DocumentProcessor] Skipping: missing document_id or file_url");
        return;
    }

    console.log(`[DocumentProcessor] Starting background processing for doc: ${doc.document_id} (${doc.title})`);

    try {
        const fileUrl = doc.file_url;
        const urlPath = fileUrl.split("?")[0]; // strip query params (e.g. Supabase signed URLs)
        const ext = path.extname(urlPath).toLowerCase().replace(".", "");
        const fileType = (doc.file_type || ext || "").toLowerCase();

        let extractedText = "";

        // Fetch file as buffer from URL
        const response = await fetch(fileUrl);
        if (!response.ok) {
            throw new Error(`Failed to fetch file: ${response.status} ${response.statusText}`);
        }

        if (["pdf"].includes(fileType)) {
            const buffer = Buffer.from(await response.arrayBuffer());
            extractedText = await parsePDF(buffer);

        } else if (["doc", "docx"].includes(fileType)) {
            const buffer = Buffer.from(await response.arrayBuffer());
            extractedText = await parseWord(buffer);

        } else if (["xls", "xlsx"].includes(fileType)) {
            const buffer = Buffer.from(await response.arrayBuffer());
            extractedText = await parseExcel(buffer);

        } else if (["ppt", "pptx"].includes(fileType)) {
            // PPTX parser needs a temp file path (StreamZip requires file path)
            const buffer = Buffer.from(await response.arrayBuffer());
            const tempPath = path.join(process.cwd(), `temp_${doc.document_id}.pptx`);
            fs.writeFileSync(tempPath, buffer);
            try {
                extractedText = await parsePPTX(tempPath);
            } finally {
                if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
            }

        } else if (["zip", "rar"].includes(fileType)) {
            const buffer = Buffer.from(await response.arrayBuffer());
            const tempPath = path.join(process.cwd(), `temp_${doc.document_id}.${fileType}`);
            fs.writeFileSync(tempPath, buffer);
            try {
                extractedText = await parseZip(tempPath);
            } finally {
                if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
            }

        } else if (["jpg", "jpeg", "png", "webp", "gif", "bmp"].includes(fileType)) {
            const buffer = Buffer.from(await response.arrayBuffer());
            const base64 = buffer.toString("base64");
            const mimeType = `image/${fileType === "jpg" ? "jpeg" : fileType}`;
            extractedText = await parseImageViaLLM(base64, mimeType);

        } else {
            // Plain text / code files
            const text = await response.text();
            extractedText = cleanText(text);
        }

        if (extractedText && extractedText.trim().length > 0) {
            // Truncate to safe size for DB storage
            const MAX_CONTENT_LENGTH = 500000;
            const truncated = extractedText.length > MAX_CONTENT_LENGTH
                ? extractedText.substring(0, MAX_CONTENT_LENGTH) + "\n\n[Nội dung bị cắt ngắn do vượt giới hạn lưu trữ]"
                : extractedText;

            await documentRepository.updateExtractedContent(doc.document_id, truncated);
            console.log(`[DocumentProcessor] Done: doc ${doc.document_id} — ${truncated.length} chars extracted`);

            // --- ADD CHUNKING AND EMBEDDING ---
            console.log(`[DocumentProcessor] Start chunking doc: ${doc.document_id}`);
            const textChunks = chunkText(truncated, 1000, 200);
            console.log(`[DocumentProcessor] Generated ${textChunks.length} chunks. Generating embeddings...`);
            
            const embeddings = await generateEmbeddings(textChunks);
            
            if (textChunks.length === embeddings.length) {
                const chunksToInsert = textChunks.map((text, index) => ({
                    chunk_index: index,
                    chunk_text: text,
                    embedding: embeddings[index]
                }));
                await insertChunks(doc.document_id, chunksToInsert);
                console.log(`[DocumentProcessor] Successfully inserted ${chunksToInsert.length} chunks to DB.`);
            } else {
                console.warn(`[DocumentProcessor] Mismatch: ${textChunks.length} chunks but ${embeddings.length} embeddings.`);
            }
        } else {
            console.warn(`[DocumentProcessor] No text extracted from doc: ${doc.document_id}`);
        }

    } catch (error) {
        // Background process — never throw, just log
        console.error(`[DocumentProcessor] Error processing doc ${doc.document_id}:`, error.message);
    }
};
