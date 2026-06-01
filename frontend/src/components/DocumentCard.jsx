import { useEffect, useState, useMemo } from "react";
import { 
  FileText, 
  FileSpreadsheet, 
  Presentation, 
  FileImage, 
  FileCode, 
  File,
  Eye,
  Download,
  Share2,
  Check,
  Bookmark,
  X,
  ZoomIn,
  ZoomOut,
  Sparkles,
  Clock,
  User
} from "lucide-react";

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

// Hàm tạo nội dung mô phỏng học thuật chất lượng cao dựa trên tiêu đề tệp
function getSimulatedContent(title = "", subject = "") {
  const t = title.toLowerCase();
  if (t.includes("java") || t.includes("oop") || t.includes("programming")) {
    return {
      overview: "Tài liệu hệ thống hóa toàn bộ kiến thức nâng cao về lập trình hướng đối tượng (OOP) bằng ngôn ngữ Java. Nội dung tập trung vào các nguyên lý thiết kế hệ thống bền vững, mẫu thiết kế (Design Patterns) phổ biến và cách tối ưu bộ nhớ JVM.",
      sections: [
        {
          title: "I. 4 TÍNH CHẤT CỐT LÕI CỦA OOP IN JAVA",
          content: "Phân tích chuyên sâu về tính Đóng gói (Encapsulation) với access modifiers, tính Kế thừa (Inheritance) qua từ khóa extends/implements, tính Đa hình (Polymorphism) qua Overriding/Overloading, và tính Trừu tượng (Abstraction) sử dụng Abstract Class và Interface."
        },
        {
          title: "II. THIẾT KẾ ĐỐI TƯỢNG VÀ SOLID PRINCIPLES",
          content: "Hướng dẫn áp dụng nguyên lý SOLID (Single Responsibility, Open/Closed, Liskov Substitution, Interface Segregation, Dependency Inversion) để xây dựng kiến trúc code linh hoạt, dễ mở rộng và bảo trì."
        },
        {
          title: "III. QUẢN LÝ BỘ NHỚ & COLLECTION FRAMEWORK",
          content: "Cách thức JVM cấp phát bộ nhớ trên Stack và Heap. Tìm hiểu sâu Collection Framework: ArrayList vs LinkedList, HashMap vs TreeMap, cơ chế hoạt động của Garbage Collector nhằm phòng tránh memory leak."
        }
      ],
      insights: [
        "Phù hợp ôn tập thi chứng chỉ Java hoặc chuẩn bị phỏng vấn Software Engineer.",
        "Đi kèm 15 ví dụ minh họa thực tế về Design Patterns (Singleton, Factory, Observer).",
        "Có phần hướng dẫn tối ưu thời gian chạy chương trình (Time Complexity)."
      ]
    };
  } else if (t.includes("database") || t.includes("db") || t.includes("sql") || t.includes("normal") || t.includes("design")) {
    return {
      overview: "Cẩm nang toàn diện về thiết kế cơ sở dữ liệu quan hệ, chuẩn hóa dữ liệu từ 1NF đến BCNF, và tối ưu hóa truy vấn SQL nâng cao. Tài liệu cung cấp các nguyên tắc vàng để xây dựng lược đồ cơ sở dữ liệu hiệu năng cao.",
      sections: [
        {
          title: "I. THIẾT KẾ MÔ HÌNH THỰC THỂ LIÊN KẾT (ERD)",
          content: "Cách xác định các thực thể, thuộc tính và mối quan hệ (1-1, 1-N, N-N). Hướng dẫn chuyển đổi từ sơ đồ thực thể ERD sang các bảng vật lý trong PostgreSQL, MySQL và SQL Server."
        },
        {
          title: "II. CHUẨN HÓA DỮ LIỆU & TRÁNH DƯ THỪA (NORMALIZATION)",
          content: "Phương pháp phân rã bảng có hệ thống để đạt chuẩn 1NF (Atomic values), 2NF (No partial dependency), 3NF (No transitive dependency) và BCNF. Minh họa các lỗi mất dữ liệu khi phân rã sai quy cách."
        },
        {
          title: "III. TỐI ƯU TRUY VẤN & INDEXING TRONG DATABASE",
          content: "Cơ chế hoạt động của B-Tree Index. Sử dụng EXPLAIN ANALYZE để phân tích hiệu năng truy vấn. Các kỹ thuật tối ưu lệnh JOIN, Subquery và phân hoạch bảng (Table Partitioning)."
        }
      ],
      insights: [
        "Trực quan hóa lược đồ với các mô hình thực tế từ hệ thống E-commerce và E-learning.",
        "Gợi ý 25 bài tập thực hành truy vấn SQL từ cơ bản đến phức tạp.",
        "Đi kèm tài liệu cheatsheet tổng hợp câu lệnh DDL và DML phổ biến."
      ]
    };
  } else if (t.includes("react") || t.includes("web") || t.includes("js") || t.includes("frontend") || t.includes("html") || t.includes("css")) {
    return {
      overview: "Tài liệu chuyên sâu dành cho lập trình viên Front-End về ReactJS core concepts, cơ chế Virtual DOM, kiến trúc Component, quản lý State và tối ưu hóa hiệu năng ứng dụng Single Page (SPA).",
      sections: [
        {
          title: "I. KIẾN TRÚC REACT & VIRTUAL DOM",
          content: "Tìm hiểu cách React render giao diện hiệu quả thông qua Virtual DOM và thuật toán So sánh (Reconciliation). Cơ chế hoạt động của JSX và chu kỳ sống (Lifecycle) của một Component."
        },
        {
          title: "II. QUẢN LÝ TRẠNG THÁI (STATE MANAGEMENT)",
          content: "Sử dụng Hooks cốt lõi (useState, useEffect, useContext) và các Hooks nâng cao (useReducer, useMemo, useCallback) để tối ưu hóa số lần re-render của Component. Giới thiệu sơ lược về Redux Toolkit và Zustand."
        },
        {
          title: "III. XÂY DỰNG LAYOUT VÀ TỐI ƯU HIỆU NĂNG",
          content: "Kỹ thuật Lazy Loading, Code Splitting bằng React.lazy và Suspense. Kết hợp Tailwind CSS để tạo giao diện responsive, tích hợp CSS Variables cho giao diện Dark Mode cao cấp."
        }
      ],
      insights: [
        "Bao gồm sơ đồ tư duy (Mindmap) trực quan về dòng chảy dữ liệu trong React.",
        "Hướng dẫn triển khai dự án nhỏ (Mini-Project) thực tế để áp dụng ngay lý thuyết.",
        "Tập trung vào các clean-code practices khi viết Custom Hooks."
      ]
    };
  } else if (t.includes("machine") || t.includes("ml") || t.includes("ai") || t.includes("learning") || t.includes("data science")) {
    return {
      overview: "Tài liệu tổng hợp các thuật toán học máy phổ biến, toán học nền tảng (Đại số tuyến tính, Xác suất thống kê, Giải tích) và quy trình chuẩn bị dữ liệu (Data Preprocessing) trong khoa học dữ liệu.",
      sections: [
        {
          title: "I. HỌC MÁY CÓ GIÁM SÁT (SUPERVISED LEARNING)",
          content: "Phân tích các mô hình Hồi quy tuyến tính (Linear Regression), Cây quyết định (Decision Tree), Học máy Vector hỗ trợ (SVM) và Rừng ngẫu nhiên (Random Forest). Giải thích chi tiết các hàm mất mát (Loss Functions)."
        },
        {
          title: "II. HỌC MÁY KHÔNG GIÁM SÁT & NEURAL NETWORKS",
          content: "Kỹ thuật gom cụm K-Means, giảm chiều dữ liệu PCA. Giới thiệu mạng Nơ-ron nhân tạo (ANN), thuật toán Lan truyền ngược (Backpropagation) và tối ưu hóa Gradient Descent."
        },
        {
          title: "III. ĐÁNH GIÁ MÔ HÌNH VÀ HYPERPARAMETER TUNING",
          content: "Cách sử dụng ma trận nhầm lẫn (Confusion Matrix), các chỉ số Precision, Recall, F1-Score, đường cong ROC-AUC. Phương pháp Cross-Validation và tối ưu hóa siêu tham số bằng GridSearch/RandomSearch."
        }
      ],
      insights: [
        "Tóm tắt các công thức toán học cốt lõi bằng định dạng dễ nhớ.",
        "Minh họa bằng code Python sử dụng thư viện Scikit-Learn và Pandas.",
        "Phân tích chuyên sâu về vấn đề Quá khớp (Overfitting) và giải pháp Regularization (L1/L2)."
      ]
    };
  } else {
    return {
      overview: `Tài liệu nghiên cứu khoa học chuyên sâu và hệ thống bài tập thực hành chất lượng cao dành cho học phần ${subject || "Công nghệ thông tin"}. Tài liệu cung cấp các định nghĩa rõ ràng, ví dụ cụ thể và lời giải chi tiết giúp người học nhanh chóng nắm vững kiến thức nền tảng và nâng cao.`,
      sections: [
        {
          title: "I. TỔNG QUAN VỀ CHỦ ĐỀ VÀ KIẾN THỨC NỀN TẢNG",
          content: "Giới thiệu lịch sử phát triển, định nghĩa cốt lõi và các thuật ngữ chuyên ngành quan trọng nhất. Thiết lập hệ thống tư duy ban đầu và các điều kiện tiên quyết cần nắm trước khi đi sâu vào nội dung chính."
        },
        {
          title: "II. NỘI DUNG CHI TIẾT VÀ CÁC CHUYÊN ĐỀ PHÂN TÍCH",
          content: "Đi sâu phân tích từng khía cạnh kỹ thuật, quy trình hoạt động hoặc sơ đồ cấu trúc. Mỗi phần đều đi kèm với các ví dụ thực tiễn sinh động, sơ đồ minh họa và phân tích ưu nhược điểm chi tiết của từng giải pháp."
        },
        {
          title: "III. TỔNG KẾT, BÀI TẬP VÀ ĐỀ XUẤT NGHIÊN CỨU",
          content: "Tóm lược toàn bộ nội dung trọng tâm của tài liệu. Cung cấp bộ câu hỏi tự ôn tập kèm lời giải chi tiết, hướng dẫn các tài liệu đọc thêm chất lượng cao và gợi ý các hướng phát triển nghiên cứu tiếp theo."
        }
      ],
      insights: [
        "Hệ thống hóa kiến thức khoa học, trình bày mạch lạc và dễ hiểu.",
        "Thích hợp làm tài liệu ôn thi cuối kỳ, viết tiểu luận hoặc làm đồ án môn học.",
        "Được biên soạn và đóng góp bởi các thành viên xuất sắc trong cộng đồng AIStudyHub."
      ]
    };
  }
}

