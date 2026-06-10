import OpenAI from "openai";
import dotenv from "dotenv";

dotenv.config();

let openai = null;
if (process.env.OPENAI_API_KEY) {
    openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
    });
}

/**
 * Chia văn bản thành các đoạn (chunks) logic phù hợp để tạo Embedding và truy vấn RAG.
 * Cố gắng giữ nguyên cấu trúc đoạn văn bản.
 * 
 * @param {string} text Văn bản thô đã được làm sạch
 * @param {number} maxChunkSize Kích thước tối đa của một chunk tính bằng số ký tự (ước chừng)
 * @param {number} overlap Số ký tự chồng lấn (overlap) giữa các chunk để giữ nguyên ngữ cảnh
 * @returns {Array<string>} Mảng chứa các đoạn văn bản (chunks)
 */
export const chunkText = (text, maxChunkSize = 1000, overlap = 200) => {
    if (!text || text.trim() === "") return [];
    
    // Chia theo các đoạn văn (paragraph) trước để tránh ngắt quãng ngữ cảnh
    const paragraphs = text.split(/\n\s*\n/);
    const chunks = [];
    let currentChunk = "";
    
    for (let i = 0; i < paragraphs.length; i++) {
        const p = paragraphs[i].trim();
        if (!p) continue;

        // Nếu một đoạn văn duy nhất quá dài, buộc phải chia nhỏ theo câu
        if (p.length > maxChunkSize) {
            // Đẩy chunk hiện tại vào mảng nếu đã có dữ liệu
            if (currentChunk.trim()) {
                chunks.push(currentChunk.trim());
                currentChunk = "";
            }
            
            // Chia đoạn văn quá lớn bằng các dấu ngắt câu (cách làm tương đối)
            const sentences = p.match(/[^.!?]+[.!?]+/g) || [p];
            let sentenceChunk = "";
            for (const s of sentences) {
                if (sentenceChunk.length + s.length > maxChunkSize) {
                    chunks.push(sentenceChunk.trim());
                    // Giữ phần văn bản gối lên nhau (overlap)
                    sentenceChunk = s;
                } else {
                    sentenceChunk += " " + s;
                }
            }
            if (sentenceChunk.trim()) {
                currentChunk = sentenceChunk.trim(); // Sẽ được đẩy vào mảng hoặc nối tiếp ở vòng lặp sau
            }
        } else {
            if ((currentChunk.length + p.length) > maxChunkSize && currentChunk.length > 0) {
                chunks.push(currentChunk.trim());
                
                // Overlap: Lấy một vài từ cuối cùng của chunk trước đó để làm phần gối đầu cho chunk mới
                const lastWords = currentChunk.split(' ').slice(-Math.floor(overlap / 5)).join(' ');
                currentChunk = lastWords + "\n\n" + p;
            } else {
                currentChunk += (currentChunk ? "\n\n" : "") + p;
            }
        }
    }
    
    if (currentChunk.trim()) {
        chunks.push(currentChunk.trim());
    }
    
    return chunks;
};

/**
 * Gọi API OpenAI để tạo Vector Embeddings (1536 chiều).
 * 
 * @param {Array<string>} textArray Mảng các đoạn văn bản (chunks)
 * @returns {Promise<Array<Array<number>>>} Mảng chứa các vector float (số thực)
 */
export const generateEmbeddings = async (textArray) => {
    if (!textArray || textArray.length === 0) return [];
    if (!openai) {
        console.warn("[AI RAG Pipeline] OPENAI_API_KEY is missing! Skipping vector embeddings generation.");
        // Trả về mảng chứa toàn số 0 (1536 chiều) để không làm lỗi định dạng lưu vào DB
        // trong trường hợp người dùng chưa cấu hình API Key của OpenAI.
        return textArray.map(() => Array(1536).fill(0));
    }
    
    try {
        const response = await openai.embeddings.create({
            model: "text-embedding-3-small", // Model tạo vector 1536 chiều được tối ưu hóa cao
            input: textArray,
            encoding_format: "float",
        });
        
        // Sắp xếp lại theo chỉ số index để đảm bảo khớp với thứ tự mảng đầu vào
        const sortedData = response.data.sort((a, b) => a.index - b.index);
        return sortedData.map(d => d.embedding);
    } catch (error) {
        console.error("Error generating embeddings with OpenAI:", error);
        throw new Error("Failed to generate embeddings via OpenAI API.");
    }
};
