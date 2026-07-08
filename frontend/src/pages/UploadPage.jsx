import { useState, useRef, useEffect, useCallback } from "react";
import { API_URL } from "@/config/api.js";
import {
  Upload, X, CheckCircle, AlertCircle, Loader, Globe, Lock,
  Search, Tag, BookOpen, ChevronDown, Plus, Hash, FolderPlus,
  FileText, FileSpreadsheet, Image, File
} from "lucide-react";
import { uploadFileToSupabase } from "@/lib/supabase";
import { toast } from "sonner";

const API_BASE = "${API_URL}";

// ── Helpers ───────────────────────────────────────────────────────────────────
function getToken() {
  return localStorage.getItem("token") || sessionStorage.getItem("token") || "";
}

function getFileIcon(fileName) {
  const ext = (fileName || "").split(".").pop().toLowerCase();
  if (["jpg", "jpeg", "png", "webp"].includes(ext)) return { emoji: "🖼️", color: "bg-indigo-100 text-indigo-600" };
  if (ext === "pdf")  return { emoji: "📄", color: "bg-red-100 text-red-600" };
  if (["doc", "docx"].includes(ext)) return { emoji: "📝", color: "bg-blue-100 text-blue-600" };
  if (["xls", "xlsx"].includes(ext)) return { emoji: "📊", color: "bg-emerald-100 text-emerald-600" };
  if (ext === "txt")  return { emoji: "📃", color: "bg-slate-100 text-slate-600" };
  return { emoji: "📦", color: "bg-violet-100 text-violet-600" };
}

function formatFileSize(bytes) {
  if (!bytes) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
}

