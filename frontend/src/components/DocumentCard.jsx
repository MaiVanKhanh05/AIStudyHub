import { useEffect, useState } from "react";

/* ================= FILE TYPE ================= */
function getFileType(url = "") {
  if (!url) return "";

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
  const [menuOpen, setMenuOpen] = useState(false); // ⚡ Dùng lại state quản lý ẩn/hiện
  const [bookmarked, setBookmarked] = useState(false);
  const [hasViewed, setHasViewed] = useState(false);

  // State quản lý số lượt xem và lượt tải cục bộ
  const [viewCount, setViewCount] = useState(doc?.views || 0);
  const [downloadCount, setDownloadCount] = useState(doc?.downloads || 0);

  const fileType = getFileType(doc?.file_url);

  // ⚡ TỰ ĐỘNG ĐÓNG MENU: Khi bấm chuột ra ngoài vùng trống của card
  useEffect(() => {
    if (!menuOpen) return;
    const closeMenu = () => setMenuOpen(false);
    window.addEventListener("click", closeMenu);
    return () => window.removeEventListener("click", closeMenu);
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
        className="
          group relative
          bg-white
          rounded-[1.5rem]
          border border-gray-100
          shadow-[0_4px_25px_rgba(0,0,0,0.02)]
          hover:shadow-[0_15px_35px_rgba(0,0,0,0.06)]
          hover:-translate-y-1
          transition-all duration-300
          cursor-pointer
          flex flex-col justify-between
          h-full min-w-0
        "
      >
        {/* IMAGE CONTAINER & ACTIONS */}
        <div className="relative p-2.5 pb-0">

          {/* Badge ghim hiện ở góc trái nếu có */}
          {isPinned && (
            <div className="absolute top-4 left-4 z-30 bg-blue-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-md shadow-md select-none">
              📌 PINNED
            </div>
          )}

          {/* Vùng chứa box ảnh và nút bấm */}
          <div className="relative">

            {/* Box ảnh */}
            <div className="h-36 bg-gray-50 rounded-xl overflow-hidden border border-gray-100">
              <img
                src={doc?.image || "https://via.placeholder.com/400"}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/5 via-transparent to-transparent" />
            </div>

            {/* FLOATING BUTTONS & MENU (Đã cố định z-40 để hiển thị đè lên chữ) */}
            <div className="absolute top-3 right-3 flex gap-2 z-40">

              {/* Nút Ngôi sao */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setBookmarked(!bookmarked);
                }}
                className={`w-8 h-8 rounded-full bg-white shadow-md flex items-center justify-center text-xs hover:scale-105 active:scale-95 transition-all duration-200
                  ${bookmarked ? "text-yellow-500" : "text-gray-400"}
                `}
              >
                {bookmarked ? "★" : "☆"}
              </button>

              {/* Vùng chứa nút ba chấm */}
              <div className="relative">
                {/* ⚡ HÀM KÍCH HOẠT: Click chuột vào nút này mới làm đảo trạng thái đóng/mở của menu */}
                <button
                  onClick={(e) => {
                    e.stopPropagation(); // Ngăn hành vi mở modal xem chi tiết file
                    setMenuOpen(!menuOpen);
                  }}
                  className="w-8 h-8 rounded-full bg-white shadow-md flex items-center justify-center text-xs font-extrabold text-gray-800 hover:scale-105 active:scale-95 transition-all duration-200"
                >
                  ⋯
                </button>

                {/* ⚡ ĐIỀU KIỆN HIỂN THỊ: Chỉ khi menuOpen === true thì khối Menu này mới render lên màn hình */}
                {menuOpen && (
                  <div
                    onClick={(e) => e.stopPropagation()}
                    className="
                      absolute right-0 top-[calc(100%+8px)] w-40
                      bg-white
                      border border-gray-100/70
                      rounded-2xl
                      shadow-[0_15px_30px_-5px_rgba(0,0,0,0.1),0_10px_15px_-5px_rgba(0,0,0,0.05)]
                      text-xs overflow-hidden
                      z-50 animate-in fade-in slide-in-from-top-2 duration-150
                    "
                  >
                    {onTogglePin && (
                      <button
                        onClick={(e) => { e.stopPropagation(); setMenuOpen(false); onTogglePin(); }}
                        className="menu-item font-semibold text-blue-600 hover:bg-blue-50/50"
                      >
                        {isPinned ? "📍 Unpin Card" : "📌 Pin to Top"}
                      </button>
                    )}
                    <button
                      onClick={(e) => { setMenuOpen(false); handleEdit(e); }}
                      className="menu-item"
                    >
                      ✏️ Edit
                    </button>
                    <button
                      onClick={(e) => { setMenuOpen(false); handleDownload(e); }}
                      className="menu-item"
                    >
                      ⬇ Download
                    </button>
                    <button
                      onClick={(e) => { setMenuOpen(false); handleCopy(e); }}
                      className="menu-item"
                    >
                      🔗 Copy link
                    </button>
                    <div className="h-px bg-gray-100" />
                    <button
                      onClick={(e) => { setMenuOpen(false); handleDelete(e); }}
                      className="menu-item danger"
                    >
                      🗑 Delete
                    </button>
                  </div>
                )}
              </div>

            </div>
          </div>
        </div>

        {/* CONTENT INFO BLOCK */}
        <div className="px-5 pt-4 pb-4 text-center flex flex-col flex-grow justify-between min-w-0">
          <div className="space-y-1 mb-3">
            <h2 className="text-base font-bold text-gray-800 tracking-tight line-clamp-1 group-hover:text-blue-600 transition-colors duration-300">
              {doc?.title}
            </h2>

            <p className="text-xs font-medium text-gray-400/90 truncate">
              By {doc?.author || "Unknown"}
            </p>

            {doc?.upload_date && (
              <p className="text-[11px] font-semibold text-gray-300">
                Updated: {doc.upload_date}
              </p>
            )}
          </div>

          {/* BOTTOM INTERACTION BAR */}
          <div className="pt-3 border-t border-gray-100 flex items-center justify-between gap-1">
            <button
              onClick={handleDownload}
              className="
                text-xs font-bold px-3.5 py-2
                rounded-xl
                bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500
                text-white shadow-[0_2px_8_rgba(59,130,246,0.15)]
                hover:shadow-[0_4px_12px_rgba(59,130,246,0.25)] hover:scale-[1.02]
                active:scale-95 transition-all duration-200
                flex items-center gap-1 shrink-0
              "
            >
              ⬇ Download
            </button>

            <div className="flex items-center gap-2 text-xs font-bold text-gray-400 bg-gray-50 px-2.5 py-1.5 rounded-xl border border-gray-100 shrink-0 select-none">
              <span className="flex items-center gap-0.5">
                ⬇ <span className="text-gray-600 font-extrabold">{downloadCount}</span>
              </span>
              <span className="text-gray-200">|</span>
              <span className="flex items-center gap-0.5">
                👁 <span className="text-gray-600 font-extrabold">{viewCount}</span>
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* MODAL VIEW */}
      {open && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-50"
          onClick={() => setOpen(false)}
        >
          <div
            className="bg-white w-full max-w-5xl rounded-2xl p-5 shadow-2xl scale-in"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="h-[520px] bg-gray-50 rounded-xl border border-gray-100" />
          </div>
        </div>
      )}

      {/* CUSTOM MENU STYLE */}
      <style>{`
        .menu-item {
          width: 100%;
          text-align: left;
          padding: 8px 14px;
          display: flex;
          gap: 6px;
          align-items: center;
          transition: all 0.2s;
          color: #4b5563;
          font-weight: 500;
        }

        .menu-item:hover {
          background: #f8fafc;
          color: #1f2937;
        }

        .danger {
          color: #ef4444;
        }

        .danger:hover {
          background: #fef2f2;
          color: #dc2626;
        }
      `}</style>
    </>
  );
}