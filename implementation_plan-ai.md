# Kế hoạch triển khai AI RAG Pipeline (Trích xuất, Làm sạch, Vector Embedding)

Nhiệm vụ này yêu cầu xây dựng một luồng (pipeline) hoàn chỉnh để tải tệp từ Storage, đọc nội dung theo từng định dạng (PDF, Word, Excel, PPTX), làm sạch văn bản, cắt đoạn (chunking), tạo vector (embedding) và lưu vào bảng `document_chunks`.

## User Review Required

> [!IMPORTANT]
> - **API Key cho AI**: Để tạo Embedding chuẩn 1536 chiều, hệ thống sẽ cần sử dụng OpenAI API (mô hình `text-embedding-3-small` hoặc `text-embedding-ada-002`). Bạn có đồng ý sử dụng OpenAI API không? Cần cấu hình biến môi trường `OPENAI_API_KEY`.
> - **Đồng bộ hay Chạy ngầm (Background)**: Quá trình đọc file và nhúng AI có thể tốn vài chục giây đến vài phút tùy dung lượng file. Nên để quá trình này chạy ngầm (Background Task) để không làm treo giao diện người dùng khi Upload. Bạn có đồng ý với phương án chạy ngầm không?

## Proposed Changes

### 1. Cài đặt thư viện mới (Dependencies)
Sẽ cần cài đặt các thư viện Node.js sau để đọc file và nhúng AI:
- `pdf-parse`: Đọc file PDF.
- `mammoth`: Đọc file Word (.docx) giữ nguyên cấu trúc đoạn văn.
- `xlsx`: Đọc file Excel (.xlsx, .csv) để chuyển thành Markdown Table.
- `node-stream-zip` & `xml2js`: Dùng để giải nén và đọc file `.pptx` thủ công, nhằm bóc tách được chính xác từng Slide và Tiêu đề Slide theo yêu cầu của bạn.
- `openai`: Gọi API tạo Vector Embeddings.

---

### 2. Dịch vụ phân tích tài liệu (Document Parser Service)

#### [NEW] `backend/src/services/ai/documentParser.service.js`
Tạo một service chuyên chịu trách nhiệm tải file từ URL và bóc tách chữ:
- `parsePDF(buffer)`: Trích xuất text, chia đoạn.
- `parseWord(buffer)`: Dùng mammoth lấy HTML rồi parse sang text chuẩn cấu trúc.
- `parseExcel(buffer)`: Đọc các sheet, chuyển vùng dữ liệu thành Markdown Tables để AI dễ hiểu cấu trúc dòng/cột.
- `parsePPTX(buffer)`: Đọc cấu trúc XML của PPTX để gom nhóm nội dung theo từng `Slide X: [Tiêu đề] - [Nội dung]`.
- `cleanText(text)`: Hàm regex để xóa ký tự điều khiển, khoảng trắng thừa, và lọc số trang/footer.

---

### 3. Dịch vụ Chunking và Embedding

#### [NEW] `backend/src/services/ai/embedding.service.js`
- `chunkText(text)`: Chia văn bản thành các đoạn (chunks) khoảng 1000 - 1500 ký tự có độ gối nhau (overlap) khoảng 100 ký tự để không mất ngữ cảnh.
- `generateEmbeddings(chunks)`: Gửi mảng text lên OpenAI lấy về mảng vector (1536 chiều).

#### [NEW] `backend/src/repositories/chunk.repository.js`
- Cung cấp hàm `insertChunks(documentId, chunkDataArray)` để lưu trữ vào bảng `document_chunks`.

---

### 4. Tích hợp vào Luồng Upload (Document Service)

#### [MODIFY] `backend/src/services/document.service.js`
- Tại hàm `uploadNewDocument()`, sau khi lưu thông tin tài liệu thành công vào DB, hệ thống sẽ gọi hàm chạy ngầm (không `await` để tránh block request) để xử lý file.
- Quá trình chạy ngầm: Tải file -> Parse -> Clean -> Chunk -> Embed -> Insert DB.

## Verification Plan

### Automated Tests / Manual Verification
- Upload 1 file PDF, 1 file Word, 1 file PPTX, 1 file Excel lên hệ thống.
- Chạy `SELECT * FROM document_chunks WHERE document_id = ?` để kiểm tra độ sạch của văn bản (`chunk_text`) và xem `embedding` có được lưu chính xác dưới dạng vector không.
- Kiểm tra các Markdown Table từ Excel và Tiêu đề Slide từ PPTX có được giữ nguyên ngữ nghĩa không.
