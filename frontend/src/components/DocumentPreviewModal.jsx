import { Copy, Download, ExternalLink, X, Share2 } from "lucide-react";
import { useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { toast } from "sonner";

const IMAGE_EXTENSIONS = ["jpg", "jpeg", "png", "gif", "webp", "bmp", "svg"];
const OFFICE_EXTENSIONS = ["doc", "docx", "xls", "xlsx", "ppt", "pptx"];

function getExtension(value = "") {
  if (!value) return "";

  try {
    const parsedUrl = new URL(value);
    const pathname = decodeURIComponent(parsedUrl.pathname);
    return pathname.split(".").pop()?.toLowerCase() || "";
  } catch {
    return value.split("?")[0].split("#")[0].split(".").pop()?.toLowerCase() || "";
  }
}

function getPreviewType(doc = {}, fileUrl = "") {
  const fileType = (doc.file_type || doc.type || "").toLowerCase();
  const fileName = doc.file_name || doc.document_name || doc.title || "";
  const extension = getExtension(fileUrl) || getExtension(fileName);

  if (fileType.includes("pdf") || extension === "pdf") return "pdf";
  if (fileType.startsWith("image/") || IMAGE_EXTENSIONS.includes(extension)) return "image";
  if (
    fileType.includes("word") ||
    fileType.includes("excel") ||
    fileType.includes("spreadsheet") ||
    fileType.includes("powerpoint") ||
    fileType.includes("presentation") ||
    OFFICE_EXTENSIONS.includes(extension)
  ) {
    return "office";
  }

  return "unsupported";
}

export default function DocumentPreviewModal({ doc, onClose, currentUserId, onShare }) {
  const [copied, setCopied] = useState(false);

  const fileUrl = doc?.file_url || doc?.url || doc?.document_url || doc?.public_url || "";
  const title = doc?.document_name || doc?.file_name || doc?.title || "Document Preview";
  const previewType = useMemo(() => getPreviewType(doc, fileUrl), [doc, fileUrl]);
  const officeViewerUrl = fileUrl
    ? `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(fileUrl)}`
    : "";

  if (!doc) return null;

  const handleCopyUrl = async () => {
    const docId = doc?.document_id || doc?.id;
    const previewUrl = docId ? `${window.location.origin}/preview/${docId}` : fileUrl;
    
    if (!previewUrl) {
      toast.error("Không tìm thấy URL");
      return;
    }

    await navigator.clipboard.writeText(previewUrl);
    setCopied(true);
    toast.success("Đã sao chép liên kết xem trước!");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    if (!fileUrl) {
      toast.error("Khong tim thay URL file");
      return;
    }

    const element = document.createElement("a");
    element.href = fileUrl;
    element.download = title;
    element.style.display = "none";
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  return createPortal(
    <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 md:p-6 animate-in fade-in duration-200" onClick={onClose}>
      <div
        className="bg-white dark:bg-slate-950 rounded-xl shadow-2xl max-w-6xl w-full h-[90vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 flex items-center justify-between p-5 bg-gradient-to-r from-purple-50 to-blue-50 dark:from-slate-900 dark:to-slate-800 border-b border-slate-200 dark:border-slate-700">
          <div className="flex-1 min-w-0">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white truncate">
              {title}
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1 uppercase">
              {previewType === "office" ? "Office Viewer" : previewType}
            </p>
          </div>
          <button
            onClick={onClose}
            className="ml-4 p-2 hover:bg-white/40 dark:hover:bg-slate-700 rounded-lg transition-colors"
            aria-label="Close preview"
          >
            <X className="w-5 h-5 text-slate-600 dark:text-slate-400" />
          </button>
        </div>

        <div className="flex-1 overflow-hidden bg-slate-100 dark:bg-slate-900">
          {!fileUrl ? (
            <PreviewMessage message="Khong tim thay URL file de xem truoc." />
          ) : previewType === "pdf" ? (
            <iframe
              src={`${fileUrl}#toolbar=1&navpanes=0`}
              className="w-full h-full border-none bg-white"
              title={title}
            />
          ) : previewType === "image" ? (
            <div className="h-full overflow-auto flex items-center justify-center p-4">
              <img
                src={fileUrl}
                alt={title}
                className="max-w-full max-h-full object-contain rounded-lg shadow-sm bg-white"
              />
            </div>
          ) : previewType === "office" ? (
            <iframe
              src={officeViewerUrl}
              className="w-full h-full border-none bg-white"
              title={title}
            />
          ) : (
            <PreviewMessage
              message="Định dạng này chưa hỗ trợ xem trực tiếp."
              fileUrl={fileUrl}
            />
          )}
        </div>

        <div className="sticky bottom-0 flex items-center justify-end gap-3 p-5 bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-700">
          {fileUrl && (
            <a
              href={fileUrl}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors font-medium text-sm"
            >
              <ExternalLink className="w-4 h-4" />
              Mở file
            </a>
          )}
          <button
            onClick={handleCopyUrl}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-200 dark:bg-slate-700 text-slate-900 dark:text-white hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors font-medium text-sm"
          >
            <Copy className="w-4 h-4" />
            {copied ? "Đã sao chép!" : "Sao chép URL"}
          </button>
          <button
            onClick={handleDownload}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-700 text-white transition-colors font-medium text-sm"
          >
            <Download className="w-4 h-4" />
            Tải xuống
          </button>
          {doc && (doc.user_id === currentUserId) && onShare && (
            <button
              onClick={onShare}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white transition-colors font-medium text-sm"
            >
              <Share2 className="w-4 h-4" />
              Chia sẻ
            </button>
          )}
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 text-slate-900 dark:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors font-medium text-sm"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

function PreviewMessage({ message, fileUrl }) {
  return (
    <div className="h-full flex items-center justify-center p-6 text-center">
      <div>
        <p className="text-slate-700 dark:text-slate-300 font-medium">{message}</p>
        {fileUrl && (
          <a
            href={fileUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 mt-4 text-sm font-semibold text-purple-600 dark:text-purple-400 hover:underline"
          >
            Mở file trong tab mới
            <ExternalLink className="w-4 h-4" />
          </a>
        )}
      </div>
    </div>
  );
}
