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
        { id: 1, title: "AI Basics", author: "An Nguyen", subject: "AI", file_type: "PDF", upload_date: "2026-05-30" },
        { id: 2, title: "Database Design", author: "Binh Tran", subject: "DBMS", file_type: "DOCX", upload_date: "2026-05-29" },
        { id: 3, title: "Machine Learning", author: "Nam Le", subject: "AI", file_type: "PDF", upload_date: "2026-05-28" },
        { id: 4, title: "Networking", author: "Hoa Tran", subject: "CCNA", upload_date: "2026-05-27" },
        { id: 5, title: "Java OOP", author: "Minh Nguyen", subject: "Programming", file_type: "DOCX", upload_date: "2026-05-26" },
      ];

      const extendedData = [];
      for (let i = 0; i < 35; i++) {
        const originalDoc = mockData[i % mockData.length];
        extendedData.push({
          ...originalDoc,
          id: i + 1,
          title: `${originalDoc.title} (Vol ${Math.floor(i / mockData.length) + 1})`
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
        />

        {/* Stats */}
        {/* ⚡ CỐT LÕI: Thêm div bọc cố định chiều cao h-14 để giữ khoảng cách luôn giãn ra hoàn hảo như Ảnh 1 */}
        <div className="h-14 flex items-center justify-center">
          {!loading && search && (
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">
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
            {/* Lưới hiển thị 1 dòng 3 card */}
            <div className="grid gap-6 sm:grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
              {currentDocs.map((doc) => (
                <DocumentCard
                  key={doc.id}
                  doc={doc}
                />
              ))}
            </div>

            {/* Empty State */}
            {filtered.length === 0 && (
              <div className="text-center py-20">
                <div className="text-5xl mb-4">📂</div>
                <p className="text-lg text-gray-500">
                  No documents found
                </p>
                <p className="text-sm text-gray-400 mt-2">
                  Try another keyword
                </p>
              </div>
            )}

            {/* Pagination */}
            <Pagination
              page={page}
              totalPages={totalPages}
              setPage={setPage}
            />
          </>
        )}
      </div>
    </div>
  );
}