function useDebounce(value, delay) {
  const [d, setD] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setD(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return d;
}

// ── Subject Autocomplete ──────────────────────────────────────────────────────
export default function UploadPage() {
  // File state
  const [files,       setFiles]       = useState([]);
  const [uploading,   setUploading]   = useState(false);
  const [dragActive,  setDragActive]  = useState(false);
  const fileInputRef  = useRef(null);
  const isUploadingRef = useRef(false);

  // Form state
  const [documentTitle, setDocumentTitle] = useState("");
  const [subjectCode,   setSubjectCode]   = useState("");
  const [subjectName,   setSubjectName]   = useState("");
  const [description,   setDescription]  = useState("");
  const [tags,          setTags]         = useState([]);
  const [visibility,    setVisibility]   = useState("PRIVATE");

  // User info
  const userStr  = localStorage.getItem("user") || sessionStorage.getItem("user");
  const user     = userStr ? JSON.parse(userStr) : null;
  const userRole = user?.role || "STUDENT";

  // Storage
  const [currentStorageUsage, setCurrentStorageUsage] = useState(0);
  const storageLimit = user?.max_storage_bytes || 2147483648;

  // Auto-detect subject lists and topics
  const [allSubjects, setAllSubjects] = useState([]);
  const [topics, setTopics] = useState([]);
  const [selectedTopicId, setSelectedTopicId] = useState("");
  
  const selectedTopic = topics.find(t => t.topic_id.toString() === selectedTopicId.toString());
  const topicSubjects = selectedTopic ? selectedTopic.subjects : null;

  useEffect(() => {
    if (!getToken()) return;
    fetch(`${API_BASE}/api/documents/dashboard`, { headers: { Authorization: `Bearer ${getToken()}` } })
      .then(r => r.ok ? r.json() : null)
      .then(d => d && setCurrentStorageUsage(d.storageUsage || 0))
      .catch(() => {});
      
    // Fetch all subjects for client-side auto-detection
    fetch(`${API_BASE}/api/subjects`, { headers: { Authorization: `Bearer ${getToken()}` } })
      .then(r => r.ok ? r.json() : [])
      .then(data => setAllSubjects(Array.isArray(data) ? data : []))
      .catch(() => {});
      
    // Fetch topics
    fetch(`${API_BASE}/api/topics`, { headers: { Authorization: `Bearer ${getToken()}` } })
      .then(r => r.ok ? r.json() : [])
      .then(data => setTopics(Array.isArray(data) ? data : []))
      .catch(() => {});
  }, []);

  // ── Auto-detect subject from document title ──────────────────────────────────
  const debouncedTitle = useDebounce(documentTitle, 500);
  useEffect(() => {
    if (!debouncedTitle || !allSubjects.length || subjectCode) return;

    const titleLower = debouncedTitle.toLowerCase();
    
    // 1. Check for exact code match (e.g. SWP391, SWP 391, SWP-391)
    const codeMatch = debouncedTitle.match(/(?:^|[^A-Za-z0-9])([A-Za-z]{2,4})[\s_\-]?(\d{2,4})(?:[^A-Za-z0-9]|$)/);
    if (codeMatch) {
      const code = (codeMatch[1] + codeMatch[2]).toUpperCase();
      const found = allSubjects.find(s => s.subject_code === code);
      if (found) {
        setSubjectCode(found.subject_code);
        setSubjectName(found.subject_name);
        return;
      }
    }

    // 2. Check if title contains subject name
    const foundByName = allSubjects.find(s => {
      if (!s.subject_name || s.subject_name.length < 4) return false; 
      return titleLower.includes(s.subject_name.toLowerCase());
    });
    
    if (foundByName) {
      setSubjectCode(foundByName.subject_code);
      setSubjectName(foundByName.subject_name);
    }
  }, [debouncedTitle, allSubjects, subjectCode]);

  // Validation
  const MAX_FILE_SIZE = 50 * 1024 * 1024;
  const ALLOWED_TYPES = [
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "text/plain",
    "image/jpeg", "image/png", "image/webp",
  ];

  const validateFile = (file) => {
    if (file.size > MAX_FILE_SIZE) { toast.error(`"${file.name}" vượt quá giới hạn 50MB`); return false; }
    if (!ALLOWED_TYPES.includes(file.type)) { toast.error(`Định dạng "${file.name}" không được hỗ trợ`); return false; }
    return true;
  };

  const addFiles = (newFiles) => {
    const valid = newFiles.filter(validateFile);
    if (valid.length > 0) {
      setFiles(prev => [
        ...prev,
        ...valid.map(f => ({ file: f, id: Math.random().toString(36).substring(7), status: "pending", error: null }))
      ]);
      
      // Auto-fill title from first file if empty
      setDocumentTitle(prev => {
        if (prev) return prev;
        const nameWithoutExt = valid[0].name.replace(/\.[^/.]+$/, "");
        return nameWithoutExt;
      });
    }
  };

  const handleDrag = (e) => {
    e.preventDefault(); e.stopPropagation();
    setDragActive(e.type === "dragenter" || e.type === "dragover");
  };

  const handleDrop = (e) => {
    e.preventDefault(); e.stopPropagation();
    setDragActive(false);
    addFiles(Array.from(e.dataTransfer.files));
  };

  const removeFile = (id) => setFiles(prev => prev.filter(f => f.id !== id));

  // Upload handler
  const handleUpload = async () => {
    if (isUploadingRef.current) return;
    if (!files.length)            { toast.error("Vui lòng chọn file để tải lên"); return; }
    if (!documentTitle.trim())    { toast.error("Vui lòng nhập tiêu đề tài liệu"); return; }

    const pending = files.filter(f => f.status === "pending");
    if (!pending.length) return;

    const totalBytes = pending.reduce((a, f) => a + f.file.size, 0);
    if (currentStorageUsage + totalBytes > storageLimit) {
      toast.error("Dung lượng lưu trữ đã đầy. Không thể tải lên.");
      return;
    }

    isUploadingRef.current = true;
    setUploading(true);

    await Promise.all(pending.map(async (fileItem) => {
      try {
        setFiles(prev => prev.map(f => f.id === fileItem.id ? { ...f, status: "uploading" } : f));

        const userId = user?.user_id || "";
        const result = await uploadFileToSupabase(fileItem.file, "AIStudyHub", userId);

        if (result.success) {
          const res = await fetch(`${API_BASE}/api/documents/upload`, {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` },
            body: JSON.stringify({
              title:       documentTitle,
              subject:     subjectCode || subjectName,
              description,
              tags,
              file_url:    result.fileUrl,
              file_name:   fileItem.file.name,
              file_type:   fileItem.file.type,
              file_size:   result.size,
              visibility:  userRole === "LECTURER" ? visibility : "PRIVATE",
            }),
          });
          if (!res.ok) {
            const err = await res.json();
            throw new Error(err.error || "Lỗi lưu metadata");
          }
          setFiles(prev => prev.map(f => f.id === fileItem.id ? { ...f, status: "completed" } : f));
          toast.success(`"${fileItem.file.name}" đã tải lên thành công!`);
        } else {
          throw new Error(result.error);
        }
      } catch (err) {
        setFiles(prev => prev.map(f => f.id === fileItem.id ? { ...f, status: "error", error: err.message } : f));
        toast.error(`Lỗi: "${fileItem.file.name}" — ${err.message}`);
      }
    }));

    setUploading(false);
    isUploadingRef.current = false;

    if (files.every(f => f.status === "completed" || f.status === "error")) {
      if (!files.some(f => f.status === "error")) {
        setDocumentTitle(""); setSubjectCode(""); setSubjectName("");
        setDescription(""); setTags([]);
        setTimeout(() => setFiles([]), 800);
      }
    }
  };

  const storagePercent = Math.min(100, (currentStorageUsage / storageLimit) * 100);
  const storageColor   = storagePercent > 90 ? "bg-red-500" : storagePercent > 70 ? "bg-amber-500" : "bg-violet-500";

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-violet-50/20 to-slate-100 dark:from-[#080a0f] dark:via-[#0a0c14] dark:to-[#080a0f] py-10 px-4">
      <div className="max-w-2xl mx-auto space-y-5">

        {/* ── Header ────────────────────────────────────────────────────── */}
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-violet-100 dark:bg-violet-950/40 border border-violet-200/60 dark:border-violet-500/20 text-violet-600 dark:text-violet-400 text-[10px] font-black uppercase tracking-widest mb-2">
            <Upload className="w-3 h-3" />
            Tải lên tài liệu
          </div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white">
            Chia sẻ tài liệu học tập
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Phân loại tài liệu theo danh mục để dễ tìm kiếm sau này
          </p>
        </div>

        {/* ── Storage Bar ───────────────────────────────────────────────── */}
        <div className="bg-white/80 dark:bg-[#0f111a]/80 rounded-2xl border border-slate-200/60 dark:border-white/5 px-4 py-3">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Dung lượng đã dùng</span>
            <span className="text-[10px] font-bold text-slate-500">
              {formatFileSize(currentStorageUsage)} / {formatFileSize(storageLimit)}
            </span>
          </div>
          <div className="w-full h-1.5 bg-slate-100 dark:bg-white/5 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${storageColor}`}
              style={{ width: `${storagePercent}%` }}
            />
          </div>
        </div>

        {/* ── Main Card ─────────────────────────────────────────────────── */}
        <div className="bg-white/90 dark:bg-[#0f111a]/90 backdrop-blur-xl rounded-2xl border border-slate-200/80 dark:border-white/5 shadow-sm overflow-visible">

          {/* Drag Drop Zone */}
          <div
            className={[
              "m-4 rounded-xl border-2 border-dashed transition-all duration-300 p-8 text-center cursor-pointer",
              dragActive
                ? "border-violet-500 bg-violet-50/60 dark:bg-violet-950/20 scale-[1.01]"
                : "border-slate-200 dark:border-white/10 hover:border-violet-300/60 dark:hover:border-violet-500/30 hover:bg-violet-50/30 dark:hover:bg-violet-950/10",
            ].join(" ")}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              multiple
              onChange={e => addFiles(Array.from(e.target.files))}
              className="hidden"
              accept=".pdf,.doc,.docx,.xls,.xlsx,.txt,.jpg,.jpeg,.png,.webp"
            />
            <div className="flex flex-col items-center gap-3">
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all ${dragActive ? "bg-violet-200 dark:bg-violet-800/60" : "bg-violet-100 dark:bg-violet-950/40"}`}>
                <Upload className={`w-7 h-7 ${dragActive ? "text-violet-700" : "text-violet-500"}`} />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-700 dark:text-slate-200">
                  {dragActive ? "Thả file vào đây!" : "Kéo thả hoặc click để chọn file"}
                </p>
                <p className="text-xs text-slate-400 mt-1">PDF, DOCX, XLSX, TXT, ảnh • Tối đa 50MB/file</p>
              </div>
              <div className="flex items-center gap-2 flex-wrap justify-center">
                {["PDF", "DOCX", "XLSX", "TXT", "IMG"].map(fmt => (
                  <span key={fmt} className="text-[9px] font-black px-1.5 py-0.5 rounded bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-slate-400">
                    {fmt}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* ── Form ────────────────────────────────────────────────────── */}
          <div className="px-5 pb-5 space-y-5">

            {/* Document Title */}
            <div>
              <label className="block text-xs font-black text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                Tiêu đề tài liệu <span className="text-red-500 normal-case font-bold">*</span>
              </label>
              <input
                type="text"
                value={documentTitle}
                onChange={e => setDocumentTitle(e.target.value)}
                placeholder="VD: Giáo trình Kinh tế vi mô chương 1-5..."
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200/80 dark:border-white/10 bg-white/80 dark:bg-[#0c0d13]/80 text-sm text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-500/60 transition-all"
              />
            </div>

            {/* Topic Selection */}
            <div>
              <label className="block text-xs font-black text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                Chủ đề (Topic)
              </label>
              <select
                value={selectedTopicId}
                onChange={e => {
                  setSelectedTopicId(e.target.value);
                  setSubjectCode("");
                  setSubjectName("");
                }}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200/80 dark:border-white/10 bg-white/80 dark:bg-[#0c0d13]/80 text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-500/60 transition-all appearance-none cursor-pointer"
              >
                <option value="">-- Vui lòng chọn Chủ đề --</option>
                {topics.map(t => (
                  <option key={t.topic_id} value={t.topic_id}>{t.name}</option>
                ))}
              </select>
            </div>

            {/* Subject / Folder */}
            <div>
              <label className="block text-xs font-black text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                  Danh mục / Môn học
                </label>
                <select
                  value={subjectCode}
                  onChange={e => {
                    const code = e.target.value;
                    let name = "";
                    if (code && topicSubjects) {
                      const subj = topicSubjects.find(s => s.subject_code === code);
                      if (subj) name = subj.subject_name;
                    }
                    setSubjectCode(code);
                    setSubjectName(name);
                  }}
                  disabled={!selectedTopicId}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200/80 dark:border-white/10 bg-white/80 dark:bg-[#0c0d13]/80 text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-500/60 transition-all appearance-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <option value="">{selectedTopicId ? "-- Chọn Môn học --" : "-- Vui lòng chọn Chủ đề trước --"}</option>
                  {(topicSubjects || []).map(s => (
                    <option key={s.subject_code} value={s.subject_code}>{s.subject_code} - {s.subject_name}</option>
                  ))}
                </select>
                <p className="text-[10px] text-slate-400 mt-1.5 flex items-center gap-1">
                  <FolderPlus className="w-3 h-3" />
                  Tài liệu sẽ được nhóm vào môn học này
                </p>
              </div>

            {/* Tags */}
            <div>
              <label className="block text-xs font-black text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                Tags <span className="text-slate-400 font-normal normal-case">(tuỳ chọn — giúp tìm kiếm dễ hơn)</span>
              </label>
              <TagInput tags={tags} onChange={setTags} />
            </div>

            {/* Description */}
            <div>
              <label className="block text-xs font-black text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                Mô tả <span className="text-slate-400 font-normal normal-case">(tuỳ chọn)</span>
              </label>
              <textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                rows={3}
                placeholder="Tóm tắt nội dung tài liệu, chương/phần bao gồm, nguồn gốc..."
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200/80 dark:border-white/10 bg-white/80 dark:bg-[#0c0d13]/80 text-sm text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-500/60 transition-all resize-none"
              />
            </div>

            {/* Visibility (Lecturer only) */}
            {userRole === "LECTURER" && (
              <div>
                <label className="block text-xs font-black text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-2">
                  Phạm vi chia sẻ
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { val: "PRIVATE", label: "Cá nhân", sub: "Chỉ mình tôi", Icon: Lock,  color: "violet" },
                    { val: "PUBLIC",  label: "Cộng đồng", sub: "Toàn bộ sinh viên", Icon: Globe, color: "emerald" },
                  ].map(({ val, label, sub, Icon, color }) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setVisibility(val)}
                      className={[
                        "flex items-center gap-3 p-3.5 rounded-xl border text-left transition-all duration-200 cursor-pointer",
                        visibility === val
                          ? `border-${color}-500/60 bg-${color}-50/60 dark:bg-${color}-950/20 shadow-sm`
                          : "border-slate-200/60 dark:border-white/10 hover:border-violet-300/50",
                      ].join(" ")}
                    >
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${visibility === val ? `bg-${color}-200 dark:bg-${color}-800/50 text-${color}-700 dark:text-${color}-300` : "bg-slate-100 dark:bg-white/5 text-slate-400"}`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-700 dark:text-slate-200">{label}</p>
                        <p className="text-[10px] text-slate-400">{sub}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── File List ─────────────────────────────────────────────────── */}
        {files.length > 0 && (
          <div className="bg-white/90 dark:bg-[#0f111a]/90 backdrop-blur-xl rounded-2xl border border-slate-200/80 dark:border-white/5 shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-100 dark:border-white/5 flex items-center justify-between">
              <span className="text-xs font-black text-slate-600 dark:text-slate-300 uppercase tracking-wider">
                File đã chọn ({files.length})
              </span>
              {files.some(f => f.status === "pending") && (
                <button
                  type="button"
                  onClick={() => setFiles(prev => prev.filter(f => f.status !== "pending"))}
                  className="text-[10px] font-bold text-red-500 hover:text-red-600 cursor-pointer"
                >
                  Xoá tất cả
                </button>
              )}
            </div>
            <ul className="divide-y divide-slate-100 dark:divide-white/5 max-h-72 overflow-y-auto">
              {files.map(fileItem => {
                const { emoji, color } = getFileIcon(fileItem.file.name);
                return (
                  <li key={fileItem.id} className="flex items-center gap-3 px-4 py-3 group">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-base shrink-0 ${color}`}>
                      {emoji}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 truncate">{fileItem.file.name}</p>
                      <p className="text-[10px] text-slate-400">{formatFileSize(fileItem.file.size)}</p>
                      {fileItem.error && (
                        <p className="text-[10px] text-red-500 truncate mt-0.5">{fileItem.error}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <FileStatusBadge status={fileItem.status} />
                      {fileItem.status === "pending" && (
                        <button
                          type="button"
                          onClick={() => removeFile(fileItem.id)}
                          className="w-6 h-6 flex items-center justify-center rounded-lg text-slate-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 opacity-0 group-hover:opacity-100 transition-all cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        {/* ── Actions ───────────────────────────────────────────────────── */}
        <div className="flex gap-3">
          <button
            type="button"
            onClick={handleUpload}
            disabled={!files.length || uploading || !documentTitle.trim() || !selectedTopicId || !subjectCode}
            className="flex-1 flex items-center justify-center gap-2 h-11 rounded-xl bg-violet-600 hover:bg-violet-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-black transition-all duration-200 active:scale-[0.98] shadow-sm shadow-violet-300/20 cursor-pointer"
          >
            {uploading ? (
              <><Loader className="w-4 h-4 animate-spin" /> Đang tải lên...</>
            ) : (
              <><Upload className="w-4 h-4" /> Tải lên ({files.filter(f => f.status === "pending").length} file)</>
            )}
          </button>
          <button
            type="button"
            onClick={() => { setFiles([]); setDocumentTitle(""); setSubjectCode(""); setSubjectName(""); setDescription(""); setTags([]); }}
            disabled={uploading}
            className="px-5 h-11 rounded-xl bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-600 dark:text-slate-400 text-sm font-bold transition-all duration-200 cursor-pointer disabled:opacity-40"
          >
            Xoá hết
          </button>
        </div>

        {/* ── Tips ──────────────────────────────────────────────────────── */}
        <div className="p-4 bg-violet-50/60 dark:bg-violet-950/20 border border-violet-200/50 dark:border-violet-500/15 rounded-2xl">
          <p className="text-xs text-violet-700 dark:text-violet-300 font-semibold leading-relaxed">
            💡 <strong>Mẹo tổ chức tài liệu:</strong> Đặt đúng <strong>Danh mục</strong> giúp tài liệu được nhóm vào folder tương ứng khi xem trong thư viện. Thêm <strong>Tags</strong> như #kinh-tế, #bài-tập để tìm kiếm chéo giữa các môn học dễ hơn.
          </p>
        </div>

      </div>
    </div>
  );
}
