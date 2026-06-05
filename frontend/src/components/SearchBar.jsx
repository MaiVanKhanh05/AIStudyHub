import { useState, useRef, useEffect, useCallback } from "react";
import { Search, X, Clock, Trash2, ChevronRight } from "lucide-react";

const API_BASE = "http://localhost:5000";
const LOCAL_KEY = "aistudyhub_search_history_local";
const MAX_LOCAL = 50;

function getLocalHistory() {
  try {
    return JSON.parse(localStorage.getItem(LOCAL_KEY) || "[]");
  } catch {
    return [];
  }
}
function saveLocalHistory(list) {
  localStorage.setItem(LOCAL_KEY, JSON.stringify(list));
}

/**
 * SearchBar — controlled input + floating history dropdown.
 *
 * Props:
 *   search      {string}    displayed/applied search value (controlled by parent)
 *   setSearch   {Function}  update parent search state (live filtering)
 *   onSearch    {Function}  called on Enter / icon-click / history item click
 *   userId      {string}    optional — syncs history to backend when provided
 *   placeholder {string}
 *   className   {string}
 */
export default function SearchBar({
  search,
  setSearch,
  onSearch,
  userId = null,
  placeholder = "Tìm kiếm tài liệu, môn học, tác giả...",
  className = "max-w-2xl mx-auto",
}) {
  // inputValue: what is typed in the box (independent of applied search)
  const [inputValue, setInputValue] = useState(search || "");
  const [history, setHistory] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const wrapperRef = useRef(null);
  const inputRef = useRef(null);

  // Keep inputValue in sync when parent resets search (e.g. clear)
  useEffect(() => {
    if (!search) setInputValue("");
  }, [search]);

  // ── Token helper ─────────────────────────────────────────────────────────
  const token = () =>
    localStorage.getItem("token") || sessionStorage.getItem("token");

  // ── Load history (local + backend if userId) ─────────────────────────────
  const loadHistory = useCallback(async () => {
    // Always start from localStorage
    let merged = getLocalHistory();

    if (userId && token()) {
      try {
        const res = await fetch(
          `${API_BASE}/api/search-history?userId=${userId}&limit=0`,
          { headers: { Authorization: `Bearer ${token()}` } }
        );
        if (res.ok) {
          const remote = await res.json();
          const remoteKeywords = remote.map((r) => r.keyword);
          const remoteItems = remote.map((r) => ({
            search_id: r.search_id,
            keyword: r.keyword,
            searched_at: r.searched_at,
            source: "remote",
          }));
          const localOnly = merged
            .filter((l) => !remoteKeywords.includes(l.keyword))
            .map((l) => ({ ...l, source: "local" }));
          merged = [...remoteItems, ...localOnly].sort(
            (a, b) => new Date(b.searched_at || 0) - new Date(a.searched_at || 0)
          );
        }
      } catch (_) {}
    } else {
      merged = merged.map((l, i) => ({
        search_id: l.search_id || `local-${i}`,
        keyword: l.keyword,
        searched_at: l.searched_at,
        source: "local",
      }));
    }

    // ── Final deduplication by keyword (safety net) ──────────────────────────
    const seen = new Set();
    merged = merged.filter((item) => {
      if (seen.has(item.keyword)) return false;
      seen.add(item.keyword);
      return true;
    });

    setHistory(merged);
  }, [userId]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setShowDropdown(false);
        setShowAll(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // ── Save keyword to local + backend ──────────────────────────────────────
  const saveKeyword = async (keyword) => {
    if (!keyword.trim()) return;
    const kw = keyword.trim();

    // Save to localStorage
    const existing = getLocalHistory().filter((h) => h.keyword !== kw);
    const updated = [
      { search_id: `local-${Date.now()}`, keyword: kw, searched_at: new Date().toISOString() },
      ...existing,
    ].slice(0, MAX_LOCAL);
    saveLocalHistory(updated);

    // Save to backend if logged in
    if (userId && token()) {
      try {
        await fetch(`${API_BASE}/api/search-history`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token()}`,
          },
          body: JSON.stringify({ userId, keyword: kw }),
        });
      } catch (_) {}
    }

    await loadHistory();
  };

  // ── Delete single item ────────────────────────────────────────────────────
  const deleteItem = async (item, e) => {
    e.stopPropagation();

    // Remove from localStorage
    const updated = getLocalHistory().filter((h) => h.keyword !== item.keyword);
    saveLocalHistory(updated);

    // Remove from backend if remote
    if (item.source === "remote" && userId && token()) {
      try {
        await fetch(`${API_BASE}/api/search-history/${item.search_id}`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token()}` },
        });
      } catch (_) {}
    }
    setHistory((prev) => prev.filter((h) => h.keyword !== item.keyword));
  };

  // ── Clear all ─────────────────────────────────────────────────────────────
  const clearAll = async (e) => {
    e.stopPropagation();
    saveLocalHistory([]);
    if (userId && token()) {
      try {
        await fetch(`${API_BASE}/api/search-history?userId=${userId}`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token()}` },
        });
      } catch (_) {}
    }
    setHistory([]);
  };

  // ── Commit search (Enter / icon click / history click) ────────────────────
  const commitSearch = async (keyword) => {
    if (!keyword.trim()) return;
    await saveKeyword(keyword.trim());
    setInputValue(keyword.trim());
    setSearch(keyword.trim());      // update parent for filtering
    if (onSearch) onSearch(keyword.trim());
    setShowDropdown(false);
    setShowAll(false);
  };

  // ── Input handlers ────────────────────────────────────────────────────────
  const handleChange = (e) => {
    const val = e.target.value;
    setInputValue(val);
    // Live filtering via setSearch (parent), does NOT trigger layout shift
    // because SearchBar itself is position:relative + dropdown is absolute
    setSearch(val);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      commitSearch(inputValue);
    }
    if (e.key === "Escape") {
      setShowDropdown(false);
      setShowAll(false);
    }
  };

  const handleClear = () => {
    setInputValue("");
    setSearch("");
    inputRef.current?.focus();
  };

  // ── Visible items ─────────────────────────────────────────────────────────  // Show top 10 by default; "View All" is always available when not yet expanded
  const visibleItems = showAll ? history : history.slice(0, 10);
  const hasMore = !showAll && history.length > 0;
  const isOpen = showDropdown && history.length > 0;

  return (
    <div
      ref={wrapperRef}
      className={`relative w-full ${className} select-none`}
    >
      {/* ── Input shell ─────────────────────────────────────────────────── */}
      <div
        className={`relative p-1 rounded-xl bg-white/40 dark:bg-[#0f111a]/45 backdrop-blur-xl border transition-all duration-300
          ${isOpen
            ? "border-purple-500/40 shadow-[0_8px_30px_rgba(168,85,247,0.08)] rounded-b-none border-b-0"
            : "border-slate-200/30 dark:border-white/5 shadow-sm focus-within:border-purple-500/35 focus-within:shadow-[0_8px_30px_rgba(168,85,247,0.05)]"
          }`}
      >
        {/* Search icon (click to commit) */}
        <Search
          onClick={() => commitSearch(inputValue)}
          className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500 hover:text-purple-600 dark:hover:text-purple-400 transition-colors duration-300 cursor-pointer z-10"
        />

        {/* Input */}
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            if (history.length > 0) setShowDropdown(true);
          }}
          placeholder={placeholder}
          className="w-full rounded-lg bg-white/80 dark:bg-[#0c0d13]/80 border-none pl-11 pr-11 py-2.5 text-xs placeholder:text-slate-400 dark:placeholder:text-slate-600 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-purple-500/40 transition-all duration-300"
        />

        {/* Clear button */}
        {inputValue && (
          <button
            onClick={handleClear}
            type="button"
            className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 flex items-center justify-center rounded-md bg-slate-100 hover:bg-red-50 text-slate-400 hover:text-red-500 dark:bg-slate-800 dark:hover:bg-red-950/30 dark:hover:text-red-400 transition-all duration-200 active:scale-95 z-10"
          >
            <X className="w-3 h-3" />
          </button>
        )}
      </div>

      {/* ── Dropdown (absolute — never shifts page layout) ─────────────────── */}
      {isOpen && (
        <div
          className="absolute left-0 right-0 top-full z-50
            bg-white/98 dark:bg-[#0f111a]/98 backdrop-blur-xl
            border border-purple-500/20 dark:border-purple-500/15 border-t-0
            rounded-b-xl shadow-2xl shadow-black/10
            overflow-hidden
            animate-in fade-in duration-150"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 pt-3 pb-2 border-b border-slate-100 dark:border-slate-800/60">
            <div className="flex items-center gap-1.5">
              <Clock className="w-3 h-3 text-slate-400" />
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                Lịch sử tìm kiếm
              </span>
              <span className="text-[9px] font-bold bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 px-1.5 py-0.5 rounded-full border border-purple-500/10">
                {history.length}
              </span>
            </div>
            <button
              onClick={clearAll}
              className="flex items-center gap-1 text-[10px] font-bold text-slate-400 hover:text-red-500 transition-colors duration-150 cursor-pointer"
            >
              <Trash2 className="w-3 h-3" />
              Xóa tất cả
            </button>
          </div>

          {/* Items list */}
          <ul className="py-1 max-h-64 overflow-y-auto">
            {visibleItems.map((item, idx) => (
              <li key={`${item.keyword}-${idx}`}>
                <button
                  type="button"
                  onClick={() => commitSearch(item.keyword)}
                  className="w-full flex items-center justify-between gap-3 px-4 py-2.5 text-left hover:bg-purple-50/70 dark:hover:bg-purple-950/15 group transition-colors duration-100 cursor-pointer"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Clock className="w-3 h-3 text-slate-300 dark:text-slate-600 shrink-0" />
                    <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 truncate group-hover:text-purple-700 dark:group-hover:text-purple-300 transition-colors">
                      {item.keyword}
                    </span>
                  </div>
                  <span
                    role="button"
                    onClick={(e) => deleteItem(item, e)}
                    className="w-5 h-5 shrink-0 flex items-center justify-center rounded-md opacity-0 group-hover:opacity-100 hover:bg-red-50 dark:hover:bg-red-950/30 text-slate-300 hover:text-red-500 transition-all duration-150 cursor-pointer"
                  >
                    <X className="w-3 h-3" />
                  </span>
                </button>
              </li>
            ))}
          </ul>

          {/* View all / Collapse toggle — always visible */}
          <button
            type="button"
            onClick={() => setShowAll((v) => !v)}
            className="w-full flex items-center justify-center gap-1.5 py-2.5 text-[10px] font-black text-purple-600 dark:text-purple-400 hover:bg-purple-50/50 dark:hover:bg-purple-950/10 border-t border-slate-100 dark:border-slate-800/60 transition-colors duration-150 cursor-pointer"
          >
            {showAll ? (
              <>Thu gọn<ChevronRight className="w-3 h-3 rotate-90" /></>
            ) : (
              <>Xem tất cả ({history.length} mục)<ChevronRight className="w-3 h-3" /></>
            )}
          </button>
        </div>
      )}
    </div>
  );
}