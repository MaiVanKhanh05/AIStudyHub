# AI Study Hub - Mô Tả Dự Án

AI Study Hub là một nền tảng học tập trên nền web, giúp người dùng tải lên, quản lý, tìm kiếm và tương tác với các tài liệu học tập thông qua sức mạnh của Trí tuệ Nhân tạo (AI).

## 1. Các Tính Năng Chính

### Quản lý & Xác thực Người dùng
- Đăng ký và đăng nhập tài khoản.
- Xác thực dựa trên mã thông báo (JWT).
- Phân quyền truy cập (Quản trị viên / Người dùng).
- Khôi phục mật khẩu và quản lý hồ sơ cá nhân.

### Quản lý Tài liệu
- Hỗ trợ tải lên nhiều định dạng: PDF, DOCX, XLSX, PPTX.
- Xem trực tiếp tài liệu ngay trên trình duyệt.
- Chỉnh sửa siêu dữ liệu (metadata) của tài liệu.
- Xóa, Đánh dấu/Yêu thích tài liệu.
- Tìm kiếm và lọc tài liệu nhanh chóng.

### Trợ lý Học tập AI
- **AI Chat:** Trò chuyện và hỏi đáp trực tiếp với AI dựa trên nội dung của tài liệu đã tải lên.
- **AI Quiz Generator:** Tự động tạo câu trắc nghiệm/câu đố từ tài liệu.
- **AI Study Assistant:** Trợ lý học tập thông minh.
- Hỏi đáp (Q&A) có nhận thức về ngữ cảnh của tài liệu.

### Chia sẻ & Cộng tác
- Chia sẻ tài liệu với các người dùng khác trong hệ thống.
- Quản lý quyền chia sẻ tài liệu.
- Trung tâm thông báo để theo dõi các tài nguyên được chia sẻ.

### Bảng điều khiển dành cho Quản trị viên (Admin)
- Quản lý danh sách người dùng.
- Kiểm duyệt các tài liệu được tải lên.
- Thống kê và phân tích hoạt động của hệ thống.

---

## 2. Ngăn xếp Công nghệ (Tech Stack)

### Frontend (Giao diện)
- **Framework:** ReactJS
- **Ngôn ngữ:** TypeScript
- **CSS Framework:** Tailwind CSS
- **Quản lý State:** Redux Toolkit
- **Routing:** React Router

### Backend (Máy chủ)
- **Môi trường:** Node.js
- **Framework:** Express.js
- **Ngôn ngữ:** TypeScript
- **Bảo mật:** JWT (JSON Web Tokens)

### Cơ sở dữ liệu & Lưu trữ
- **Database:** PostgreSQL
- **ORM:** Prisma
- **Lưu trữ tệp tin:** Supabase Storage

### Tích hợp AI
- **Dịch vụ AI:** OpenAI API (để xử lý ngôn ngữ tự nhiên, chat, và tạo quiz).

---

## 3. Cấu trúc Thư mục

Dự án được tổ chức theo kiến trúc Monorepo (hoặc hai thư mục độc lập trong cùng một repository) bao gồm:

- `frontend/`: Chứa toàn bộ mã nguồn của ứng dụng React.
- `backend/`: Chứa mã nguồn của máy chủ Node.js/Express, được tổ chức theo mô hình MVC thu nhỏ (controllers, services, repositories, routes,...).
- `docs/` & `database/`: Các tài liệu hỗ trợ và script cơ sở dữ liệu.

---

## 4. Hướng Phát Triển Tương Lai
- Hỗ trợ nhận diện ký tự quang học (OCR) để đọc văn bản từ hình ảnh.
- AI tự động tóm tắt tài liệu.
- Theo dõi tiến độ học tập của người dùng.
- Cộng tác thời gian thực (Real-time collaboration).
- Phát triển ứng dụng trên thiết bị di động.
