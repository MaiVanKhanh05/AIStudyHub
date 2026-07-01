import { useEffect, useState } from "react";
import axios from "axios";
import DocumentCard from "../components/DocumentCard";
import SearchBar from "../components/SearchBar";
import Pagination from "../components/Pagination";
import { FolderOpen, ArrowRight, BookOpen, Heart, Folder, ChevronLeft, FileText } from "lucide-react";

// 1 trang hiển thị 30 card
const PAGE_SIZE = 30;

export default function DocumentList() {
  const [documents, setDocuments] = useState([]);
  const [bookmarkedDocs, setBookmarkedDocs] = useState([]);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  
  // Tab hiện tại: ALL hoặc MY_SHARED
  const [filterMode, setFilterMode] = useState("ALL");
  const [currentUser, setCurrentUser] = useState(null);

  // Folder View State
  const [selectedSubject, setSelectedSubject] = useState(null);

  const fetchDocuments = async () => {
    setLoading(true);
    try {
      const response = await axios.get("http://localhost:5000/api/documents/community");
      setDocuments(response.data);

      // Fetch bookmarks if logged in
      const token = localStorage.getItem("token") || sessionStorage.getItem("token");
      if (token) {
        const bookmarkRes = await axios.get("http://localhost:5000/api/documents/bookmarks", {
          headers: { Authorization: `Bearer ${token}` }
        });
        const bookmarksWithFlag = bookmarkRes.data.map(doc => ({ ...doc, isBookmarked: true }));
        setBookmarkedDocs(bookmarksWithFlag);

        // Update main documents array to set isBookmarked flag
        setDocuments(prevDocs => {
          const bookmarkIds = new Set(bookmarksWithFlag.map(b => b.document_id));
          return prevDocs.map(doc => ({
            ...doc,
            isBookmarked: bookmarkIds.has(doc.document_id)
          }));
        });
      }
    } catch (error) {
      console.error("Lỗi khi tải dữ liệu:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Lấy thông tin user hiện tại
    const userStr = sessionStorage.getItem("user");
    if (userStr) {
      setCurrentUser(JSON.parse(userStr));
    }

    fetchDocuments();
  }, []);

  // Lọc ra các bài do chính mình đã share
  const mySharedDocs = currentUser 
    ? documents.filter(doc => doc.user_id === currentUser.user_id) 
    : [];

  // Reset page khi search hoặc đổi tab
  useEffect(() => {
    setPage(1);
    // Reset selected subject khi search để hiện flat list kết quả tìm kiếm
    if (search) {
      setSelectedSubject(null);
    }
  }, [search, filterMode]);

  // Chọn nguồn dữ liệu dựa theo tab hiện tại
  let sourceDocs = documents;
  if (filterMode === "MY_SHARED") sourceDocs = mySharedDocs;
  if (filterMode === "MY_FAVORITES") sourceDocs = bookmarkedDocs;

  // ⚡ CẬP NHẬT: Bộ lọc đa năng tìm kiếm bằng tất cả các trường
  const filtered = sourceDocs.filter((doc) => {
    if (!search) return true;

    const keyword = search.toLowerCase().trim();
    // Chú ý: Backend trả về author thay vì tên tĩnh, có the dùng title, subject_name, author
    return (
      (doc.title && doc.title.toLowerCase().includes(keyword)) ||
      (doc.subject_name && doc.subject_name.toLowerCase().includes(keyword)) ||
      (doc.subject_code && doc.subject_code.toLowerCase().includes(keyword)) ||
      (doc.subject && doc.subject.toLowerCase().includes(keyword)) ||
      (doc.author && doc.author.toLowerCase().includes(keyword))
    );
  });

  // Lọc theo Folder (Subject)
  const docsToShow = selectedSubject && !search
    ? filtered.filter(doc => {
        const sub = doc.subject_code || doc.subject || "Chung (General)";
        return sub === selectedSubject;
      })
    : filtered;

  // Gom nhóm tài liệu thành các thư mục môn học
  const folders = [];
  if (!selectedSubject && !search) {
    const subjectMap = new Map();
    filtered.forEach(doc => {
      const sub = doc.subject_code || doc.subject || "Chung (General)";
      if (!subjectMap.has(sub)) {
        subjectMap.set(sub, { name: sub, count: 0, latestDate: doc.upload_date });
      }
      const folder = subjectMap.get(sub);
      folder.count += 1;
      // update latest date if current is newer (optional, just basic logic for now)
    });
    // Convert map to array and sort by name
    folders.push(...Array.from(subjectMap.values()).sort((a, b) => a.name.localeCompare(b.name)));
  }

  // Pagination
  const totalPages = Math.max(1, Math.ceil(docsToShow.length / PAGE_SIZE));
  const currentDocs = docsToShow.slice(
    (page - 1) * PAGE_SIZE,
    page * PAGE_SIZE
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-6 py-10">

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            Cộng Đồng AIStudyHub
          </h1>
          <p className="mt-1 text-gray-500">
            Khám phá và tải xuống tài liệu học tập từ mọi người
          </p>
        </div>

        {/* Bài đã share của tôi (My Shared Section) - Chỉ hiển thị khi đang ở tab ALL và có bài share */}
        {currentUser && filterMode === "ALL" && mySharedDocs.length > 0 && !loading && (
          <div className="mb-12 bg-white rounded-[24px] p-8 shadow-sm border border-slate-100">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center text-purple-600">
                  <FolderOpen size={20} />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-800">Tài liệu bạn đã chia sẻ</h2>
                  <p className="text-sm text-slate-500">Bạn đã đóng góp {mySharedDocs.length} tài liệu cho cộng đồng</p>
                </div>
              </div>
              <button 
                onClick={() => setFilterMode("MY_SHARED")}
                className="flex items-center gap-2 text-sm font-bold text-purple-600 hover:text-purple-700 bg-purple-50 hover:bg-purple-100 px-4 py-2.5 rounded-xl transition-colors"
              >
                Xem tất cả
                <ArrowRight size={16} />
              </button>
            </div>
            
            <div className="grid gap-6 sm:grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
              {mySharedDocs.slice(0, 3).map((doc) => (
                <DocumentCard
                  key={doc.document_id}
                  doc={doc}
                  isPersonal={false} // Chế độ cộng đồng chung
                  isMyShared={true}
                  onUnshare={fetchDocuments}
                />
              ))}
            </div>
          </div>
        )}

        {/* Nút quay lại khi đang xem "Bài của tôi" hoặc "Kho yêu thích" */}
        {(filterMode === "MY_SHARED" || filterMode === "MY_FAVORITES") && (
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-2xl font-bold text-purple-700 flex items-center gap-2">
              {filterMode === "MY_SHARED" ? (
                <><BookOpen size={24} /> Toàn bộ bài bạn đã chia sẻ ({mySharedDocs.length})</>
              ) : (
                <><Heart size={24} className="text-red-500 fill-red-500" /> Kho Học Liệu Yêu Thích ({bookmarkedDocs.length})</>
              )}
            </h2>
            <button 
              onClick={() => setFilterMode("ALL")}
              className="text-sm font-bold text-slate-500 hover:text-slate-700 underline decoration-slate-300 underline-offset-4"
            >
              Quay lại thư viện chung
            </button>
          </div>
        )}

        {/* Kho Yêu Thích Section - Hiển thị preview ở tab ALL */}
        {currentUser && filterMode === "ALL" && !loading && (
          <div className="mb-12 bg-white rounded-[24px] p-8 shadow-sm border border-slate-100">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center text-red-500">
                  <Heart size={20} className="fill-current" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-800">Kho Học Liệu Cá Nhân</h2>
                  <p className="text-sm text-slate-500">Bạn đã lưu {bookmarkedDocs.length} tài liệu hữu ích</p>
                </div>
              </div>
              <button 
                onClick={() => {
                  setFilterMode("MY_FAVORITES");
                  // Gọi lại API khi mở tab để cập nhật danh sách mới nhất
                  const token = localStorage.getItem("token") || sessionStorage.getItem("token");
                  if (token) {
                    axios.get("http://localhost:5000/api/documents/bookmarks", {
                      headers: { Authorization: `Bearer ${token}` }
                    }).then(res => {
                      setBookmarkedDocs(res.data.map(doc => ({ ...doc, isBookmarked: true })));
                    });
                  }
                }}
                className="flex items-center gap-2 text-sm font-bold text-amber-600 hover:text-amber-700 bg-amber-50 hover:bg-amber-100 px-4 py-2.5 rounded-xl transition-colors"
              >
                Mở kho lưu trữ
                <ArrowRight size={16} />
              </button>
            </div>
            
            {bookmarkedDocs.length === 0 ? (
              <div className="py-10 text-center border-2 border-dashed border-slate-100 rounded-xl bg-slate-50">
                <Heart size={32} className="mx-auto text-slate-300 mb-2" />
                <p className="text-sm font-semibold text-slate-500">Chưa có tài liệu nào trong kho yêu thích</p>
                <p className="text-xs text-slate-400 mt-1">Hãy nhấn biểu tượng trái tim trên tài liệu để lưu vào đây nhé.</p>
              </div>
            ) : (
              <div className="grid gap-6 sm:grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
                {bookmarkedDocs.slice(0, 3).map((doc) => (
                  <DocumentCard
                    key={doc.document_id}
                    doc={doc}
                    isPersonal={false}
                    isMyShared={currentUser && doc.user_id === currentUser.user_id}
                    onUnshare={fetchDocuments}
                  />
                ))}
              </div>
            )}
          </div>
        )}

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
        <div className="h-14 flex items-center justify-between mt-2">
          {/* Header/Back button for Folder View */}
          {!loading && !search && selectedSubject && (
             <button 
               onClick={() => setSelectedSubject(null)}
               className="flex items-center gap-2 text-sm font-semibold text-purple-600 hover:text-purple-800 transition-colors bg-purple-50 hover:bg-purple-100 px-4 py-2 rounded-lg"
             >
               <ChevronLeft size={18} /> Quay lại danh sách thư mục
             </button>
          )}

          {!loading && search && (
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider m-0 ml-auto">
              Tìm thấy {filtered.length} tài liệu
            </p>
          )}
          {!loading && !search && selectedSubject && (
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider m-0 ml-auto">
              Thư mục: {selectedSubject} • {docsToShow.length} tài liệu
            </p>
          )}
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex justify-center items-center py-20">
            <div className="animate-pulse text-gray-400 font-medium">
              Đang tải danh sách tài liệu...
            </div>
          </div>
        )}

        {/* Document List or Folder Grid */}
        {!loading && (
          <>
            {/* Nếu KHÔNG ĐANG TÌM KIẾM và KHÔNG CÓ THƯ MỤC NÀO ĐƯỢC CHỌN -> Hiển thị dạng Folder */}
            {!search && !selectedSubject ? (
              <>
                {folders.length > 0 ? (
                  <div className="grid gap-6 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 mt-4">
                    {folders.map(folder => (
                      <div 
                        key={folder.name}
                        onClick={() => { setSelectedSubject(folder.name); setPage(1); }}
                        className="group bg-white rounded-2xl p-6 border border-slate-200 hover:border-purple-300 hover:shadow-md transition-all cursor-pointer flex flex-col items-center justify-center min-h-[160px] relative overflow-hidden"
                      >
                        <div className="absolute inset-0 bg-gradient-to-br from-purple-50/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                        <div className="w-16 h-16 bg-purple-100 text-purple-600 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                          <Folder size={32} className="fill-purple-200" />
                        </div>
                        <h3 className="font-bold text-slate-800 text-center text-lg leading-tight group-hover:text-purple-700 transition-colors line-clamp-2">
                          {folder.name}
                        </h3>
                        <p className="text-sm font-semibold text-slate-500 mt-2 flex items-center gap-1.5">
                          <FileText size={14} /> {folder.count} tài liệu
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-slate-200">
                    <div className="w-16 h-16 bg-slate-100 text-slate-400 rounded-2xl flex items-center justify-center mx-auto mb-4">
                      <FolderOpen size={32} />
                    </div>
                    <p className="text-lg text-gray-500 font-semibold m-0">
                      Chưa có tài liệu nào
                    </p>
                  </div>
                )}
              </>
            ) : (
              /* Nếu ĐANG TÌM KIẾM HOẶC ĐÃ CHỌN THƯ MỤC -> Hiển thị danh sách Flat Card */
              <>
                <div className="grid gap-6 sm:grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
                  {currentDocs.map((doc) => (
                    <DocumentCard
                      key={doc.document_id}
                      doc={doc}
                      isPersonal={false}
                      isMyShared={filterMode === "MY_SHARED" || (currentUser && doc.user_id === currentUser.user_id)}
                      onUnshare={fetchDocuments}
                    />
                  ))}
                </div>

                {/* Empty State cho kết quả tìm kiếm/thư mục trống */}
                {docsToShow.length === 0 && (
                  <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-slate-200">
                    <div className="text-5xl mb-4">📂</div>
                    <p className="text-lg text-gray-500 font-semibold m-0">
                      Không tìm thấy tài liệu nào
                    </p>
                    <p className="text-sm text-gray-400 mt-2 m-0">
                      Hãy thử một từ khóa khác
                    </p>
                  </div>
                )}

                {/* Pagination */}
                {docsToShow.length > 0 && (
                  <Pagination
                    page={page}
                    totalPages={totalPages}
                    setPage={setPage}
                  />
                )}
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}