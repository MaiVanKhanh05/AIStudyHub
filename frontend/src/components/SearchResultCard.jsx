import { FileText, FileSpreadsheet, Presentation, FileImage, FileCode, File, User, Calendar, Eye, Download, Hash } from "lucide-react";

// ── Helpers ──────────────────────────────────────────────────────────────────

function getFileBadge(fileType = "") {
  const type = fileType.toLowerCase();
  if (type === "pdf")  return { label: "PDF",  bg: "bg-red-500" };
  if (["doc", "docx"].includes(type)) return { label: "DOCX", bg: "bg-blue-500" };
  if (["xls", "xlsx"].includes(type)) return { label: "XLSX", bg: "bg-emerald-600" };
  if (["ppt", "pptx"].includes(type)) return { label: "PPTX", bg: "bg-orange-500" };
  if (["jpg", "jpeg", "png", "webp", "image"].includes(type)) return { label: "IMG", bg: "bg-indigo-500" };
  if (["txt", "md"].includes(type)) return { label: "TXT", bg: "bg-slate-500" };
  return { label: type.toUpperCase() || "FILE", bg: "bg-slate-500" };
}

function formatDate(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "";
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
}

/**
 * Highlight matched keywords in a text snippet.
 * Returns an array of JSX elements.
 */
function HighlightSnippet({ text = "", keywords = [] }) {
  if (!text || !keywords.length) {
    return <span className="text-slate-500 dark:text-slate-400 text-xs leading-relaxed">{text}</span>;
  }

  // Escape special regex chars
  const escaped = keywords.map((k) => k.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).filter(Boolean);
  if (!escaped.length) {
    return <span className="text-slate-500 dark:text-slate-400 text-xs leading-relaxed">{text}</span>;
  }

  const pattern = new RegExp(`(${escaped.join("|")})`, "gi");
  const parts = text.split(pattern);

  return (
    <span className="text-slate-500 dark:text-slate-400 text-xs leading-relaxed">
      {parts.map((part, i) =>
        pattern.test(part) ? (
          <mark
            key={i}
            className="bg-amber-200/80 dark:bg-amber-500/30 text-amber-900 dark:text-amber-200 rounded px-0.5 font-semibold not-italic"
          >
            {part}
          </mark>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </span>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

/**
 * SearchResultCard
 * Props:
 *   doc          object   document from /api/documents/search
 *   keywords     string[] words to highlight
 *   onClick      fn       open preview
 *   animDelay    number   stagger animation delay in ms
 */
export default function SearchResultCard({ doc, keywords = [], onClick, animDelay = 0 }) {
  if (!doc) return null;

  const { label, bg } = getFileBadge(doc.file_type);
  const tags = Array.isArray(doc.tags) ? doc.tags : [];
  const subject = doc.subject_name || doc.subject_code || "";
  const isLecturer = (doc.uploader_role || "").toUpperCase() === "LECTURE" || (doc.uploader_role || "").toUpperCase() === "LECTURER";

  // Compute snippet: trim to ~200 chars around first keyword occurrence
  let snippet = doc.snippet || doc.description || "";
  if (snippet && keywords.length) {
    const kwLower = keywords[0].toLowerCase();
    const pos = snippet.toLowerCase().indexOf(kwLower);
    if (pos > 60) {
      snippet = "…" + snippet.slice(Math.max(0, pos - 40), pos + 200);
    } else {
      snippet = snippet.slice(0, 240);
    }
  } else {
    snippet = snippet.slice(0, 240);
  }
  if (snippet && snippet.length === 240) snippet += "…";

  return (
    <div
      onClick={() => onClick?.(doc)}
      style={{ animationDelay: `${animDelay}ms` }}
      className="animate-spring-up group relative flex gap-4 p-4 bg-white dark:bg-[#0f111a]/80 rounded-2xl border border-slate-200/80 dark:border-white/5 hover:border-violet-300/60 dark:hover:border-violet-500/30 shadow-sm hover:shadow-md transition-all duration-300 cursor-pointer select-none"
    >
      {/* File type badge */}
      <div className={`shrink-0 w-11 h-11 rounded-xl ${bg} flex items-center justify-center text-white font-black text-[10px] uppercase tracking-wider shadow-sm`}>
        {label}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        {/* Title row */}
        <div className="flex items-start justify-between gap-2 mb-1">
          <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 leading-snug group-hover:text-violet-700 dark:group-hover:text-violet-400 transition-colors line-clamp-1">
            <HighlightSnippet text={doc.title} keywords={keywords} />
          </h3>
          {isLecturer && (
            <span className="shrink-0 text-[9px] font-black px-1.5 py-0.5 rounded-full bg-indigo-100 text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-400 border border-indigo-200/40 dark:border-indigo-500/20 uppercase tracking-wide">
              GV
            </span>
          )}
        </div>

        {/* Subject & Meta */}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mb-2">
          {subject && (
            <span className="text-[10px] font-semibold text-violet-600 dark:text-violet-400">
              {subject}
            </span>
          )}
          {doc.author && (
            <span className="flex items-center gap-1 text-[10px] text-slate-400 dark:text-slate-500">
              <User className="w-2.5 h-2.5" />
              {doc.author}
            </span>
          )}
          {doc.upload_date && (
            <span className="flex items-center gap-1 text-[10px] text-slate-400 dark:text-slate-500">
              <Calendar className="w-2.5 h-2.5" />
              {formatDate(doc.upload_date)}
            </span>
          )}
          {(doc.views > 0) && (
            <span className="flex items-center gap-1 text-[10px] text-slate-400 dark:text-slate-500">
              <Eye className="w-2.5 h-2.5" />
              {doc.views}
            </span>
          )}
          {(doc.downloads > 0) && (
            <span className="flex items-center gap-1 text-[10px] text-slate-400 dark:text-slate-500">
              <Download className="w-2.5 h-2.5" />
              {doc.downloads}
            </span>
          )}
        </div>

        {/* Snippet with keyword highlight */}
        {snippet && (
          <div className="mb-2 px-2.5 py-2 bg-slate-50 dark:bg-white/[0.03] rounded-lg border border-slate-100 dark:border-white/5">
            <HighlightSnippet text={snippet} keywords={keywords} />
          </div>
        )}

        {/* Tags */}
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {tags.slice(0, 6).map((tag) => (
              <span
                key={tag.tag_id || tag.tag_name}
                className="inline-flex items-center gap-0.5 text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-violet-50 dark:bg-violet-950/30 text-violet-600 dark:text-violet-400 border border-violet-200/50 dark:border-violet-500/20"
              >
                <Hash className="w-2 h-2" />
                {tag.tag_name}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
