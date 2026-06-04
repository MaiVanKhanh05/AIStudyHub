import { useState, useEffect, useRef, useCallback } from "react";
import { Search, X, Clock, Trash2, ChevronRight } from "lucide-react";

const API_BASE = "http://localhost:5000";
const PREVIEW_LIMIT = 10;

export default function SearchBar({
  search,
  setSearch,
  onSearch,          // callback(keyword) khi user submit tìm kiếm
  userId = null,     // null nếu chưa đăng nhập → không lưu history
  placeholder = "Tìm kiếm tài liệu, môn học, tác giả...",
  className = "max-w-2xl mx-auto",
}) {
  const [history, setHistory] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const containerRef = useRef(null);
  const inputRef = useRef(null);

  // ── Fetch history từ server ──────────────────────────────────────────
  const fetchHistory = useCallback(async () => {
    if (!userId) return;
    try {
      setLoadingHistory(true);
      const res = await fetch(`${API_BASE}/api/search-history?userId=${userId}`);
      if (res.ok) {
        const data = await res.json();
        setHistory(data);
      }
    } catch (err) {
      console.error("Failed to fetch search history:", err);
    } finally {
      setLoadingHistory(false);
    }
  }, [userId]);

  // ── Lưu keyword vào DB ───────────────────────────────────────────────
  const saveKeyword = useCallback(async (keyword) => {
    if (!userId || !keyword.trim()) return;
    try {
      await fetch(`${API_BASE}/api/search-history`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, keyword: keyword.trim() }),
      });
      // Refresh local state
      fetchHistory();
    } catch (err) {
      console.error("Failed to save search keyword:", err);
    }
  }, [userId, fetchHistory]);

  // ── Xóa 1 mục ────────────────────────────────────────────────────────
  const deleteItem = useCallback(async (e, searchId) => {
    e.stopPropagation();
    if (!userId) return;
    try {
      await fetch(`${API_BASE}/api/search-history/${searchId}?userId=${userId}`, {
        method: "DELETE",
      });
      setHistory((prev) => prev.filter((h) => h.search_id !== searchId));
    } catch (err) {
      console.error("Failed to delete history item:", err);
    }
  }, [userId]);

  // ── Xóa toàn bộ ──────────────────────────────────────────────────────
  const clearAll = useCallback(async (e) => {
    e.stopPropagation();
    if (!userId) return;
    try {
      await fetch(`${API_BASE}/api/search-history?userId=${userId}`, {
        method: "DELETE",
      });
      setHistory([]);
      setShowAll(false);
    } catch (err) {
      console.error("Failed to clear search history:", err);
    }
  }, [userId]);

  // ── Submit tìm kiếm (Enter hoặc click icon) ──────────────────────────
  const handleSubmit = useCallback(() => {
    const keyword = search.trim();
    if (!keyword) return;
    saveKeyword(keyword);
    onSearch?.(keyword);
    setShowDropdown(false);
    inputRef.current?.blur();
  }, [search, saveKeyword, onSearch]);

  // ── Click item trong dropdown ─────────────────────────────────────────
  const handleSelectItem = useCallback((keyword) => {
    setSearch(keyword);
    setShowDropdown(false);
    saveKeyword(keyword);
    onSearch?.(keyword);
    inputRef.current?.blur();
  }, [setSearch, saveKeyword, onSearch]);

  // ── Keyboard handler ──────────────────────────────────────────────────
  const handleKeyDown = (e) => {
    if (e.key === "Enter") handleSubmit();
    if (e.key === "Escape") {
      setShowDropdown(false);
      inputRef.current?.blur();
    }
  };

  // ── Focus / blur ──────────────────────────────────────────────────────
  const handleFocus = () => {
    if (userId) {
      fetchHistory();
      setShowDropdown(true);
    }
  };

  // ── Click outside để đóng dropdown ───────────────────────────────────
  useEffect(() => {
    const handler = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setShowDropdown(false);
        setShowAll(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Danh sách hiển thị (preview hoặc toàn bộ)
  const displayedHistory = showAll ? history : history.slice(0, PREVIEW_LIMIT);
  const hasMore = !showAll && history.length > PREVIEW_LIMIT;

  // Chỉ hiển thị dropdown khi có lịch sử hoặc đang load
  const shouldShowDropdown = showDropdown && userId && (history.length > 0 || loadingHistory);

  return (
    <div ref={containerRef} className={`relative w-full group ${className} select-none`}>
      {/* ── Glassmorphic Outer Wrapper ── */}
      <div className="relative p-1 rounded-xl bg-white/40 dark:bg-[#0f111a]/45 backdrop-blur-xl border border-slate-200/30 dark:border-white/5 shadow-sm transition-all duration-300 focus-within:border-purple-500/35 focus-within:shadow-[0_8px_30px_rgba(168,85,247,0.05)]">

        {/* Left Search Icon */}
        <button
          type="button"
          onClick={handleSubmit}
          className="absolute left-4 top-1/2 -translate-y-1/2 z-10 text-slate-400 dark:text-slate-500 group-focus-within:text-purple-600 dark:group-focus-within:text-purple-400 transition-colors duration-300 hover:text-purple-600 dark:hover:text-purple-400"
        >
          <Search className="w-4 h-4" />
        </button>

        {/* Input */}
        <input
          ref={inputRef}
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onFocus={handleFocus}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="
            w-full rounded-lg
            bg-white/80 dark:bg-[#0c0d13]/80
            border-none
            pl-11 pr-11 py-2.5
            text-xs placeholder:text-slate-400 dark:placeholder:text-slate-600
            text-slate-800 dark:text-slate-100
            focus:outline-none
            focus:ring-1 focus:ring-purple-500/40
            transition-all duration-300
          "
        />

        {/* Clear Button */}
        {search && (
          <button
            onClick={() => setSearch("")}
            type="button"
            className="
              absolute right-4 top-1/2 -translate-y-1/2
              w-5 h-5 flex items-center justify-center
              rounded-md bg-slate-100 hover:bg-red-50 text-slate-400 hover:text-red-500
              dark:bg-slate-850 dark:hover:bg-red-950/30 dark:hover:text-red-400
              transition-all duration-200 active:scale-95
              z-10
            "
          >
            <X className="w-3 h-3" />
          </button>
        )}
      </div>

      {/* ── History Dropdown ── */}
      {shouldShowDropdown && (
        <div
          className="
            absolute top-full left-0 right-0 mt-2 z-50
            bg-white/90 dark:bg-[#0f111a]/95 backdrop-blur-xl
            border border-slate-200/40 dark:border-white/8
            rounded-xl shadow-[0_16px_48px_rgba(0,0,0,0.12)] dark:shadow-[0_16px_48px_rgba(0,0,0,0.5)]
            overflow-hidden
            animate-in fade-in-0 slide-in-from-top-2 duration-200
          "
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 pt-3 pb-2 border-b border-slate-100/60 dark:border-white/5">
            <span className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">
              <Clock className="w-3 h-3" />
              Lịch sử tìm kiếm
            </span>
            {history.length > 0 && (
              <button
                onMouseDown={clearAll}
                className="flex items-center gap-1 text-[10px] font-bold text-slate-400 hover:text-red-500 dark:hover:text-red-400 transition-colors duration-200"
              >
                <Trash2 className="w-3 h-3" />
                Xóa tất cả
              </button>
            )}
          </div>

          {/* Items */}
          <div className="py-1.5 max-h-[320px] overflow-y-auto custom-scrollbar">
            {loadingHistory ? (
              <div className="flex items-center gap-2 px-4 py-3">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="h-3 bg-slate-100 dark:bg-slate-800 rounded animate-pulse" style={{ width: `${60 + i * 20}px` }} />
                ))}
              </div>
            ) : displayedHistory.length === 0 ? (
              <p className="text-center text-[11px] text-slate-400 dark:text-slate-600 py-4 font-medium">
                Chưa có lịch sử tìm kiếm
              </p>
            ) : (
              displayedHistory.map((item) => (
                <div
                  key={item.search_id}
                  onMouseDown={() => handleSelectItem(item.keyword)}
                  className="
                    group/item flex items-center justify-between gap-2
                    px-4 py-2 cursor-pointer
                    hover:bg-purple-50/70 dark:hover:bg-purple-950/20
                    transition-colors duration-150
                  "
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Clock className="w-3 h-3 text-slate-300 dark:text-slate-600 shrink-0" />
                    <span className="text-xs text-slate-700 dark:text-slate-300 font-medium truncate group-hover/item:text-purple-700 dark:group-hover/item:text-purple-300 transition-colors duration-150">
                      {item.keyword}
                    </span>
                  </div>
                  <button
                    onMouseDown={(e) => deleteItem(e, item.search_id)}
                    className="
                      opacity-0 group-hover/item:opacity-100
                      w-4.5 h-4.5 shrink-0
                      flex items-center justify-center rounded
                      text-slate-300 hover:text-red-500 dark:text-slate-600 dark:hover:text-red-400
                      hover:bg-red-50 dark:hover:bg-red-950/30
                      transition-all duration-150
                    "
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))
            )}
          </div>

          {/* Footer: View All / View Less */}
          {(hasMore || showAll) && history.length > 0 && (
            <div className="border-t border-slate-100/60 dark:border-white/5 px-4 py-2">
              <button
                onMouseDown={(e) => { e.stopPropagation(); setShowAll(!showAll); }}
                className="
                  w-full flex items-center justify-center gap-1.5
                  text-[11px] font-bold text-purple-600 dark:text-purple-400
                  hover:text-purple-800 dark:hover:text-purple-200
                  transition-colors duration-200 py-0.5
                "
              >
                {showAll ? (
                  <>Thu gọn</>
                ) : (
                  <>
                    Xem tất cả ({history.length} lịch sử)
                    <ChevronRight className="w-3 h-3" />
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}