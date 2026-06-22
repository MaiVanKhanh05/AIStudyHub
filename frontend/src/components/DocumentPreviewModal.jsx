import { Copy, Download, ExternalLink, X, Send, Sparkles, Share2 } from "lucide-react";
import { useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { toast } from "sonner";
import QuizCard from "./QuizCard";
import FlashcardSetCard from "./FlashcardSetCard";

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
  const [isDocLoading, setIsDocLoading] = useState(!doc?.content);
  const [messages, setMessages] = useState([
    {
      id: 1,
      sender: "ai",
      text: `Xin chào! Tôi là Trợ lý AI. Tôi có thể giúp bạn giải đáp, tóm tắt hoặc phân tích nội dung của tài liệu "${doc?.document_name || doc?.file_name || doc?.title || 'này'}" này. Bạn có câu hỏi nào không?`
    }
  ]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);

  const handleSendMessage = async (e) => {
    if (e) e.preventDefault();
    const text = input.trim();
    if (!text || isTyping) return;

    const userMsg = {
      id: Date.now(),
      sender: "user",
      text: text
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsTyping(true);

    try {
      const token = localStorage.getItem("token") || sessionStorage.getItem("token");
      const response = await fetch("http://localhost:5000/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          message: `Tôi đang xem tài liệu "${doc?.document_name || doc?.file_name || doc?.title || 'chưa rõ'}". Hãy trả lời câu hỏi sau đây liên quan đến tài liệu này: ${text}`,
          documentContext: doc?.extracted_content || doc?.content || doc?.simulated_content || "",
          documentId: doc?.document_id || doc?.id || null
        })
      });

      if (!response.ok) {
        throw new Error("API call failed");
      }

      const data = await response.json();
      const aiText = data.response || "Xin lỗi, tôi không nhận được phản hồi từ hệ thống AI.";

      setMessages((prev) => [
        ...prev,
        {
          id: Date.now() + 1,
          sender: "ai",
          text: aiText
        }
      ]);
    } catch (err) {
      console.error(err);
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now() + 1,
          sender: "ai",
          text: "Đã xảy ra lỗi khi kết nối tới Trợ lý AI. Vui lòng kiểm tra lại kết nối mạng."
        }
      ]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleSummarize = async () => {
    if (isTyping) return;

    const userMsg = {
      id: Date.now(),
      sender: "user",
      text: "Tóm tắt tài liệu này giúp tôi."
    };
    setMessages((prev) => [...prev, userMsg]);
    setIsTyping(true);

    try {
      const token = localStorage.getItem("token") || sessionStorage.getItem("token");
      const response = await fetch("http://localhost:5000/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          message: `Tôi đang xem tài liệu "${doc?.document_name || doc?.file_name || doc?.title || 'chưa rõ'}". Hãy viết một bản tóm tắt học thuật thật chi tiết, rõ ràng và đầy đủ về nội dung của tài liệu này.`,
          documentContext: doc?.extracted_content || doc?.content || doc?.simulated_content || "",
          documentId: doc?.document_id || doc?.id || null
        })
      });

      if (!response.ok) {
        throw new Error("API call failed");
      }

      const data = await response.json();
      const aiText = data.response || "Không thể tạo bản tóm tắt.";

      setMessages((prev) => [
        ...prev,
        {
          id: Date.now() + 1,
          sender: "ai",
          text: aiText
        }
      ]);
    } catch (err) {
      console.error(err);
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now() + 1,
          sender: "ai",
          text: "Đã xảy ra lỗi khi kết nối tới Trợ lý AI để tóm tắt tài liệu."
        }
      ]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleGenerateQuiz = async () => {
    if (isTyping) return;

    const userMsg = {
      id: Date.now(),
      sender: "user",
      text: "Tạo câu hỏi trắc nghiệm ôn tập (Quiz) từ tài liệu này."
    };
    setMessages((prev) => [...prev, userMsg]);
    setIsTyping(true);

    try {
      const token = localStorage.getItem("token") || sessionStorage.getItem("token");
      const response = await fetch("http://localhost:5000/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          message: "Tạo 20 câu hỏi trắc nghiệm ôn tập (Quiz) từ tài liệu này",
          documentContext: doc?.extracted_content || doc?.content || doc?.simulated_content || "",
          documentId: doc?.document_id || doc?.id || null
        })
      });

      if (!response.ok) {
        throw new Error("API call failed");
      }

      const data = await response.json();
      const aiText = data.response || "Không thể tạo bộ câu hỏi.";

      setMessages((prev) => [
        ...prev,
        {
          id: Date.now() + 1,
          sender: "ai",
          text: aiText
        }
      ]);
    } catch (err) {
      console.error(err);
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now() + 1,
          sender: "ai",
          text: "Đã xảy ra lỗi khi kết nối tới Trợ lý AI để tạo quiz ôn tập."
        }
      ]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleGenerateFlashcards = async () => {
    if (isTyping) return;

    const userMsg = {
      id: Date.now(),
      sender: "user",
      text: "Tạo bộ thẻ ghi nhớ Flashcard ôn tập từ tài liệu này."
    };
    setMessages((prev) => [...prev, userMsg]);
    setIsTyping(true);

    try {
      const token = localStorage.getItem("token") || sessionStorage.getItem("token");
      const response = await fetch("http://localhost:5000/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          message: "Tạo bộ thẻ ghi nhớ Flashcard ôn tập từ tài liệu này",
          documentContext: doc?.extracted_content || doc?.content || doc?.simulated_content || "",
          documentId: doc?.document_id || doc?.id || null
        })
      });

      if (!response.ok) {
        throw new Error("API call failed");
      }

      const data = await response.json();
      const aiText = data.response || "Không thể tạo bộ thẻ ghi nhớ.";

      setMessages((prev) => [
        ...prev,
        {
          id: Date.now() + 1,
          sender: "ai",
          text: aiText
        }
      ]);
    } catch (err) {
      console.error(err);
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now() + 1,
          sender: "ai",
          text: "Đã xảy ra lỗi khi kết nối tới Trợ lý AI để tạo bộ thẻ ghi nhớ."
        }
      ]);
    } finally {
      setIsTyping(false);
    }
  };

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

  const handleDownload = async () => {
    if (!fileUrl) {
      toast.error("Không tìm thấy đường dẫn tải xuống!");
      return;
    }

    try {
      const response = await fetch(fileUrl);
      if (!response.ok) throw new Error("Network response was not ok");
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);

      const element = document.createElement("a");
      element.href = blobUrl;
      const urlExt = fileUrl.split('.').pop().split('?')[0] || "pdf";
      const cleanTitle = title.endsWith("." + urlExt) ? title : `${title}.${urlExt}`;
      element.download = cleanTitle;
      element.style.display = "none";
      document.body.appendChild(element);
      element.click();
      document.body.removeChild(element);
      URL.revokeObjectURL(blobUrl);
    } catch (error) {
      console.error("Direct download failed, falling back to new tab:", error);
      window.open(fileUrl, "_blank");
    }
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

        <div className="flex-1 overflow-hidden bg-slate-100 dark:bg-slate-900 flex flex-col md:flex-row">
          {/* Document Viewer (Left Column) */}
          <div className={`flex-1 h-full overflow-hidden relative ${!doc?.hideChat ? "border-r border-slate-200 dark:border-slate-800" : ""}`}>
            {isDocLoading && fileUrl && ["pdf", "image", "office"].includes(previewType) && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#f8f9fa] dark:bg-slate-900 z-10 animate-in fade-in duration-200">
                <div className="relative w-14 h-14 flex items-center justify-center">
                  <div className="absolute inset-0 rounded-full border-4 border-purple-500/20 dark:border-purple-500/10 animate-pulse" />
                  <div className="absolute inset-0 rounded-full border-4 border-t-purple-600 animate-spin" />
                </div>
                <h3 className="mt-4 text-xs font-bold text-slate-800 dark:text-slate-200">Đang tải tài liệu...</h3>
                <p className="mt-1 text-[9px] text-purple-600 dark:text-purple-400 font-extrabold tracking-wider uppercase">AIStudyHub Scholar Reader</p>
                <div className="mt-5 w-40 h-1 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden relative">
                  <div className="absolute top-0 bottom-0 left-0 w-1/2 bg-purple-600 rounded-full loading-bar-active" />
                </div>
              </div>
            )}
            {doc?.content ? (
              <div className="h-full overflow-auto p-6 bg-white dark:bg-slate-900 text-slate-850 dark:text-slate-100 font-mono text-xs whitespace-pre-wrap select-text text-left animate-in fade-in duration-150">
                {doc.content}
              </div>
            ) : !fileUrl ? (
              <PreviewMessage message="Khong tim thay URL file de xem truoc." />
            ) : previewType === "pdf" ? (
              <iframe
                src={`${fileUrl}#toolbar=1&navpanes=0`}
                className="w-full h-full border-none bg-white"
                title={title}
                onLoad={() => setIsDocLoading(false)}
              />
            ) : previewType === "image" ? (
              <div className="h-full overflow-auto flex items-center justify-center p-4">
                <img
                  src={fileUrl}
                  alt={title}
                  className="max-w-full max-h-full object-contain rounded-lg shadow-sm bg-white"
                  onLoad={() => setIsDocLoading(false)}
                />
              </div>
            ) : previewType === "office" ? (
              <iframe
                src={officeViewerUrl}
                className="w-full h-full border-none bg-white"
                title={title}
                onLoad={() => setIsDocLoading(false)}
              />
            ) : (
              <PreviewMessage
                message="Định dạng này chưa hỗ trợ xem trực tiếp."
                fileUrl={fileUrl}
              />
            )}
          </div>

          {/* AI Chat Box (Right Column) */}
          {!doc?.hideChat && (
            <div className="w-full md:w-[350px] h-full flex flex-col bg-slate-50/50 dark:bg-[#0a0b12]/50 border-l border-slate-200/50 dark:border-slate-850/60 shrink-0 animate-in slide-in-from-right duration-200">
              {/* AI Chat Header */}
              <div className="p-4 bg-gradient-to-r from-purple-50/80 to-indigo-50/80 dark:from-[#131422]/90 dark:to-[#0c0d18]/90 border-b border-slate-200/40 dark:border-slate-800/60 flex items-center justify-between select-none">
                <div className="flex items-center gap-2">
                  <div className="w-6.5 h-6.5 rounded-lg bg-purple-600 dark:bg-purple-500 flex items-center justify-center shadow-sm shrink-0">
                    <Sparkles className="w-3.5 h-3.5 text-white animate-pulse" />
                  </div>
                  <div className="flex flex-col text-left">
                    <span className="text-[10px] font-black text-slate-850 dark:text-slate-200 uppercase tracking-widest leading-none">Trợ lý học giả AI</span>
                    <span className="text-[8px] text-purple-600 dark:text-purple-400 font-extrabold uppercase tracking-wider mt-0.5">Scholar Assistant</span>
                  </div>
                </div>
              </div>

              {/* Messages Area */}
              <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4.5 custom-scrollbar min-h-0 bg-slate-50/20 dark:bg-[#08090f]/20">
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex flex-col max-w-[85%] rounded-2xl p-3.5 text-[11px] leading-relaxed border transition-all duration-300 shadow-sm text-left ${msg.sender === "ai"
                      ? "bg-white dark:bg-[#131520] border-slate-200/50 dark:border-slate-800/80 border-l-2 border-l-purple-500 text-slate-800 dark:text-slate-200 self-start rounded-tl-none"
                      : "bg-gradient-to-br from-purple-600/10 to-indigo-600/10 dark:from-purple-500/15 dark:to-indigo-500/15 border-purple-500/25 dark:border-purple-400/25 text-purple-950 dark:text-purple-200 self-end rounded-tr-none"
                      }`}
                  >
                    <span className="text-[8px] font-extrabold uppercase tracking-widest opacity-60 mb-1.5 block">
                      {msg.sender === "ai" ? "🤖 AI ACADEMIC CORE" : "👤 BẠN"}
                    </span>
                    {msg.sender === "ai" && typeof msg.text === "string" && msg.text.trim().startsWith("{") ? (
                      (() => {
                        try {
                          const parsed = JSON.parse(msg.text.trim());
                          if (parsed.event === "quiz_created" && parsed.quizId) {
                            return <QuizCard quizId={parsed.quizId} />;
                          }
                          if (parsed.event === "flashcard_created" && parsed.setId) {
                            return <FlashcardSetCard setId={parsed.setId} />;
                          }
                        } catch (e) {
                          // Not valid JSON, fall back
                        }
                        return <p className="font-bold whitespace-pre-line leading-relaxed">{msg.text}</p>;
                      })()
                    ) : (
                      <p className="font-bold whitespace-pre-line leading-relaxed">{msg.text}</p>
                    )}
                  </div>
                ))}
                {isTyping && (
                  <div className="bg-white dark:bg-[#131520] border border-slate-250/50 dark:border-slate-800/80 rounded-2xl rounded-tl-none p-4 self-start shadow-sm flex items-center gap-1.5 animate-pulse w-[70%]">
                    <span className="w-1.5 h-1.5 rounded-full bg-purple-500 animate-bounce" />
                    <span className="w-1.5 h-1.5 rounded-full bg-purple-500 animate-bounce delay-75" />
                    <span className="w-1.5 h-1.5 rounded-full bg-purple-500 animate-bounce delay-150" />
                  </div>
                )}
              </div>
              {/* Quick Action Chips */}
              <div className="flex items-center gap-2 px-4 pb-2.5 pt-2 border-t border-slate-200/40 dark:border-slate-850/40 bg-white/80 dark:bg-[#090a10]/80 backdrop-blur-md select-none">
                <button
                  type="button"
                  onClick={handleSummarize}
                  disabled={isTyping}
                  className="flex-1 py-1.5 px-2 rounded-lg border border-purple-500/20 dark:border-purple-450/20 bg-purple-500/5 hover:bg-purple-500/10 text-purple-750 dark:text-purple-300 font-extrabold text-[9px] uppercase tracking-wider transition-all duration-150 cursor-pointer flex items-center justify-center gap-1 active:scale-[0.98] disabled:opacity-50 hover:scale-[1.01]"
                >
                  Tóm tắt
                </button>
                <button
                  type="button"
                  onClick={handleGenerateQuiz}
                  disabled={isTyping}
                  className="flex-1 py-1.5 px-2 rounded-lg border border-blue-500/20 dark:border-blue-450/20 bg-blue-500/5 hover:bg-blue-500/10 text-blue-750 dark:text-blue-300 font-extrabold text-[9px] uppercase tracking-wider transition-all duration-150 cursor-pointer flex items-center justify-center gap-1 active:scale-[0.98] disabled:opacity-50 hover:scale-[1.01]"
                >
                  Quiz
                </button>
                <button
                  type="button"
                  onClick={handleGenerateFlashcards}
                  disabled={isTyping}
                  className="flex-1 py-1.5 px-2 rounded-lg border border-emerald-500/20 dark:border-emerald-450/20 bg-emerald-500/5 hover:bg-emerald-500/10 text-emerald-750 dark:text-emerald-300 font-extrabold text-[9px] uppercase tracking-wider transition-all duration-150 cursor-pointer flex items-center justify-center gap-1 active:scale-[0.98] disabled:opacity-50 hover:scale-[1.01]"
                >
                  Flashcard
                </button>
              </div>

              {/* Input Area */}
              <form onSubmit={handleSendMessage} className="p-4 border-t border-slate-200/40 dark:border-slate-850/50 bg-white/80 dark:bg-[#090a10]/80 backdrop-blur-md flex gap-2">
                <div className="flex-grow relative flex items-center">
                  <input
                    type="text"
                    placeholder="Hỏi về tài liệu này..."
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    disabled={isTyping}
                    className="w-full bg-slate-50 dark:bg-[#131522] border border-slate-200 dark:border-slate-800 rounded-xl pl-4 pr-10 py-2.5 text-xs outline-none focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/10 text-slate-850 dark:text-slate-200 transition-all placeholder:text-slate-400"
                  />
                  <button
                    type="submit"
                    disabled={isTyping || !input.trim()}
                    className="absolute right-1.5 bg-purple-600 hover:bg-purple-750 text-white p-1.5 rounded-lg cursor-pointer transition-all disabled:opacity-50 shrink-0 w-7 h-7 flex items-center justify-center hover:scale-105 active:scale-95 shadow-sm"
                  >
                    <Send className="w-3.5 h-3.5" />
                  </button>
                </div>
              </form>
            </div>
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
          {!fileUrl?.startsWith("blob:") && (
            <button
              onClick={handleCopyUrl}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-200 dark:bg-slate-700 text-slate-900 dark:text-white hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors font-medium text-sm"
            >
              <Copy className="w-4 h-4" />
              {copied ? "Đã sao chép!" : "Sao chép URL"}
            </button>
          )}
          <button
            onClick={handleDownload}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-750 text-white transition-colors font-medium text-sm"
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
        <style>{`
          @keyframes loadingBar {
            0% { transform: translateX(-100%); }
            50% { transform: translateX(0); }
            100% { transform: translateX(100%); }
          }
          .loading-bar-active {
            animation: loadingBar 1.5s infinite ease-in-out;
          }
        `}</style>
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
