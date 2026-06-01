import { useEffect, useState, useMemo } from "react";
import { FileText, FileSpreadsheet, Presentation, FileImage, FileCode, File } from "lucide-react";

// Hàm định dạng dung lượng file từ bytes sang chuỗi dễ đọc (KB, MB)
function formatFileSize(bytes) {
  if (!bytes || isNaN(bytes)) return "0.0 KB";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(i === 0 ? 0 : 1)) + " " + sizes[i];
}

// Hàm lấy icon tương ứng với định dạng file
function getFileIcon(fileType = "") {
  const type = fileType.toLowerCase();
  if (type === "pdf") return <FileText className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />;
  if (["doc", "docx"].includes(type)) return <FileText className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />;
  if (["xls", "xlsx", "excel"].includes(type)) return <FileSpreadsheet className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />;
  if (["ppt", "pptx", "powerpoint"].includes(type)) return <Presentation className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />;
  if (["jpg", "jpeg", "png", "webp", "image"].includes(type)) return <FileImage className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />;
  if (["txt", "code", "js", "html", "css"].includes(type)) return <FileCode className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />;
  return <File className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />;
}

/* ================= FILE TYPE ================= */
function getFileType(url = "") {
  if (!url) return "other";
  const ext = url.split(".").pop().toLowerCase();

  if (["jpg", "jpeg", "png", "webp"].includes(ext)) return "image";
  if (ext === "pdf") return "pdf";
  if (["doc", "docx"].includes(ext)) return "doc";
  if (["xls", "xlsx"].includes(ext)) return "excel";
  if (ext === "txt") return "txt";

  return "other";
}

