import { useMemo } from "react";
import { Tag, Hash } from "lucide-react";

/**
 * TagCloudView
 * Props:
 *   tags         [{ tag_id, tag_name, doc_count }]   required
 *   selectedTags [string]                             selected tag names
 *   onTagSelect  (tagName: string) => void
 *   compact      boolean – smaller pills, no counts
 *   className    string
 */
export default function TagCloudView({
  tags = [],
  selectedTags = [],
  onTagSelect,
  compact = false,
  className = "",
}) {
  const maxCount = useMemo(() => Math.max(...tags.map((t) => t.doc_count || 1), 1), [tags]);

  if (!tags.length) return null;

  // Scale font between 11px and 18px based on count
  const getSize = (count) => {
    const ratio = (count || 1) / maxCount;
    return compact ? 11 : Math.round(11 + ratio * 7);
  };

  // Pastel color palette cycling based on tag_id
  const palette = [
    "bg-violet-100 text-violet-700 border-violet-200 hover:bg-violet-200 dark:bg-violet-950/40 dark:text-violet-300 dark:border-violet-700/30",
    "bg-indigo-100 text-indigo-700 border-indigo-200 hover:bg-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-700/30",
    "bg-sky-100 text-sky-700 border-sky-200 hover:bg-sky-200 dark:bg-sky-950/40 dark:text-sky-300 dark:border-sky-700/30",
    "bg-emerald-100 text-emerald-700 border-emerald-200 hover:bg-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-700/30",
    "bg-amber-100 text-amber-700 border-amber-200 hover:bg-amberald-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-700/30",
    "bg-rose-100 text-rose-700 border-rose-200 hover:bg-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-700/30",
    "bg-teal-100 text-teal-700 border-teal-200 hover:bg-teal-200 dark:bg-teal-950/40 dark:text-teal-300 dark:border-teal-700/30",
    "bg-fuchsia-100 text-fuchsia-700 border-fuchsia-200 hover:bg-fuchsia-200 dark:bg-fuchsia-950/40 dark:text-fuchsia-300 dark:border-fuchsia-700/30",
  ];

  const selectedBase =
    "bg-violet-600 text-white border-violet-700 hover:bg-violet-700 dark:bg-violet-500 dark:border-violet-600 dark:hover:bg-violet-400";

  return (
    <div className={`flex flex-wrap gap-2 ${className}`}>
      {tags.map((tag, i) => {
        const isSelected = selectedTags.includes(tag.tag_name);
        const colorClass = isSelected ? selectedBase : palette[i % palette.length];
        const fontSize = getSize(tag.doc_count);

        return (
          <button
            key={tag.tag_id || tag.tag_name}
            type="button"
            onClick={() => onTagSelect?.(tag.tag_name)}
            title={`${tag.tag_name}${tag.doc_count ? ` • ${tag.doc_count} tài liệu` : ""}`}
            style={{ fontSize: `${fontSize}px` }}
            className={[
              "inline-flex items-center gap-1 px-2.5 py-1 rounded-full border font-semibold",
              "transition-all duration-200 cursor-pointer select-none",
              "active:scale-95",
              isSelected ? "shadow-sm shadow-violet-300/30" : "",
              colorClass,
            ].join(" ")}
          >
            <Hash className="w-3 h-3 shrink-0 opacity-70" />
            <span className="truncate max-w-[120px]">{tag.tag_name}</span>
            {!compact && tag.doc_count && (
              <span className={`text-[9px] font-black opacity-60 ml-0.5 ${isSelected ? "opacity-80" : ""}`}>
                {tag.doc_count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
