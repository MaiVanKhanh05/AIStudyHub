import { useState, useRef, useEffect, useCallback } from "react";
import { API_URL } from "@/config/api.js";
import {
  Search, X, Clock, Trash2, ChevronDown, ChevronUp,
  SlidersHorizontal, Tag, Calendar, FileText, User, Hash, Check
} from "lucide-react";
import { useLanguage } from "../context/LanguageContext";

// ── Constants ─────────────────────────────────────────────────────────────────
const API_BASE = API_URL;
const STORE_KEY  = "aistudyhub_search_history";
const MAX_STORED = 50;
const PREVIEW    = 10;

const FILE_TYPES = [
  { id: "pdf",  label: "PDF",  color: "bg-red-500" },
  { id: "docx", label: "DOCX", color: "bg-blue-500" },
  { id: "doc",  label: "DOC",  color: "bg-blue-500" },
  { id: "xlsx", label: "XLSX", color: "bg-emerald-600" },
  { id: "xls",  label: "XLS",  color: "bg-emerald-600" },
  { id: "pptx", label: "PPTX", color: "bg-orange-500" },
  { id: "ppt",  label: "PPT",  color: "bg-orange-500" },
];

// ── LocalStorage helpers ──────────────────────────────────────────────────────
function readLocal() {
  try { return JSON.parse(localStorage.getItem(STORE_KEY) || "[]"); }
  catch { return []; }
}
function writeLocal(list) {
  localStorage.setItem(STORE_KEY, JSON.stringify(list.slice(0, MAX_STORED)));
}

// ── Debounce hook ─────────────────────────────────────────────────────────────
function useDebounce(value, delay) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

// ── SearchBar component ───────────────────────────────────────────────────────
/**
 * Props
 *   search       string    controlled search keyword
 *   setSearch    fn        update parent state on keystroke
 *   onSearch     fn        called when user commits a search
 *   onFiltersChange fn     called with { fileTypes, tags, dateFrom, dateTo, author }
 *   userId       string?
 *   placeholder  string?
 *   className    string?
 */
