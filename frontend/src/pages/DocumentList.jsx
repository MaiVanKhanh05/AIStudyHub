import { useEffect, useState } from "react";
import DocumentCard from "../components/DocumentCard";
import SearchBar from "../components/SearchBar";
import Pagination from "../components/Pagination";

// 1 trang hiển thị 30 card
const PAGE_SIZE = 30;

export default function DocumentList() {
  const [documents, setDocuments] = useState([]);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);

  // LOAD DATA
  useEffect(() => {
    setLoading(true);

    setTimeout(() => {
      const mockData = [
        { 
          id: 1, 
          title: "AI Basics Summary", 
          author: "An Nguyen", 
          subject: "AI", 
          file_type: "PDF", 
          upload_date: "2026-05-30", 
          downloads: 24, 
          views: 105,
          file_size: 2408576,
          file_url: "https://pdfobject.com/pdf/sample.pdf",
          description: "Tài liệu tóm tắt kiến thức nền tảng về Trí tuệ nhân tạo (AI), bao gồm lịch sử phát triển, các mô hình học máy cơ bản, mạng nơ-ron nhân tạo và ứng dụng thực tiễn của AI trong đời sống hiện đại.",
          ai_summary: "Bản tóm tắt cung cấp cái nhìn tổng quan về AI: Phân biệt AI yếu vs AI mạnh; Giới thiệu 3 nhánh chính của Machine Learning (Supervised, Unsupervised, Reinforcement Learning); Cơ chế truyền thẳng và lan truyền ngược trong Neural Network."
        },
        { 
          id: 2, 
          title: "Database Design Schema", 
          author: "Binh Tran", 
          subject: "DBMS", 
          file_type: "DOCX", 
          upload_date: "2026-05-29", 
          downloads: 12, 
          views: 48,
          file_size: 1548576,
          file_url: "https://example.com/docs/db-design.docx",
          description: "Hướng dẫn thiết kế lược đồ cơ sở dữ liệu quan hệ tối ưu cho hệ thống E-commerce. Tập trung vào phân tích ERD, chuẩn hóa dữ liệu chống dư thừa và cách lập chỉ mục (Indexing) nâng cao.",
          ai_summary: "Tài liệu chuyên sâu về cơ sở dữ liệu quan hệ: Phương pháp thiết kế ERD chuẩn; Quy trình chuẩn hóa dữ liệu từ 1NF đến 3NF; Giải pháp lập chỉ mục B-Tree giúp tối ưu hóa tốc độ truy vấn SELECT gấp 10 lần."
        },
        { 
          id: 3, 
          title: "Machine Learning Cheat Sheet", 
          author: "Nam Le", 
          subject: "AI", 
          file_type: "PDF", 
          upload_date: "2026-05-28", 
          downloads: 35, 
          views: 189,
          file_size: 3242880,
          file_url: "https://pdfobject.com/pdf/sample.pdf",
          description: "Bảng tra cứu nhanh công thức toán học và mã nguồn mẫu cho các thuật toán Học máy phổ biến (Linear/Logistic Regression, Decision Trees, Random Forest, SVM, K-Means).",
          ai_summary: "Cheat sheet hữu ích dành cho Data Scientist: Tổng hợp công thức gradient descent, các hàm loss function phổ biến; Chỉ số đánh giá mô hình (F1-score, ROC-AUC); Đoạn mã Python Scikit-Learn để train mô hình nhanh chóng."
        },
        { 
          id: 4, 
          title: "Computer Networks Lecture Slide", 
          author: "Hoa Tran", 
          subject: "CCNA", 
          file_type: "PPTX", 
          upload_date: "2026-05-27", 
          downloads: 8, 
          views: 32,
          file_size: 5120000,
          file_url: "https://example.com/docs/computer-networks.pptx",
          description: "Bộ slide bài giảng chi tiết về mạng máy tính theo mô hình OSI 7 lớp và TCP/IP. Phân tích chi tiết giao thức định tuyến, chia mạng con Subnetting và cơ chế bắt tay 3 bước TCP.",
          ai_summary: "Slide hệ thống hóa kiến trúc mạng: So sánh chi tiết mô hình OSI và TCP/IP; Cách thức chia IP Subnet nhanh; Cơ chế truyền tin cậy TCP thông qua bắt tay 3 bước (SYN, SYN-ACK, ACK) và kiểm soát tắc nghẽn."
        },
        { 
          id: 5, 
          title: "Java OOP Syllabus", 
          author: "Minh Nguyen", 
          subject: "Programming", 
          file_type: "DOCX", 
          upload_date: "2026-05-26", 
          downloads: 19, 
          views: 76,
          file_size: 2194304,
          file_url: "https://example.com/docs/java-oop.docx",
          description: "Giáo trình và bài tập thực hành lập trình hướng đối tượng (OOP) bằng ngôn ngữ Java. Đi sâu vào 4 tính chất OOP, tính kế thừa đa hình nâng cao và các mẫu thiết kế phổ biến.",
          ai_summary: "Tài liệu học phần Java OOP: Hướng dẫn chi tiết 4 tính chất cột lõi (Đóng gói, Kế thừa, Đa hình, Trừu tượng); Ứng dụng Interface vs Abstract Class; Đi kèm 5 bài tập xây dựng ứng dụng thực tế."
        },
        { 
          id: 6, 
          title: "Project Management Gantt Chart", 
          author: "Thu Nguyen", 
          subject: "PRO101", 
          file_type: "XLSX", 
          upload_date: "2026-05-25", 
          downloads: 44, 
          views: 112,
          file_size: 1048576,
          file_url: "https://example.com/docs/gantt-chart.xlsx",
          description: "Mẫu biểu đồ Gantt quản lý tiến độ dự án chuyên nghiệp trên Excel. Thích hợp cho các nhóm làm việc theo phương pháp Agile/Scrum để theo dõi task, milestone và tài nguyên.",
          ai_summary: "Bảng quản lý dự án tối ưu: Biểu đồ Gantt tự động cập nhật tiến độ theo phần trăm; Phân bổ nhân lực trực quan; Giúp quản lý dự án kiểm soát rủi ro về thời gian và phân phối công việc khoa học."
        },
      ];

      const extendedData = [];
      for (let i = 0; i < 35; i++) {
        const originalDoc = mockData[i % mockData.length];
        extendedData.push({
          ...originalDoc,
          id: i + 1,
          title: `${originalDoc.title} (Vol ${Math.floor(i / mockData.length) + 1})`,
          description: `${originalDoc.description} - Tập ${Math.floor(i / mockData.length) + 1}`,
          ai_summary: `${originalDoc.ai_summary} (Phần nội dung mở rộng thuộc Tập ${Math.floor(i / mockData.length) + 1})`
        });
      }

      setDocuments(extendedData);
      setLoading(false);
    }, 500);
  }, []);

  // Reset page khi search
  useEffect(() => {
    setPage(1);
  }, [search]);

  // ⚡ CẬP NHẬT: Bộ lọc đa năng tìm kiếm bằng tất cả các trường (Documents, Subjects, Authors)
  const filtered = documents.filter((doc) => {
    // Nếu người dùng chưa gõ gì thì giữ nguyên danh sách gốc
    if (!search) return true;

    const keyword = search.toLowerCase().trim();

    return (
      (doc.title && doc.title.toLowerCase().includes(keyword)) ||     // Khớp với Tên tài liệu
      (doc.subject && doc.subject.toLowerCase().includes(keyword)) || // Khớp với Môn học / Chủ đề
      (doc.author && doc.author.toLowerCase().includes(keyword))      // Khớp với Tên tác giả
    );
  });

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));

  const currentDocs = filtered.slice(
    (page - 1) * PAGE_SIZE,
    page * PAGE_SIZE
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-6 py-10">

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            Documents
          </h1>

          <p className="mt-1 text-gray-500">
            Browse and download study materials
          </p>
        </div>

        {/* Search */}
        <SearchBar
          search={search}
          setSearch={setSearch}
          userId={(() => {
            try {
              const u = JSON.parse(localStorage.getItem("user") || sessionStorage.getItem("user") || "null");
              return u?.user_id || null;
            } catch { return null; }
          })()}
          onSearch={(keyword) => {
            setSearch(keyword);
            setPage(1);
          }}
        />


        {/* Stats */}
        {/* ⚡ CỐT LÕI: Thêm div bọc cố định chiều cao h-14 để giữ khoảng cách luôn giãn ra hoàn hảo như Ảnh 1 */}
        <div className="h-14 flex items-center justify-center">
          {!loading && search && (
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider m-0">
              {filtered.length} documents found
            </p>
          )}
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex justify-center items-center py-20">
            <div className="animate-pulse text-gray-400">
              Loading documents...
            </div>
          </div>
        )}

        {/* Document List */}
        {!loading && (
          <>
            <div className="grid gap-6 sm:grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
              {currentDocs.map((doc) => (
                <DocumentCard
                  key={doc.id}
                  doc={doc}
                  isPersonal={true}
                />
              ))}
            </div>

            {/* Empty State */}
            {filtered.length === 0 && (
              <div className="text-center py-20">
                <div className="text-5xl mb-4">📂</div>
                <p className="text-lg text-gray-500 m-0">
                  No documents found
                </p>
                <p className="text-sm text-gray-400 mt-2 m-0">
                  Try another keyword
                </p>
              </div>
            )}

            {/* Pagination */}
            {filtered.length > 0 && (
              <Pagination
                page={page}
                totalPages={totalPages}
                setPage={setPage}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
}