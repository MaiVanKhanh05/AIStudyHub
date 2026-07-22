import { useEffect, useState, useMemo } from "react";
import { API_URL } from "@/config/api.js";
import { useLanguage } from "../context/LanguageContext";
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
  Heart,
  X,
  ZoomIn,
  ZoomOut,
  Sparkles,
  Clock,
  User,
  BookOpen,
  Trash2,
  Pin,
  Link2
} from "lucide-react";
import { toast } from "sonner";
import DocumentPreviewModal from "./DocumentPreviewModal";
import { deleteFileFromSupabase } from "../lib/supabase";

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

export default function DocumentCard({ doc, isPinned, onTogglePin, isPersonal, onShare, isMyShared, onDelete, onUnshare, onBookmarkChange }) {
  const { t, language } = useLanguage();
  const [open, setOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [bookmarked, setBookmarked] = useState(doc?.isBookmarked || false);
  const [hasViewed, setHasViewed] = useState(false);
  const [copied, setCopied] = useState(false);
  const [previewDoc, setPreviewDoc] = useState(null);

  // State quản lý số lượt xem và lượt tải cục bộ dựa trên dữ liệu thật
  const [viewCount, setViewCount] = useState(doc?.views || 0);
  const [downloadCount, setDownloadCount] = useState(doc?.downloads || 0);

  // Trích xuất định dạng file an toàn
  const finalFileType = useMemo(() => {
    return getFileType(doc?.file_url);
  }, [doc?.file_url]);

  const formattedUploadDate = useMemo(() => {
    if (!doc?.upload_date) return language === "vi" ? "30 Thg 05, 2026" : "May 30, 2026";
    try {
      const d = new Date(doc.upload_date);
      if (isNaN(d.getTime())) return doc.upload_date;
      return d.toLocaleDateString(language === "vi" ? "vi-VN" : "en-US", { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
    } catch {
      return doc.upload_date;
    }
  }, [doc?.upload_date, language]);

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
    if (doc?.isBookmarked !== undefined) {
      setBookmarked(doc.isBookmarked);
    }
  }, [doc?.isBookmarked]);

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
    const docId = doc?.document_id || doc?.id;
    if (!docId) return;
    try {
      const token = localStorage.getItem("token") || sessionStorage.getItem("token");
      await fetch(`${API_URL}/api/documents/${docId}/view`, {
        method: "PUT",
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
    } catch { }
  };

  const handlePreviewClick = () => {
    setPreviewDoc(doc);
  };

  const increaseDownload = async () => {
    const docId = doc?.document_id || doc?.id;
    if (!docId) return;
    try {
      const token = localStorage.getItem("token") || sessionStorage.getItem("token");
      await fetch(`${API_URL}/api/documents/${docId}/download`, {
        method: "PUT",
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
    } catch { }
  };

  const handleOpen = () => {
    setPreviewDoc(doc);
    if (!hasViewed) {
      setViewCount((prev) => prev + 1);
      increaseView();
      setHasViewed(true);
    }
  };

  const handleDownload = async (e) => {
    if (e) e.stopPropagation();

    setDownloadCount((prev) => prev + 1);
    increaseDownload();

    if (!doc.file_url) {
      toast.error(t("myDocs.toast_download_fail") || "Không tìm thấy đường dẫn tải xuống!");
      return;
    }

    try {
      const response = await fetch(doc.file_url);
      if (!response.ok) throw new Error("Network response was not ok");
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      
      const a = document.createElement("a");
      a.href = blobUrl;
      const urlExt = doc.file_url.split('.').pop().split('?')[0] || "pdf";
      const cleanTitle = (doc.title || "document").endsWith("." + urlExt) 
        ? (doc.title || "document") 
        : `${doc.title || "document"}.${urlExt}`;
      a.download = cleanTitle;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);
    } catch (error) {
      console.error("Direct download failed, falling back to new tab:", error);
      window.open(doc.file_url, "_blank");
    }
  };

  const handleCopy = (e) => {
    e.stopPropagation();
    const docId = doc.document_id || doc.id;
    const previewUrl = docId ? `${window.location.origin}/preview/${docId}` : (doc.file_url || "https://aistudyhub.com");
    navigator.clipboard.writeText(previewUrl);
    toast.success(language === "vi" ? "Đã sao chép liên kết xem trước vào clipboard!" : "Preview link copied to clipboard!");
  };

  const handleEdit = (e) => {
    e.stopPropagation();
    toast.info(language === "vi" ? "Tính năng sửa tài liệu đang được cập nhật" : "Document editing is being updated");
  };

  const handleDelete = async (e) => {
    e.stopPropagation();
    const docId = doc?.document_id || doc?.id;
    if (!docId) return;

    const confirmed = window.confirm(language === "vi" ? "Bạn có chắc chắn muốn xóa vĩnh viễn tài liệu này khỏi hệ thống không?" : "Are you sure you want to permanently delete this document from the system?");
    if (!confirmed) return;

    try {
      // 1. Delete the file from Supabase Storage if file_url is present
      if (doc?.file_url) {
        try {
          const urlParts = doc.file_url.split("/AIStudyHub/");
          if (urlParts.length > 1) {
            const filePath = decodeURIComponent(urlParts[1]);
            const storageResult = await deleteFileFromSupabase(filePath, "AIStudyHub");
            if (!storageResult.success) {
              console.warn("Could not delete from Supabase storage:", storageResult.error);
            }
          }
        } catch (storageErr) {
          console.error("Storage deletion error:", storageErr);
        }
      }

      // 2. Delete the record from PostgreSQL database via backend API
      const token = localStorage.getItem("token") || sessionStorage.getItem("token");
      const res = await fetch(`${API_URL}/api/documents/${docId}`, {
        method: "DELETE",
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });
      const data = await res.json();

      if (res.ok) {
        toast.success(language === "vi" ? "Đã xóa tài liệu thành công khỏi hệ thống!" : "Document deleted successfully!");
        if (onDelete) {
          onDelete(docId);
        }
      } else {
        toast.error(data.error || (language === "vi" ? "Không thể xóa tài liệu." : "Failed to delete document."));
      }
    } catch (err) {
      console.error("Lỗi khi xóa tài liệu:", err);
      toast.error(language === "vi" ? "Đã xảy ra lỗi khi kết nối tới server để xóa tài liệu." : "Server error deleting document.");
    }
  };

  const handleUnshare = async (e) => {
    if (e) e.stopPropagation();
    const docId = doc?.document_id || doc?.id;
    if (!docId) return;

    try {
      const token = localStorage.getItem("token") || sessionStorage.getItem("token");
      const res = await fetch(`${API_URL}/api/documents/${docId}/unshare`, {
        method: "PUT",
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });
      const data = await res.json();

      if (res.ok) {
        toast.success(t("myDocs.toast_unpost_success") || "Đã gỡ tài liệu khỏi Trang Cộng Đồng thành công!");
        if (onUnshare) {
          onUnshare(docId);
        }
      } else {
        toast.error(data.error || (t("myDocs.toast_unpost_fail") || "Không thể gỡ tài liệu."));
      }
    } catch (err) {
      console.error("Lỗi khi gỡ tài liệu:", err);
      toast.error(language === "vi" ? "Đã xảy ra lỗi khi kết nối tới server để gỡ tài liệu." : "Server error removing document.");
    }
  };

  const handleBookmarkToggle = async (e) => {
    e.stopPropagation();
    const docId = doc?.document_id || doc?.id;
    if (!docId) return;
    try {
      const token = localStorage.getItem("token") || sessionStorage.getItem("token");
      const res = await fetch(`${API_URL}/api/documents/${docId}/bookmark`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setBookmarked(data.bookmarked);
        if (data.bookmarked) {
          toast.success(language === "vi" ? "Đã lưu tài liệu vào Kho Yêu Thích!" : "Saved to Favorites!");
        } else {
          toast.info(language === "vi" ? "Đã bỏ lưu tài liệu khỏi Kho Yêu Thích." : "Removed from Favorites.");
        }
        if (onBookmarkChange) {
          onBookmarkChange(docId, data.bookmarked);
        }
      }
    } catch (err) {
      console.error(err);
      toast.error(language === "vi" ? "Lỗi khi lưu tài liệu." : "Error saving document.");
    }
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
            {/* Nút Heart Bookmark */}
            <button
              onClick={handleBookmarkToggle}
              className={`w-6 h-6 rounded-full bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-sm flex items-center justify-center hover:scale-110 active:scale-95 transition-all duration-300
                ${bookmarked ? "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800/50" : ""}
              `}
            >
              <Heart className={`w-3.5 h-3.5 transition-colors duration-300 ${bookmarked ? "fill-red-500 text-red-500" : "text-gray-400 dark:text-gray-500"}`} />
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
                  {isPersonal ? (
                    <>
                      <button
                        onClick={(e) => { setMenuOpen(false); handleDownload(e); }}
                        className="menu-item font-medium text-slate-700 dark:text-gray-300 hover:bg-slate-50 dark:hover:bg-slate-800/60 flex items-center"
                      >
                        <Download className="w-4 h-4 mr-2" /> {t("myDocs.download") || "Tải xuống"}
                      </button>
                      <button
                        onClick={(e) => {
                          setMenuOpen(false);
                          if (onShare) {
                            e.stopPropagation();
                            onShare();
                          } else {
                            handleCopy(e);
                          }
                        }}
                        className="menu-item font-medium text-slate-700 dark:text-gray-300 hover:bg-slate-50 dark:hover:bg-slate-800/60 flex items-center"
                      >
                        <Share2 className="w-4 h-4 mr-2" /> {t("myDocs.share") || "Chia sẻ"}
                      </button>
                      <div className="h-px bg-slate-100 dark:bg-slate-800/60 my-1" />
                      <button
                        onClick={(e) => { setMenuOpen(false); handleDelete(e); }}
                        className="menu-item danger font-medium hover:bg-red-50 dark:hover:bg-red-950/20 flex items-center text-red-600"
                      >
                        <Trash2 className="w-4 h-4 mr-2" /> {t("myDocs.remove") || "Gỡ bỏ"}
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={(e) => { setMenuOpen(false); handleCopy(e); }}
                        className="menu-item font-medium text-slate-700 dark:text-gray-300 hover:bg-slate-50 dark:hover:bg-slate-800/60 flex items-center"
                      >
                        <Link2 className="w-4 h-4 mr-2" /> {language === "vi" ? "Sao chép link" : "Copy link"}
                      </button>
                      <button
                        onClick={(e) => { setMenuOpen(false); handleDownload(e); }}
                        className="menu-item font-medium text-slate-700 dark:text-gray-300 hover:bg-slate-50 dark:hover:bg-slate-800/60 flex items-center"
                      >
                        <Download className="w-4 h-4 mr-2" /> {language === "vi" ? "Tải xuống file" : "Download file"}
                      </button>
                      {isMyShared && (
                        <>
                          <div className="h-px bg-slate-100 dark:bg-slate-800/60 my-1" />
                          <button
                            onClick={(e) => { setMenuOpen(false); handleUnshare(e); }}
                            className="menu-item danger font-medium hover:bg-red-50 dark:hover:bg-red-950/20 flex items-center text-red-600"
                          >
                            <Trash2 className="w-4 h-4 mr-2" /> {t("myDocs.remove") || "Gỡ bỏ"}
                          </button>
                        </>
                      )}
                    </>
                  )}
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
              {language === "vi" ? "Bởi" : "By"} {doc?.author || doc?.uploader_name || "An Nguyen"}
            </p>

            {/* Ngày cập nhật */}
            <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500">
              {language === "vi" ? "Cập nhật:" : "Updated:"} {formattedUploadDate}
            </p>
          </div>

          {/* VÙNG FOOTER */}
          <div className="pt-2 flex items-center justify-between mt-auto">
            {/* Nút Tải xuống tiêu chuẩn tím */}
            <button
              onClick={handleDownload}
              className="
                text-[11px] font-bold px-3 py-1.5
                rounded-xl bg-purple-600 hover:bg-purple-700
                text-white transition-all duration-200
                flex items-center gap-1.5 shrink-0 active:scale-95 shadow-sm
              "
            >
              <Download className="w-3.5 h-3.5 text-white" /> {t("myDocs.download") || "Tải xuống"}
            </button>

            {/* Khối lượt tải và mắt xem */}
            <div className="flex items-center gap-2 text-[10.5px] font-bold text-slate-400 dark:text-slate-500 bg-slate-50/60 dark:bg-[#0c0d13] px-2.5 py-1.5 rounded-xl border border-slate-100/60 dark:border-white/5 shrink-0 select-none">
              <span className="flex items-center gap-1">
                <Download className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" /> <span className="text-slate-700 dark:text-slate-300 font-extrabold">{downloadCount}</span>
              </span>
              <span className="text-slate-200 dark:text-slate-800">|</span>
              <span className="flex items-center gap-1">
                <Eye className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" /> <span className="text-slate-700 dark:text-slate-300 font-extrabold">{viewCount}</span>
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
                  <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5 text-purple-500/60" /> {formattedUploadDate}</span>
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

                    <span className="text-[9px] font-bold">{language === "vi" ? "Trang 1 / 5" : "Page 1 / 5"}</span>
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
                        <p className="text-[9px] text-slate-450 dark:text-slate-550 mt-1 italic">{language === "vi" ? "Tác giả:" : "Author:"} {doc?.author || doc?.uploader_name || "An Nguyen"} • {language === "vi" ? "Lưu trữ học thuật" : "Academic Archive"}</p>
                      </div>

                      {/* Dynamic Simulated Content based on title */}
                      <div className="space-y-4 text-xs font-semibold leading-relaxed">
                        <div>
                          <span className="font-extrabold uppercase text-[9px] text-purple-600 dark:text-purple-400 tracking-wider">{t("preview.details") || (language === "vi" ? "TÓM TẮT TÀI LIỆU (OVERVIEW)" : "DOCUMENT OVERVIEW")}</span>
                          <p className="mt-1.5 text-slate-650 dark:text-slate-405 text-justify">
                            {doc?.description || (language === "vi" ? `Tài liệu nghiên cứu khoa học chuyên sâu và hệ thống bài tập thực hành chất lượng cao dành cho học phần ${doc?.subject || "Công nghệ thông tin"}. Tài liệu cung cấp các định nghĩa rõ ràng, ví dụ cụ thể và lời giải chi tiết giúp người học nhanh chóng nắm vững kiến thức nền tảng và nâng cao.` : `In-depth academic research material and high-quality practice exercises for ${doc?.subject || "Information Technology"}. The document provides clear definitions, concrete examples, and detailed solutions to help learners quickly master foundational and advanced knowledge.`)}
                          </p>
                        </div>

                        <div className="space-y-1">
                          <span className="font-extrabold text-[9px] text-slate-900 dark:text-slate-100 tracking-wider block uppercase">{language === "vi" ? "I. CHI TIẾT TÀI LIỆU & NỘI DUNG" : "I. DOCUMENT DETAILS & CONTENT"}</span>
                          <p className="text-slate-650 dark:text-slate-400 text-justify">
                            {language === "vi" ? `Tài liệu này bao gồm bài tập và giáo trình tóm tắt chuyên sâu có hệ thống. Giúp học viên nắm rõ kiến thức trọng tâm của học phần ${doc?.subject || "Công nghệ thông tin"}, chuẩn bị tốt nhất cho kỳ thi cuối kỳ hoặc các đề án nghiên cứu chuyên sâu.` : `This document includes structured practice problems and in-depth summary materials. It helps students master core concepts of ${doc?.subject || "Information Technology"}, preparing them well for final exams or research projects.`}
                          </p>
                        </div>

                        <div className="space-y-1">
                          <span className="font-extrabold text-[9px] text-slate-900 dark:text-slate-100 tracking-wider block uppercase">{language === "vi" ? "II. TÓM TẮT TỪ TRỢ LÝ HỌC TẬP AI" : "II. SUMMARY FROM AI LEARNING ASSISTANT"}</span>
                          <p className="text-slate-650 dark:text-slate-400 text-justify">
                            {doc?.ai_summary || (language === "vi" ? "Hệ thống AI đã phân tích cấu trúc tài liệu này và nhận thấy tài liệu được trình bày rất mạch lạc, đi kèm sơ đồ trực quan và mã nguồn mẫu/bài tập minh họa thiết thực." : "The AI system has analyzed this document's structure and found it to be very well-organized, with intuitive diagrams and practical code samples/exercises.")}
                          </p>
                        </div>

                        <div className="border-t pt-4 mt-4 select-none text-center">
                          <span className="text-[9px] uppercase tracking-widest text-slate-400 dark:text-slate-500 font-bold">{language === "vi" ? "--- KẾT THÚC BẢN XEM TRƯỚC HỌC LIỆU ---" : "--- END OF DOCUMENT PREVIEW ---"}</span>
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
                      <span className="text-slate-400 text-[8px] font-bold">{language === "vi" ? "Dung lượng" : "Size"}</span>
                      <span className="text-slate-800 dark:text-slate-200 font-black">{doc?.file_size ? formatFileSize(doc.file_size) : "2.4 MB"}</span>
                    </div>
                    <div className="bg-slate-50 dark:bg-slate-950 p-2.5 rounded-lg border border-slate-100 dark:border-slate-850/60 flex flex-col gap-0.5">
                      <span className="text-slate-400 text-[8px] font-bold">{language === "vi" ? "Định dạng file" : "File format"}</span>
                      <span className="text-slate-800 dark:text-slate-200 font-black tracking-widest">{finalFileType}</span>
                    </div>
                  </div>

                  {/* AI Study Summary Panel */}
                  <div className="relative overflow-hidden rounded-xl border border-purple-500/15 dark:border-purple-500/20 bg-purple-50/20 dark:bg-purple-950/10 p-4 flex flex-col gap-3 shrink-0">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-purple-500/5 rounded-full blur-xl pointer-events-none" />

                    <div className="flex items-center gap-1.5 text-purple-700 dark:text-purple-400 uppercase tracking-widest text-[9px] font-extrabold select-none">
                      <Sparkles className="w-3.5 h-3.5 text-purple-500 animate-pulse" />
                      <span>{language === "vi" ? "Tóm tắt học thuật AI" : "AI Academic Summary"}</span>
                    </div>

                    <div className="space-y-3">
                      <div className="text-[11px] font-semibold text-slate-700 dark:text-slate-350 leading-relaxed text-justify italic">
                        {doc?.ai_summary || doc?.description || (language === "vi" ? "Hệ thống AI đang xử lý phân tích cấu trúc tài liệu. Bản tóm tắt sẽ hiển thị chi tiết các phần chính và các thuật toán liên quan." : "The AI system is analyzing the document structure. The summary will detail key sections and related algorithms.")}
                      </div>

                      <div className="w-full h-px bg-purple-500/10 dark:bg-purple-500/20" />

                      {/* Key Insights bullets */}
                      <div className="space-y-2">
                        <span className="text-[8px] font-extrabold uppercase tracking-wider text-purple-600 dark:text-purple-450 block select-none">{language === "vi" ? "Điểm cốt lõi từ trợ lý học tập" : "Key Insights from AI Assistant"}</span>
                        <ul className="text-[10px] text-slate-600 dark:text-slate-400 space-y-1.5 font-bold list-none pl-0">
                          <li className="flex items-start gap-1.5 leading-snug">
                            <span className="text-purple-500 select-none shrink-0">✦</span>
                            <span>{language === "vi" ? "Hệ thống hóa toàn bộ công thức và sơ đồ tư duy thực hành." : "Systematize all formulas and practical mind maps."}</span>
                          </li>
                          <li className="flex items-start gap-1.5 leading-snug">
                            <span className="text-purple-500 select-none shrink-0">✦</span>
                            <span>{language === "vi" ? "Đi kèm bài tập tự luyện và ví dụ thực tiễn chi tiết." : "Includes practice exercises and detailed real-world examples."}</span>
                          </li>
                          <li className="flex items-start gap-1.5 leading-snug">
                            <span className="text-purple-500 select-none shrink-0">✦</span>
                            <span>{language === "vi" ? "Phù hợp chuẩn bị ôn thi cuối học kỳ hoặc tiểu luận học thuật." : "Suitable for final exam prep or academic essays."}</span>
                          </li>
                        </ul>
                      </div>
                    </div>
                  </div>

                  {/* Standard downloads & views summary */}
                  <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 dark:text-slate-500 px-2 shrink-0 select-none">
                    <span className="flex items-center gap-1">
                      👁 {language === "vi" ? "Lượt xem:" : "Views:"} <span className="text-slate-750 dark:text-slate-300 font-extrabold">{viewCount}</span>
                    </span>
                    <span className="flex items-center gap-1">
                      <Download className="w-3 h-3 text-slate-455" /> {language === "vi" ? "Lượt tải:" : "Downloads:"} <span className="text-slate-750 dark:text-slate-300 font-extrabold">{downloadCount}</span>
                    </span>
                  </div>
                </div>

                {/* Actions Drawer (Bottom) */}
                <div className="border-t border-slate-100 dark:border-slate-800/80 pt-4 mt-4 flex flex-col gap-2 shrink-0">
                  {/* Primary actions */}
                  <div className="flex gap-2">
                    <button
                      onClick={handlePreviewClick}
                      className="
                        flex-1 py-2.5 rounded-lg bg-purple-600 hover:bg-purple-700
                        text-white font-extrabold text-xs transition-all duration-200
                        flex items-center justify-center gap-1.5 cursor-pointer shadow-sm active:scale-[0.98]
                      "
                    >
                      <BookOpen className="w-4 h-4" />
                      {t("preview.preview") || (language === "vi" ? "Xem trước" : "Preview")}
                    </button>

                    <button
                      onClick={handleDownload}
                      className="
                        flex-1 py-2.5 rounded-lg bg-purple-600 hover:bg-purple-750
                        text-white font-extrabold text-xs transition-all duration-200
                        flex items-center justify-center gap-1.5 cursor-pointer shadow-sm active:scale-[0.98]
                      "
                    >
                      <Download className="w-4 h-4" />
                      {t("myDocs.download") || "Tải xuống"}
                    </button>
                  </div>

                  {/* Secondary utility actions */}
                  <div className="grid grid-cols-2 gap-2 select-none mt-2">
                    {/* Heart bookmark toggle */}
                    <button
                      onClick={handleBookmarkToggle}
                      className={`
                        py-2 rounded-lg border text-[10px] font-extrabold flex items-center justify-center gap-1.5 transition-all duration-300 cursor-pointer active:scale-[0.97]
                        ${bookmarked
                          ? "bg-red-500/10 border-red-500/30 text-red-600 dark:text-red-400"
                          : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-850"
                        }
                      `}
                    >
                      <Heart className={`w-3.5 h-3.5 ${bookmarked ? "fill-current" : ""}`} />
                      {bookmarked ? (language === "vi" ? "Đã yêu thích" : "Favorited") : (t("myDocs.bookmark") || "Yêu thích")}
                    </button>

                    {/* Copy link button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        const docId = doc.document_id || doc.id;
                        const previewUrl = docId ? `${window.location.origin}/preview/${docId}` : (doc.file_url || "https://aistudyhub.com");
                        navigator.clipboard.writeText(previewUrl);
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
                          {language === "vi" ? "Đã sao chép!" : "Copied!"}
                        </>
                      ) : (
                        <>
                          <Share2 className="w-3.5 h-3.5" />
                          {language === "vi" ? "Sao chép liên kết" : "Copy Link"}
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
      {/* Document Preview Modal */}
      {previewDoc && (
        <DocumentPreviewModal
          doc={previewDoc}
          onClose={() => setPreviewDoc(null)}
        />
      )}
    </>
  );
}