export default function DocumentCard({ doc, isPinned, onTogglePin }) {
  const [open, setOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [bookmarked, setBookmarked] = useState(false);
  const [hasViewed, setHasViewed] = useState(false);
  const [copied, setCopied] = useState(false);

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

  // Khóa cuộn trang nền khi mở modal tài liệu
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

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
          className="fixed inset-0 bg-slate-950/45 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 md:p-8 z-50 animate-in fade-in duration-300"
          onClick={() => setOpen(false)}
        >
          <div
            className="bg-white dark:bg-slate-900 w-full max-w-5xl h-[85vh] max-h-[720px] min-h-[480px] rounded-[24px] p-6 md:p-8 shadow-[0_32px_64px_-12px_rgba(0,0,0,0.18)] dark:shadow-[0_32px_64px_-12px_rgba(0,0,0,0.6)] border border-slate-150 dark:border-slate-800/80 flex flex-col gap-5 relative animate-in zoom-in-95 duration-355 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close Button */}
            <button
              onClick={() => setOpen(false)}
              className="absolute top-4 right-4 w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 flex items-center justify-center transition-all duration-200 hover:scale-105 active:scale-95 z-50 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Top Title Bar (Header) */}
            <div className="flex items-center gap-3 pr-8 border-b border-slate-100 dark:border-slate-800/80 pb-4 shrink-0">
              <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-300 flex items-center justify-center shrink-0 border border-purple-500/10 shadow-sm">
                {getFileIcon(finalFileType)}
              </div>
              <div className="text-left min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-base md:text-lg font-black text-slate-900 dark:text-white leading-tight truncate max-w-[280px] sm:max-w-[450px] md:max-w-[600px]" title={doc?.title}>
                    {doc?.title || "Untitled Document"}
                  </h1>
                  <span className="text-[9px] font-extrabold text-purple-600 dark:text-purple-400 bg-purple-50/80 dark:bg-purple-950/40 px-2 py-0.5 rounded uppercase tracking-wider border border-purple-500/10 shrink-0">
                    {doc?.subject || doc?.subject_code || "GENERAL"}
                  </span>
                </div>
                <p className="text-[10px] sm:text-xs text-slate-400 dark:text-slate-500 mt-1 font-semibold flex items-center gap-2">
                  <span className="flex items-center gap-1"><User className="w-3.5 h-3.5 text-purple-500/60" /> {doc?.author || doc?.uploader_name || "An Nguyen"}</span>
                  <span className="text-slate-200 dark:text-slate-800">|</span>
                  <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5 text-purple-500/60" /> {doc?.upload_date || "2026-05-30"}</span>
                </p>
              </div>
            </div>

            {/* Body Grid Section */}
            <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-3 gap-6 overflow-hidden">
              
              {/* LEFT: Live Interactive Document Reader (Col-span 2) */}
              <div className="lg:col-span-2 bg-[#f8f9fc] dark:bg-[#08090f] rounded-xl border border-slate-100 dark:border-slate-850/60 p-4 flex flex-col justify-between overflow-hidden h-full relative select-none">
                {/* Document Toolbar */}
                <div className="flex items-center justify-between border-b border-slate-200/50 dark:border-slate-850/60 pb-3 mb-3 text-xs text-slate-450 font-bold shrink-0">
                  <span className="flex items-center gap-1.5 uppercase tracking-wider text-[9px] text-slate-400 dark:text-slate-500">
                    {getFileIcon(finalFileType)} {finalFileType} reader
                  </span>
                  
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1">
                      <button className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-850 cursor-pointer">
                        <ZoomOut className="w-4 h-4" />
                      </button>
                      <span className="font-semibold px-1 text-[9px]">100%</span>
                      <button className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-850 cursor-pointer">
                        <ZoomIn className="w-4 h-4" />
                      </button>
                    </div>
                    
                    <span className="text-slate-200 dark:text-slate-800">|</span>
                    
                    <span className="text-[9px] font-bold">Trang 1 / 5</span>
                  </div>
                </div>

                {/* Real Document Sheet / Iframe */}
                <div className="flex-1 overflow-y-auto custom-scrollbar p-2 relative flex flex-col justify-start items-center w-full min-h-0">
                  {/* If PDF, try embedding actual PDF inside an iframe */}
                  {finalFileType === "pdf" && doc?.file_url ? (
                    <div className="w-full h-full rounded-lg overflow-hidden border border-slate-250 dark:border-slate-850 bg-white">
                      <iframe
                        src={`${doc.file_url}#toolbar=0&navpanes=0`}
                        className="w-full h-full border-none"
                        title={doc.title}
                      />
                    </div>
                  ) : finalFileType === "image" && doc?.file_url ? (
                    <div className="max-w-full flex items-center justify-center p-2 rounded-lg bg-white shadow-sm border border-slate-200/60">
                      <img src={doc.file_url} alt={doc.title} className="max-h-[350px] object-contain rounded" />
                    </div>
                  ) : (
                    /* Simulated academic paper sheet for other file types / fallback */
                    <div className="bg-white dark:bg-slate-900 shadow-sm rounded-xl border border-slate-200/60 dark:border-slate-800 p-6 md:p-8 text-slate-800 dark:text-slate-250 text-left overflow-y-auto h-full flex flex-col gap-4 w-full font-sans leading-relaxed select-text relative">
                      <div className="text-center border-b pb-4 mb-4 select-none">
                        <span className="text-[9px] uppercase tracking-widest text-slate-400 dark:text-slate-500 font-bold">AIStudyHub Academic Library Repository</span>
                        <h2 className="text-sm font-extrabold text-slate-900 dark:text-white mt-2 uppercase tracking-wide">{doc?.title}</h2>
                        <p className="text-[9px] text-slate-450 dark:text-slate-550 mt-1 italic">Tác giả: {doc?.author || doc?.uploader_name || "An Nguyen"} • Lưu trữ học thuật</p>
                      </div>
                      
                      {/* Dynamic Simulated Content based on title */}
                      <div className="space-y-4 text-xs font-semibold leading-relaxed">
                        <div>
                          <span className="font-extrabold uppercase text-[9px] text-purple-650 dark:text-purple-400 tracking-wider">TÓM TẮT TÀI LIỆU (OVERVIEW)</span>
                          <p className="mt-1.5 text-slate-650 dark:text-slate-405 text-justify">
                            {doc?.description || `Tài liệu nghiên cứu khoa học chuyên sâu và hệ thống bài tập thực hành chất lượng cao dành cho học phần ${doc?.subject || "Công nghệ thông tin"}. Tài liệu cung cấp các định nghĩa rõ ràng, ví dụ cụ thể và lời giải chi tiết giúp người học nhanh chóng nắm vững kiến thức nền tảng và nâng cao.`}
                          </p>
                        </div>
                        
                        <div className="space-y-1">
                          <span className="font-extrabold text-[9px] text-slate-900 dark:text-slate-100 tracking-wider block uppercase">I. CHI TIẾT TÀI LIỆU & NỘI DUNG</span>
                          <p className="text-slate-650 dark:text-slate-400 text-justify">
                            Tài liệu này bao gồm bài tập và giáo trình tóm tắt chuyên sâu có hệ thống. Giúp học viên nắm rõ kiến thức trọng tâm của học phần {doc?.subject || "Công nghệ thông tin"}, chuẩn bị tốt nhất cho kỳ thi cuối kỳ hoặc các đề án nghiên cứu chuyên sâu.
                          </p>
                        </div>

                        <div className="space-y-1">
                          <span className="font-extrabold text-[9px] text-slate-900 dark:text-slate-100 tracking-wider block uppercase">II. TÓM TẮT TỪ TRỢ LÝ HỌC TẬP AI</span>
                          <p className="text-slate-650 dark:text-slate-400 text-justify">
                            {doc?.ai_summary || "Hệ thống AI đã phân tích cấu trúc tài liệu này và nhận thấy tài liệu được trình bày rất mạch lạc, đi kèm sơ đồ trực quan và mã nguồn mẫu/bài tập minh họa thiết thực."}
                          </p>
                        </div>
                        
                        <div className="border-t pt-4 mt-4 select-none text-center">
                          <span className="text-[9px] uppercase tracking-widest text-slate-400 dark:text-slate-500 font-bold">--- KẾT THÚC BẢN XEM TRƯỚC HỌC LIỆU ---</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* RIGHT: Document Details & AI Scholar Panel (Col-span 1) */}
              <div className="lg:col-span-1 flex flex-col justify-between h-full overflow-hidden shrink-0">
                
                {/* Details scroll container */}
                <div className="flex-1 overflow-y-auto pr-1 flex flex-col gap-4 text-left custom-scrollbar min-h-0">
                  
                  {/* Academic stats badges */}
                  <div className="grid grid-cols-2 gap-2 text-[9px] font-extrabold tracking-wider uppercase text-slate-500 dark:text-slate-450 shrink-0">
                    <div className="bg-slate-50 dark:bg-slate-950 p-2.5 rounded-lg border border-slate-100 dark:border-slate-850/60 flex flex-col gap-0.5">
                      <span className="text-slate-400 text-[8px] font-bold">Dung lượng</span>
                      <span className="text-slate-800 dark:text-slate-200 font-black">{doc?.file_size ? formatFileSize(doc.file_size) : "2.4 MB"}</span>
                    </div>
                    <div className="bg-slate-50 dark:bg-slate-950 p-2.5 rounded-lg border border-slate-100 dark:border-slate-850/60 flex flex-col gap-0.5">
                      <span className="text-slate-400 text-[8px] font-bold">Định dạng file</span>
                      <span className="text-slate-800 dark:text-slate-200 font-black tracking-widest">{finalFileType}</span>
                    </div>
                  </div>

                  {/* AI Study Summary Panel */}
                  <div className="relative overflow-hidden rounded-xl border border-purple-500/15 dark:border-purple-500/20 bg-purple-50/20 dark:bg-purple-950/10 p-4 flex flex-col gap-3 shrink-0">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-purple-500/5 rounded-full blur-xl pointer-events-none" />
                    
                    <div className="flex items-center gap-1.5 text-purple-700 dark:text-purple-400 uppercase tracking-widest text-[9px] font-extrabold select-none">
                      <Sparkles className="w-3.5 h-3.5 text-purple-500 animate-pulse" />
                      <span>Tóm tắt học thuật AI</span>
                    </div>

                    <div className="space-y-3">
                      <div className="text-[11px] font-semibold text-slate-700 dark:text-slate-350 leading-relaxed text-justify italic">
                        {doc?.ai_summary || doc?.description || "Hệ thống AI đang xử lý phân tích cấu trúc tài liệu. Bản tóm tắt sẽ hiển thị chi tiết các phần chính và các thuật toán liên quan."}
                      </div>

                      <div className="w-full h-px bg-purple-500/10 dark:bg-purple-500/20" />

                      {/* Key Insights bullets */}
                      <div className="space-y-2">
                        <span className="text-[8px] font-extrabold uppercase tracking-wider text-purple-655 dark:text-purple-450 block select-none">Điểm cốt lõi từ trợ lý học tập</span>
                        <ul className="text-[10px] text-slate-600 dark:text-slate-400 space-y-1.5 font-bold list-none pl-0">
                          <li className="flex items-start gap-1.5 leading-snug">
                            <span className="text-purple-500 select-none shrink-0">✦</span>
                            <span>Hệ thống hóa toàn bộ công thức và sơ đồ tư duy thực hành.</span>
                          </li>
                          <li className="flex items-start gap-1.5 leading-snug">
                            <span className="text-purple-500 select-none shrink-0">✦</span>
                            <span>Đi kèm bài tập tự luyện và ví dụ thực tiễn chi tiết.</span>
                          </li>
                          <li className="flex items-start gap-1.5 leading-snug">
                            <span className="text-purple-500 select-none shrink-0">✦</span>
                            <span>Phù hợp chuẩn bị ôn thi cuối học kỳ hoặc tiểu luận học thuật.</span>
                          </li>
                        </ul>
                      </div>
                    </div>
                  </div>

                  {/* Standard downloads & views summary */}
                  <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 dark:text-slate-500 px-2 shrink-0 select-none">
                    <span className="flex items-center gap-1">
                      👁 Lượt xem: <span className="text-slate-750 dark:text-slate-300 font-extrabold">{viewCount}</span>
                    </span>
                    <span className="flex items-center gap-1">
                      ⬇ Lượt tải: <span className="text-slate-750 dark:text-slate-300 font-extrabold">{downloadCount}</span>
                    </span>
                  </div>
                </div>

                {/* Actions Drawer (Bottom) */}
                <div className="border-t border-slate-100 dark:border-slate-800/80 pt-4 mt-4 flex flex-col gap-2 shrink-0">
                  
                  {/* Big blue direct download action button */}
                  <button
                    onClick={handleDownload}
                    className="
                      w-full py-2.5 rounded-lg bg-[#2f67ff] hover:bg-[#1a54f0]
                      text-white font-extrabold text-xs transition-all duration-200
                      flex items-center justify-center gap-1.5 cursor-pointer shadow-sm active:scale-[0.98]
                    "
                  >
                    <Download className="w-4 h-4" />
                    Tải xuống tài liệu học tập
                  </button>

                  {/* Secondary utility actions */}
                  <div className="grid grid-cols-2 gap-2 select-none">
                    {/* Star bookmark toggle */}
                    <button
                      onClick={() => setBookmarked(!bookmarked)}
                      className={`
                        py-2 rounded-lg border text-[10px] font-extrabold flex items-center justify-center gap-1.5 transition-all duration-200 cursor-pointer active:scale-[0.97]
                        ${bookmarked 
                          ? "bg-amber-500/10 border-amber-500/30 text-amber-500 dark:text-amber-400" 
                          : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-850"
                        }
                      `}
                    >
                      <Bookmark className="w-3.5 h-3.5 fill-current" />
                      {bookmarked ? "Đã đánh dấu" : "Đánh dấu sao"}
                    </button>

                    {/* Copy link button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        navigator.clipboard.writeText(doc.file_url);
                        setCopied(true);
                        setTimeout(() => setCopied(false), 2000);
                      }}
                      className={`
                        py-2 rounded-lg border text-[10px] font-extrabold flex items-center justify-center gap-1.5 transition-all duration-200 cursor-pointer active:scale-[0.97]
                        ${copied 
                          ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-500 dark:text-emerald-400" 
                          : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-850"
                        }
                      `}
                    >
                      {copied ? (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          Đã sao chép!
                        </>
                      ) : (
                        <>
                          <Share2 className="w-3.5 h-3.5" />
                          Sao chép liên kết
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
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