export default function SearchBar({
  search,
  setSearch,
  onSearch,
  onFiltersChange,
  userId      = null,
  placeholder,
  resultCount = null,
  className   = "max-w-2xl mx-auto",
}) {
  const { t, language } = useLanguage();
  const actualPlaceholder = placeholder || t("searchBar.placeholder") || "Tìm kiếm tài liệu, môn học, tác giả...";

  // ── Core state ───────────────────────────────────────────────────────────
  const [inputValue, setInputValue]  = useState(search || "");
  const [history,    setHistory]     = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const [expanded,   setExpanded]    = useState(false);

  // ── Advanced filter state ─────────────────────────────────────────────────
  const [showFilters,   setShowFilters]   = useState(false);
  const [selectedTypes, setSelectedTypes] = useState([]);
  const [selectedTags,  setSelectedTags]  = useState([]);
  const [tagInput,      setTagInput]      = useState("");
  const [tagSuggestions, setTagSuggestions] = useState([]);
  const [dateFrom,      setDateFrom]      = useState("");
  const [dateTo,        setDateTo]        = useState("");
  const [authorInput,   setAuthorInput]   = useState("");

  // ── Autocomplete suggestions ──────────────────────────────────────────────
  const [suggestions,   setSuggestions]  = useState([]);
  const [showSuggest,   setShowSuggest]  = useState(false);

  const wrapper  = useRef(null);
  const inputEl  = useRef(null);
  const tagRef   = useRef(null);

  // Debounced values for API calls
  const debouncedInput   = useDebounce(inputValue, 300);
  const debouncedTagInput = useDebounce(tagInput, 250);

  // ── Sync with parent ──────────────────────────────────────────────────────
  useEffect(() => { if (!search) setInputValue(""); }, [search]);

  // ── Auth token ────────────────────────────────────────────────────────────
  const getToken = () => localStorage.getItem("token") || sessionStorage.getItem("token") || "";

  // ── Emit filter changes upward ────────────────────────────────────────────
  const emitFilters = useCallback((overrides = {}) => {
    if (!onFiltersChange) return;
    onFiltersChange({
      fileTypes: selectedTypes,
      tags:      selectedTags,
      dateFrom,
      dateTo,
      author:    authorInput,
      ...overrides,
    });
  }, [onFiltersChange, selectedTypes, selectedTags, dateFrom, dateTo, authorInput]);

  // ── Count active filters ──────────────────────────────────────────────────
  const activeFilterCount = selectedTypes.length + selectedTags.length
    + (dateFrom ? 1 : 0) + (dateTo ? 1 : 0) + (authorInput.trim() ? 1 : 0);

  // ── Autocomplete suggestions from API ─────────────────────────────────────
  useEffect(() => {
    const kw = debouncedInput.trim();
    if (kw.length < 2) { setSuggestions([]); setShowSuggest(false); return; }
    const ctrl = new AbortController();
    fetch(`${API_BASE}/api/documents/search?q=${encodeURIComponent(kw)}&limit=5`, {
      headers: { Authorization: `Bearer ${getToken()}` },
      signal: ctrl.signal,
    })
      .then(r => r.ok ? r.json() : [])
      .then(data => {
        const titles = (Array.isArray(data) ? data : []).slice(0, 5).map(d => d.title).filter(Boolean);
        setSuggestions(titles);
        setShowSuggest(titles.length > 0);
      })
      .catch(() => {});
    return () => ctrl.abort();
  }, [debouncedInput]);

  // ── Tag autocomplete ──────────────────────────────────────────────────────
  useEffect(() => {
    const kw = debouncedTagInput.trim();
    if (kw.length < 1) { setTagSuggestions([]); return; }
    const ctrl = new AbortController();
    fetch(`${API_BASE}/api/tags/search?q=${encodeURIComponent(kw)}`, {
      headers: { Authorization: `Bearer ${getToken()}` },
      signal: ctrl.signal,
    })
      .then(r => r.ok ? r.json() : [])
      .then(data => setTagSuggestions(Array.isArray(data) ? data : []))
      .catch(() => {});
    return () => ctrl.abort();
  }, [debouncedTagInput]);

  // ── Load & merge history ──────────────────────────────────────────────────
  const loadHistory = useCallback(async () => {
    let items = readLocal();
    if (userId && getToken()) {
      try {
        const res = await fetch(
          `${API_BASE}/api/search-history?userId=${encodeURIComponent(userId)}&limit=0`,
          { headers: { Authorization: `Bearer ${getToken()}` } }
        );
        if (res.ok) {
          const remote = await res.json();
          const remoteKW = new Set(remote.map(r => r.keyword));
          const remoteItems = remote.map(r => ({ id: r.history_id, keyword: r.keyword, at: r.searched_at, src: "remote" }));
          const localOnly = items.filter(l => !remoteKW.has(l.keyword)).map((l, i) => ({
            id: l.id || `local-${i}`, keyword: l.keyword,
            at: l.at || new Date(0).toISOString(), src: "local"
          }));
          items = [...remoteItems, ...localOnly].sort((a, b) => new Date(b.at) - new Date(a.at));
        }
      } catch {}
    } else {
      items = items.map((l, i) => ({ id: l.id || `local-${i}`, keyword: l.keyword, at: l.at || new Date(0).toISOString(), src: "local" }));
    }
    const seen = new Set();
    items = items.filter(({ keyword }) => { if (seen.has(keyword)) return false; seen.add(keyword); return true; });
    setHistory(items);
  }, [userId]);

  useEffect(() => { loadHistory(); }, [loadHistory]);

  // Close dropdown on outside click
  useEffect(() => {
    const onDown = (e) => {
      if (wrapper.current && !wrapper.current.contains(e.target)) {
        setShowHistory(false);
        setShowSuggest(false);
        setExpanded(false);
      }
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  // ── Save keyword ──────────────────────────────────────────────────────────
  const saveKeyword = async (keyword) => {
    const kw = keyword.trim();
    if (!kw) return;
    const prev = readLocal().filter(h => h.keyword !== kw);
    writeLocal([{ id: `local-${Date.now()}`, keyword: kw, at: new Date().toISOString() }, ...prev]);
    if (userId && getToken()) {
      try {
        await fetch(`${API_BASE}/api/search-history`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` },
          body: JSON.stringify({ userId, keyword: kw }),
        });
      } catch {}
    }
    await loadHistory();
  };

  // ── Delete history item ───────────────────────────────────────────────────
  const deleteOne = async (item, e) => {
    e.stopPropagation();
    writeLocal(readLocal().filter(h => h.keyword !== item.keyword));
    if (item.src === "remote" && userId && getToken()) {
      try { await fetch(`${API_BASE}/api/search-history/${item.id}`, { method: "DELETE", headers: { Authorization: `Bearer ${getToken()}` } }); } catch {}
    }
    setHistory(prev => prev.filter(h => h.keyword !== item.keyword));
  };

  const clearAll = async (e) => {
    e.stopPropagation();
    writeLocal([]);
    if (userId && getToken()) {
      try { await fetch(`${API_BASE}/api/search-history?userId=${encodeURIComponent(userId)}`, { method: "DELETE", headers: { Authorization: `Bearer ${getToken()}` } }); } catch {}
    }
    setHistory([]);
    setExpanded(false);
  };

  // ── Commit search ─────────────────────────────────────────────────────────
  const commit = async (keyword) => {
    const kw = keyword.trim();
    if (!kw) return;
    await saveKeyword(kw);
    setInputValue(kw);
    setSearch(kw);
    if (onSearch) onSearch(kw);
    setShowHistory(false);
    setShowSuggest(false);
    setExpanded(false);
    emitFilters();
  };

  // ── Input handlers ────────────────────────────────────────────────────────
  const onChange = (e) => {
    const val = e.target.value;
    setInputValue(val);
    setSearch(val);
    setShowHistory(val.length === 0 && history.length > 0);
    if (val.length > 0) setShowSuggest(false);
  };

  const onKeyDown = (e) => {
    if (e.key === "Enter")  commit(inputValue);
    if (e.key === "Escape") { setShowHistory(false); setShowSuggest(false); setExpanded(false); }
  };

  const onClear = () => {
    setInputValue("");
    setSearch("");
    setSuggestions([]);
    setShowSuggest(false);
    inputEl.current?.focus();
  };

  // ── Tag helpers ───────────────────────────────────────────────────────────
  const addTag = (tagName) => {
    const name = tagName.trim();
    if (!name || selectedTags.includes(name)) return;
    const next = [...selectedTags, name];
    setSelectedTags(next);
    setTagInput("");
    setTagSuggestions([]);
    emitFilters({ tags: next });
  };

  const removeTag = (tagName) => {
    const next = selectedTags.filter(t => t !== tagName);
    setSelectedTags(next);
    emitFilters({ tags: next });
  };

  const toggleFileType = (id) => {
    const next = selectedTypes.includes(id) ? selectedTypes.filter(t => t !== id) : [...selectedTypes, id];
    setSelectedTypes(next);
    emitFilters({ fileTypes: next });
  };

  const clearFilters = () => {
    setSelectedTypes([]);
    setSelectedTags([]);
    setDateFrom("");
    setDateTo("");
    setAuthorInput("");
    emitFilters({ fileTypes: [], tags: [], dateFrom: "", dateTo: "", author: "" });
  };

  // ── Derived ───────────────────────────────────────────────────────────────
  const visibleHistory = expanded ? history : history.slice(0, PREVIEW);
  const isDropOpen     = (showHistory && history.length > 0) || (showSuggest && suggestions.length > 0);
  const dropMode       = showSuggest && suggestions.length > 0 ? "suggest" : "history";

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div ref={wrapper} className={`relative w-full ${className} select-none`}>

      {/* ── Input Shell ──────────────────────────────────────────────────── */}
      <div className={[
        "relative p-1 rounded-xl backdrop-blur-xl border transition-all duration-300",
        "bg-white/40 dark:bg-[#0f111a]/45",
        isDropOpen
          ? "border-violet-500/40 shadow-[0_8px_30px_rgba(139,92,246,0.08)] rounded-b-none border-b-0"
          : "border-slate-200/30 dark:border-white/5 shadow-sm focus-within:border-violet-500/35 focus-within:shadow-[0_8px_30px_rgba(139,92,246,0.05)]",
      ].join(" ")}>

        {/* Search icon */}
        <Search
          onClick={() => commit(inputValue)}
          className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500 hover:text-violet-600 dark:hover:text-violet-400 transition-colors duration-200 cursor-pointer z-10"
        />

        {/* Text input */}
        <input
          ref={inputEl}
          type="text"
          value={inputValue}
          onChange={onChange}
          onKeyDown={onKeyDown}
          onFocus={() => {
            if (!inputValue && history.length > 0) setShowHistory(true);
          }}
          placeholder={actualPlaceholder}
          className="w-full rounded-lg bg-white/80 dark:bg-[#0c0d13]/80 border-none pl-11 pr-24 py-2.5 text-xs placeholder:text-slate-400 dark:placeholder:text-slate-600 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-violet-500/40 transition-all duration-300"
        />

        {/* Right controls */}
        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1 z-10">
          {/* Result count badge */}
          {resultCount !== null && inputValue && (
            <span className="flex items-center gap-1 h-5 px-2 rounded-md bg-violet-600 text-white text-[9px] font-bold whitespace-nowrap animate-in fade-in zoom-in-95 duration-150">
              {resultCount} tài liệu
            </span>
          )}

          {/* Clear */}
          {inputValue && (
            <button
              type="button"
              onClick={onClear}
              className="w-5 h-5 flex items-center justify-center rounded-md bg-slate-100 hover:bg-red-50 text-slate-400 hover:text-red-500 dark:bg-slate-800 dark:hover:bg-red-950/30 dark:hover:text-red-400 transition-all duration-200 active:scale-95"
            >
              <X className="w-3 h-3" />
            </button>
          )}


        </div>

      </div>

      {/* ── Dropdown ─────────────────────────────────────────────────────── */}
      {isDropOpen && (
        <div className="absolute left-0 right-0 top-full z-50 overflow-hidden rounded-b-xl border border-t-0 border-violet-500/20 dark:border-violet-500/15 bg-white/98 dark:bg-[#0f111a]/98 backdrop-blur-xl shadow-2xl shadow-black/10">

          {dropMode === "suggest" ? (
            /* Autocomplete suggestions */
            <ul className="py-1">
              <div className="flex items-center gap-1.5 px-4 pt-2 pb-1">
                <Search className="w-3 h-3 text-slate-400" />
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Gợi ý</span>
              </div>
              {suggestions.map((s, i) => (
                <li key={i}>
                  <button
                    type="button"
                    onClick={() => commit(s)}
                    className="w-full flex items-center gap-2.5 px-4 py-2.5 text-left hover:bg-violet-50/70 dark:hover:bg-violet-950/15 group transition-colors duration-100 cursor-pointer"
                  >
                    <Search className="w-3 h-3 text-slate-300 dark:text-slate-600 shrink-0" />
                    <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 truncate group-hover:text-violet-700 dark:group-hover:text-violet-300 transition-colors">{s}</span>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            /* Search history */
            <>
              <div className="flex items-center justify-between px-4 pt-3 pb-2 border-b border-slate-100 dark:border-slate-800/60">
                <div className="flex items-center gap-1.5">
                  <Clock className="w-3 h-3 text-slate-400" />
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    {t("searchBar.history_title") || "Lịch sử"}
                  </span>
                  <span className="text-[9px] font-bold bg-violet-50 dark:bg-violet-950/40 text-violet-500 px-1.5 py-0.5 rounded-full border border-violet-500/10">
                    {history.length}
                  </span>
                </div>
                <button type="button" onClick={clearAll} className="flex items-center gap-1 text-[10px] font-bold text-slate-400 hover:text-red-500 transition-colors cursor-pointer">
                  <Trash2 className="w-3 h-3" />
                  {t("searchBar.clear_history") || "Xoá tất cả"}
                </button>
              </div>
              <ul className="py-1 max-h-64 overflow-y-auto">
                {visibleHistory.map((item, idx) => (
                  <li key={`${item.keyword}-${idx}`}>
                    <button
                      type="button"
                      onClick={() => commit(item.keyword)}
                      className="w-full flex items-center justify-between gap-3 px-4 py-2.5 text-left hover:bg-violet-50/70 dark:hover:bg-violet-950/15 group transition-colors duration-100 cursor-pointer"
                    >
                      <span className="flex items-center gap-2.5 min-w-0">
                        <Clock className="w-3 h-3 text-slate-300 dark:text-slate-600 shrink-0" />
                        <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 truncate group-hover:text-violet-700 dark:group-hover:text-violet-300 transition-colors">{item.keyword}</span>
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
              <button
                type="button"
                onClick={() => setExpanded(v => !v)}
                className="w-full flex items-center justify-center gap-1.5 py-2.5 text-[10px] font-black text-violet-600 dark:text-violet-400 hover:bg-violet-50/50 dark:hover:bg-violet-950/10 border-t border-slate-100 dark:border-slate-800/60 transition-colors cursor-pointer"
              >
                {expanded
                  ? <><ChevronUp className="w-3 h-3" /> {language === "vi" ? "Thu gọn" : "Collapse"}</>
                  : <><ChevronDown className="w-3 h-3" /> {language === "vi" ? `Xem tất cả (${history.length} mục)` : `View all (${history.length} items)`}</>}
              </button>
            </>
          )}
        </div>
      )}



    </div>
  );
}