export default function DocumentCard({ doc, isPinned, onTogglePin }) {
  const [open, setOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [bookmarked, setBookmarked] = useState(false);
  const [hasViewed, setHasViewed] = useState(false);

  // State quản lý số lượt xem và lượt tải cục bộ dựa trên dữ liệu thật
  const [viewCount, setViewCount] = useState(doc?.views || 0);
  const [downloadCount, setDownloadCount] = useState(doc?.downloads || 0);

  // Trích xuất định dạng file an toàn
  const finalFileType = useMemo(() => {
    return getFileType(doc?.file_url);
  }, [doc?.file_url]);

  // Tự động đóng menu khi click ra ngoài vùng trống
  useEffect(() => {
    if (!menuOpen) return;
    const closeMenu = () => setMenuOpen(false);

    const timeoutId = setTimeout(() => {
      window.addEventListener("click", closeMenu);
    }, 0);

    return () => {
      clearTimeout(timeoutId);
      window.removeEventListener("click", closeMenu);
    };
  }, [menuOpen]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const increaseView = async () => {
    try {
      await fetch(`http://localhost:5000/documents/${doc.id}/view`, {
        method: "PUT",
      });
    } catch { }
  };

  const increaseDownload = async () => {
    try {
      await fetch(`http://localhost:5000/documents/${doc.id}/download`, {
        method: "PUT",
      });
    } catch { }
  };

  const handleOpen = () => {
    setOpen(true);
    if (!hasViewed) {
      setViewCount((prev) => prev + 1);
      increaseView();
      setHasViewed(true);
    }
  };

  const handleDownload = (e) => {
    if (e) e.stopPropagation();

    setDownloadCount((prev) => prev + 1);
    increaseDownload();

    const a = document.createElement("a");
    a.href = doc.file_url;
    a.download = doc.title || "file";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleCopy = (e) => {
    e.stopPropagation();
    navigator.clipboard.writeText(doc.file_url);
    alert("Copied link!");
  };

  const handleEdit = (e) => {
    e.stopPropagation();
    alert("Edit " + doc.id);
  };

  const handleDelete = (e) => {
    e.stopPropagation();
    alert("Delete " + doc.id);
  };

  return (
    <>
      {/* CARD LAYOUT */}
      <div
        onClick={handleOpen}
        className={`group relative bg-white dark:bg-[#0f111a]/50 rounded-[16px] border transition-all duration-300 ease-out cursor-pointer flex flex-col justify-between p-3.5 min-h-[250px] ${isPinned
          ? "border-purple-400 dark:border-purple-500/40 shadow-[0_4px_16px_rgba(147,51,234,0.08)] bg-purple-50/5 -translate-y-1"
          : "border-[#eff0f6] dark:border-white/5 shadow-[0_4px_16px_rgba(0,0,0,0.01)] hover:shadow-[0_12px_24px_rgba(0,0,0,0.04)] hover:border-slate-200 dark:hover:border-white/10 hover:-translate-y-1"
          }`}
      >
        {/* VÙNG HEADER: Khối xám chứa Badge và Icon */}
        <div className="w-full h-20 rounded-[12px] bg-[#f8f9fc] dark:bg-[#0c0d13] p-2.5 flex flex-col justify-between relative border border-[#f1f3f9] dark:border-slate-800/20">

          {/* Subject Badge */}
          <span className="text-[9px] font-bold text-purple-600 dark:text-purple-400 bg-purple-50/80 dark:bg-purple-950/40 px-2 py-0.5 rounded self-start uppercase tracking-wider">
            {doc?.subject || doc?.subject_code || "GENERAL"}
          </span>

          {/* Định dạng file */}
          <div className="flex items-center gap-1.5 opacity-75 self-start mb-0.5">
            {getFileIcon(finalFileType)}
            <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 tracking-widest uppercase">
              {finalFileType}
            </span>
          </div>

          {/* FLOATING ACTION BUTTONS */}
          <div className="absolute top-2.5 right-2.5 flex gap-1 z-20">
            {/* Nút Star Bookmark */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                setBookmarked(!bookmarked);
              }}
              className={`w-5.5 h-5.5 rounded bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-sm flex items-center justify-center text-[11px] hover:scale-105 active:scale-95 transition-all duration-200
                ${bookmarked ? "text-yellow-500" : "text-gray-300 dark:text-gray-600"}
              `}
            >
              {bookmarked ? "★" : "☆"}
            </button>

            {/* Nút Kebab Menu */}
            <div className="relative">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setMenuOpen(!menuOpen);
                }}
                className="w-5.5 h-5.5 rounded bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-sm flex items-center justify-center text-[11px] font-bold text-gray-400 dark:text-gray-500 hover:scale-105 active:scale-95 transition-all duration-200"
              >
                ⋯
              </button>

              {/* Dropdown Menu (Đã đồng bộ thiết kế và thêm hành động Tải xuống) */}
              {menuOpen && (
                <div
                  onClick={(e) => e.stopPropagation()}
                  className="
                    absolute right-0 top-[calc(100%+4px)] w-40
                    bg-white dark:bg-slate-900
                    border border-slate-100 dark:border-slate-800
                    rounded-xl
                    shadow-[0_10px_30px_rgba(0,0,0,0.08)]
                    text-xs overflow-hidden
                    z-30 animate-in fade-in slide-in-from-top-2 duration-150
                  "
                >
                  {onTogglePin && (
                    <button
                      onClick={(e) => { e.stopPropagation(); setMenuOpen(false); onTogglePin(); }}
                      className="menu-item font-medium text-slate-700 dark:text-gray-300 hover:bg-slate-50 dark:hover:bg-slate-800/60"
                    >
                      📌 Ghim lên đầu
                    </button>
                  )}
                  <button
                    onClick={(e) => { setMenuOpen(false); handleEdit(e); }}
                    className="menu-item font-medium text-slate-700 dark:text-gray-300 hover:bg-slate-50 dark:hover:bg-slate-800/60"
                  >
                    ✏️ Sửa bài
                  </button>
                  <button
                    onClick={(e) => { setMenuOpen(false); handleCopy(e); }}
                    className="menu-item font-medium text-slate-700 dark:text-gray-300 hover:bg-slate-50 dark:hover:bg-slate-800/60"
                  >
                    🔗 Sao chép link
                  </button>
                  {/* Thêm chức năng Tải xuống vào Menu */}
                  <button
                    onClick={(e) => { setMenuOpen(false); handleDownload(e); }}
                    className="menu-item font-medium text-slate-700 dark:text-gray-300 hover:bg-slate-50 dark:hover:bg-slate-800/60"
                  >
                    ⬇️ Tải xuống file
                  </button>
                  <div className="h-px bg-slate-100 dark:bg-slate-800/60" />
                  <button
                    onClick={(e) => { setMenuOpen(false); handleDelete(e); }}
                    className="menu-item danger font-medium hover:bg-red-50 dark:hover:bg-red-950/20"
                  >
                    🗑 Xóa file
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* VÙNG CONTENT */}
        <div className="px-0.5 flex flex-col flex-grow justify-between pt-2.5 text-left">
          <div className="space-y-0.5">
            {/* Tiêu đề tài liệu */}
            <h2 className="text-[15px] font-bold text-gray-900 dark:text-gray-100 tracking-tight truncate leading-snug group-hover:text-[#2f67ff] transition-colors duration-200">
              {doc?.title || "Untitled Document"}
            </h2>

            {/* Tên tác giả */}
            <p className="text-[11px] font-medium text-slate-400 dark:text-slate-500 truncate">
              By {doc?.author || doc?.uploader_name || "An Nguyen"}
            </p>

            {/* Ngày cập nhật */}
            <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500">
              Updated: {doc?.upload_date || "2026-05-30"}
            </p>
          </div>

          {/* VÙNG FOOTER */}
          <div className="pt-2 flex items-center justify-between mt-auto">
            {/* Nút Tải xuống tiêu chuẩn xanh lam */}
            <button
              onClick={handleDownload}
              className="
                text-[10px] font-bold px-2.5 py-1.5
                rounded-md bg-[#2f67ff] hover:bg-[#1a54f0]
                text-white transition-all duration-200
                flex items-center gap-1 shrink-0 active:scale-95 shadow-sm
              "
            >
              ⬇ Tải xuống
            </button>

            {/* Khối lượt tải và mắt xem */}
            <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 dark:text-slate-500 bg-slate-50/60 dark:bg-[#0c0d13] px-2 py-0.5 rounded border border-slate-100/60 dark:border-white/5 shrink-0 select-none">
              <span className="flex items-center gap-0.5">
                ⬇ <span className="text-slate-600 dark:text-slate-300 font-extrabold">{downloadCount}</span>
              </span>
              <span className="text-slate-200 dark:text-slate-800">|</span>
              <span className="flex items-center gap-0.5">
                👁 <span className="text-slate-600 dark:text-slate-300 font-extrabold">{viewCount}</span>
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* MODAL VIEW */}
      {open && (
        <div
          className="fixed inset-0 bg-black/45 backdrop-blur-sm flex items-center justify-center p-4 z-50"
          onClick={() => setOpen(false)}
        >
          <div
            className="bg-white dark:bg-slate-900 w-full max-w-5xl rounded-2xl p-5 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="h-[520px] bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-100 dark:border-slate-800/40" />
          </div>
        </div>
      )}

      {/* CUSTOM STYLE CHO MENU DROPDOWN */}
      <style>{`
        .menu-item {
          width: 100%;
          text-align: left;
          padding: 8px 14px;
          display: flex;
          gap: 8px;
          align-items: center;
          transition: all 0.2s;
          color: #374151;
          font-size: 11.5px;
          border: none;
          background: transparent;
          cursor: pointer;
        }
        
        .dark .menu-item {
          color: #d1d5db;
        }

        .danger {
          color: #ef4444;
        }

        .dark .danger {
          color: #f87171;
        }

        .danger:hover {
          background: #fef2f2;
          color: #dc2626;
        }

        .dark .danger:hover {
          background: rgba(239, 68, 68, 0.1);
          color: #ef4444;
        }
      `}</style>
    </>
  );
}