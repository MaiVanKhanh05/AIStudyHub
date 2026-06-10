import { useState, useRef, useEffect, useCallback } from "react";
import { Search, X, Clock, Trash2, ChevronDown, ChevronUp } from "lucide-react";

// ── Constants ─────────────────────────────────────────────────────────────────
const API_BASE   = "http://localhost:5000";
const STORE_KEY  = "aistudyhub_search_history";
const MAX_STORED = 50;          // max entries kept in localStorage
const PREVIEW    = 10;          // items shown before "View All"

// ── LocalStorage helpers ──────────────────────────────────────────────────────
function readLocal() {
  try { return JSON.parse(localStorage.getItem(STORE_KEY) || "[]"); }
  catch { return []; }
}

function writeLocal(list) {
  localStorage.setItem(STORE_KEY, JSON.stringify(list.slice(0, MAX_STORED)));
}

// ── SearchBar component ───────────────────────────────────────────────────────
/**
 * Props
 *   search      string    controlled value (applied keyword for parent filtering)
 *   setSearch   fn        update parent search state on every keystroke
 *   onSearch    fn        called with committed keyword on Enter / icon click / history click
 *   userId      string?   when provided, history also syncs with backend
 *   placeholder string?
 *   className   string?
 */
export default function SearchBar({
  search,
  setSearch,
  onSearch,
  userId      = null,
  placeholder = "Tìm kiếm tài liệu, môn học, tác giả...",
  className   = "max-w-2xl mx-auto",
}) {
  const [inputValue,   setInputValue]   = useState(search || "");
  const [history,      setHistory]      = useState([]);
  const [open,         setOpen]         = useState(false);
  const [expanded,     setExpanded]     = useState(false);

  const wrapper = useRef(null);
  const inputEl = useRef(null);

  // Sync input when parent clears search
  useEffect(() => { if (!search) setInputValue(""); }, [search]);

  // ── Auth token ──────────────────────────────────────────────────────────────
  const getToken = () =>
    localStorage.getItem("token") || sessionStorage.getItem("token") || "";

  // ── Load & merge history ────────────────────────────────────────────────────
  const loadHistory = useCallback(async () => {
    let items = readLocal();

    // If logged in, merge with backend (remote takes precedence)
    if (userId && getToken()) {
      try {
        const res = await fetch(
          `${API_BASE}/api/search-history?userId=${encodeURIComponent(userId)}&limit=0`,
          { headers: { Authorization: `Bearer ${getToken()}` } }
        );
        if (res.ok) {
          const remote = await res.json();
          const remoteKeywords = new Set(remote.map((r) => r.keyword));

          const remoteItems = remote.map((r) => ({
            id:  r.history_id,
            keyword: r.keyword,
            at:  r.searched_at,
            src: "remote",
          }));

          const localOnly = items
            .filter((l) => !remoteKeywords.has(l.keyword))
            .map((l, i) => ({
              id:  l.id || `local-${i}`,
              keyword: l.keyword,
              at:  l.at || l.searched_at || new Date(0).toISOString(),
              src: "local",
            }));

          items = [...remoteItems, ...localOnly].sort(
            (a, b) => new Date(b.at) - new Date(a.at)
          );
        }
      } catch { /* network error – fall through to local */ }
    } else {
      items = items.map((l, i) => ({
        id:  l.id || `local-${i}`,
        keyword: l.keyword,
        at:  l.at || l.searched_at || new Date(0).toISOString(),
        src: "local",
      }));
    }

    // Deduplicate by keyword
    const seen = new Set();
    items = items.filter(({ keyword }) => {
      if (seen.has(keyword)) return false;
      seen.add(keyword);
      return true;
    });

    setHistory(items);
  }, [userId]);

  useEffect(() => { loadHistory(); }, [loadHistory]);

  // Close dropdown on outside click
  useEffect(() => {
    const onDown = (e) => {
      if (wrapper.current && !wrapper.current.contains(e.target)) {
        setOpen(false);
        setExpanded(false);
      }
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  // ── Save keyword ────────────────────────────────────────────────────────────
  const saveKeyword = async (keyword) => {
    const kw = keyword.trim();
    if (!kw) return;

    // LocalStorage: upsert (remove old entry, prepend new)
    const prev = readLocal().filter((h) => h.keyword !== kw);
    writeLocal([{ id: `local-${Date.now()}`, keyword: kw, at: new Date().toISOString() }, ...prev]);

    // Backend sync
    if (userId && getToken()) {
      try {
        await fetch(`${API_BASE}/api/search-history`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${getToken()}`,
          },
          body: JSON.stringify({ userId, keyword: kw }),
        });
      } catch { /* ignore */ }
    }

    await loadHistory();
  };

  // ── Delete one item ─────────────────────────────────────────────────────────
  const deleteOne = async (item, e) => {
    e.stopPropagation();

    writeLocal(readLocal().filter((h) => h.keyword !== item.keyword));

    if (item.src === "remote" && userId && getToken()) {
      try {
        await fetch(`${API_BASE}/api/search-history/${item.id}`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${getToken()}` },
        });
      } catch { /* ignore */ }
    }

    setHistory((prev) => prev.filter((h) => h.keyword !== item.keyword));
  };

  // ── Clear all ───────────────────────────────────────────────────────────────
  const clearAll = async (e) => {
    e.stopPropagation();
    writeLocal([]);

    if (userId && getToken()) {
      try {
        await fetch(
          `${API_BASE}/api/search-history?userId=${encodeURIComponent(userId)}`,
          { method: "DELETE", headers: { Authorization: `Bearer ${getToken()}` } }
        );
      } catch { /* ignore */ }
    }

    setHistory([]);
    setExpanded(false);
  };

  // ── Commit search ───────────────────────────────────────────────────────────
  const commit = async (keyword) => {
    const kw = keyword.trim();
    if (!kw) return;
    await saveKeyword(kw);
    setInputValue(kw);
    setSearch(kw);
    if (onSearch) onSearch(kw);
    setOpen(false);
    setExpanded(false);
  };

  // ── Input handlers ──────────────────────────────────────────────────────────
  const onChange = (e) => {
    const val = e.target.value;
    setInputValue(val);
    setSearch(val);           // live parent filter – does NOT cause layout shift
  };

  const onKeyDown = (e) => {
    if (e.key === "Enter")  commit(inputValue);
    if (e.key === "Escape") { setOpen(false); setExpanded(false); }
  };

  const onClear = () => {
    setInputValue("");
    setSearch("");
    inputEl.current?.focus();
  };

  // ── Derived ─────────────────────────────────────────────────────────────────
  const visible   = expanded ? history : history.slice(0, PREVIEW);
  const isOpen    = open && history.length > 0;
  const hasHistory = history.length > 0;

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    // position:relative → dropdown is absolute → zero layout shift
    <div ref={wrapper} className={`relative w-full ${className} select-none`}>

      {/* ── Input shell ──────────────────────────────────────────────────── */}
      <div className={[
        "relative p-1 rounded-xl backdrop-blur-xl border transition-all duration-300",
        "bg-white/40 dark:bg-[#0f111a]/45",
        isOpen
          ? "border-purple-500/40 shadow-[0_8px_30px_rgba(168,85,247,0.08)] rounded-b-none border-b-0"
          : "border-slate-200/30 dark:border-white/5 shadow-sm focus-within:border-purple-500/35 focus-within:shadow-[0_8px_30px_rgba(168,85,247,0.05)]",
      ].join(" ")}>

        {/* Search icon */}
        <Search
          onClick={() => commit(inputValue)}
          className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500 hover:text-purple-600 dark:hover:text-purple-400 transition-colors duration-200 cursor-pointer z-10"
        />

        {/* Text input */}
        <input
          ref={inputEl}
          type="text"
          value={inputValue}
          onChange={onChange}
          onKeyDown={onKeyDown}
          onFocus={() => { if (hasHistory) setOpen(true); }}
          placeholder={placeholder}
          className="w-full rounded-lg bg-white/80 dark:bg-[#0c0d13]/80 border-none pl-11 pr-11 py-2.5 text-xs placeholder:text-slate-400 dark:placeholder:text-slate-600 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-purple-500/40 transition-all duration-300"
        />

        {/* Clear button */}
        {inputValue && (
          <button
            type="button"
            onClick={onClear}
            className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 flex items-center justify-center rounded-md bg-slate-100 hover:bg-red-50 text-slate-400 hover:text-red-500 dark:bg-slate-800 dark:hover:bg-red-950/30 dark:hover:text-red-400 transition-all duration-200 active:scale-95 z-10"
          >
            <X className="w-3 h-3" />
          </button>
        )}
      </div>

      {/* ── Dropdown (absolute – never pushes content down) ───────────────── */}
      {isOpen && (
        <div className="absolute left-0 right-0 top-full z-50 overflow-hidden rounded-b-xl border border-t-0 border-purple-500/20 dark:border-purple-500/15 bg-white/98 dark:bg-[#0f111a]/98 backdrop-blur-xl shadow-2xl shadow-black/10 animate-in fade-in duration-150">

          {/* Header row */}
          <div className="flex items-center justify-between px-4 pt-3 pb-2 border-b border-slate-100 dark:border-slate-800/60">
            <div className="flex items-center gap-1.5">
              <Clock className="w-3 h-3 text-slate-400" />
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                Lịch sử tìm kiếm
              </span>
              <span className="text-[9px] font-bold bg-purple-50 dark:bg-purple-950/40 text-purple-500 dark:text-purple-400 px-1.5 py-0.5 rounded-full border border-purple-500/10">
                {history.length}
              </span>
            </div>

            <button
              type="button"
              onClick={clearAll}
              className="flex items-center gap-1 text-[10px] font-bold text-slate-400 hover:text-red-500 transition-colors duration-150 cursor-pointer"
            >
              <Trash2 className="w-3 h-3" />
              Xóa tất cả
            </button>
          </div>

          {/* History list */}
          <ul className="py-1 max-h-64 overflow-y-auto">
            {visible.map((item, idx) => (
              <li key={`${item.keyword}-${idx}`}>
                <button
                  type="button"
                  onClick={() => commit(item.keyword)}
                  className="w-full flex items-center justify-between gap-3 px-4 py-2.5 text-left hover:bg-purple-50/70 dark:hover:bg-purple-950/15 group transition-colors duration-100 cursor-pointer"
                >
                  <span className="flex items-center gap-2.5 min-w-0">
                    <Clock className="w-3 h-3 text-slate-300 dark:text-slate-600 shrink-0" />
                    <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 truncate group-hover:text-purple-700 dark:group-hover:text-purple-300 transition-colors">
                      {item.keyword}
                    </span>
                  </span>
                  <span
                    role="button"
                    onClick={(e) => deleteOne(item, e)}
                    className="w-5 h-5 shrink-0 flex items-center justify-center rounded-md text-slate-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 opacity-0 group-hover:opacity-100 transition-all duration-150 cursor-pointer"
                  >
                    <X className="w-3 h-3" />
                  </span>
                </button>
              </li>
            ))}
          </ul>

          {/* View All / Collapse — always visible */}
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="w-full flex items-center justify-center gap-1.5 py-2.5 text-[10px] font-black text-purple-600 dark:text-purple-400 hover:bg-purple-50/50 dark:hover:bg-purple-950/10 border-t border-slate-100 dark:border-slate-800/60 transition-colors duration-150 cursor-pointer"
          >
            {expanded
              ? <><ChevronUp className="w-3 h-3" /> Thu gọn</>
              : <><ChevronDown className="w-3 h-3" /> Xem tất cả ({history.length} mục)</>
            }
          </button>
        </div>
      )}
    </div>
  );
}