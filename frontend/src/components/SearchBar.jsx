import { useState, useRef, useEffect, useCallback } from "react";
import { API_URL } from "@/config/api.js";
import {
  Search, X, Clock, Trash2, ChevronDown, ChevronUp,
  SlidersHorizontal, Tag, Calendar, FileText, User, Hash, Check
} from "lucide-react";
import { useLanguage } from "../context/LanguageContext";

// ── Constants ─────────────────────────────────────────────────────────────────
const API_BASE   = "${API_URL}";
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

          {/* Divider */}
          <div className="w-px h-4 bg-slate-200 dark:bg-white/10 mx-0.5" />

          {/* Filter toggle */}
          <button
            type="button"
            onClick={() => setShowFilters(v => !v)}
            title="Bộ lọc nâng cao"
            className={[
              "flex items-center gap-1 h-7 px-2 rounded-lg text-[10px] font-bold transition-all duration-200 active:scale-95 cursor-pointer",
              showFilters || activeFilterCount > 0
                ? "bg-violet-600 text-white shadow-sm"
                : "bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-slate-400 hover:bg-violet-50 hover:text-violet-600",
            ].join(" ")}
          >
            <SlidersHorizontal className="w-3 h-3" />
            {activeFilterCount > 0 && (
              <span className="w-4 h-4 rounded-full bg-white/25 text-[8px] font-black flex items-center justify-center">
                {activeFilterCount}
              </span>
            )}
          </button>
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

      {/* ── Advanced Filter Panel ─────────────────────────────────────────── */}
      <div className={[
        "absolute top-[calc(100%+8px)] z-50 -left-4 sm:left-auto sm:-right-4 w-[calc(100vw-32px)] sm:w-[600px] lg:w-[800px] max-w-[1440px]",
        "transition-all duration-300 origin-top",
        showFilters ? "opacity-100 scale-100 pointer-events-auto" : "opacity-0 scale-95 pointer-events-none",
      ].join(" ")}>
        <div className="p-4 bg-white/95 dark:bg-[#0f111a]/95 backdrop-blur-xl rounded-xl border border-slate-200/80 dark:border-white/10 shadow-2xl flex flex-col gap-4">

          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <SlidersHorizontal className="w-3.5 h-3.5 text-violet-600" />
              <span className="text-xs font-black text-slate-700 dark:text-slate-200 uppercase tracking-wide">Bộ lọc nâng cao</span>
              {activeFilterCount > 0 && (
                <span className="text-[9px] font-black bg-violet-600 text-white px-1.5 py-0.5 rounded-full">{activeFilterCount}</span>
              )}
            </div>
            {activeFilterCount > 0 && (
              <button type="button" onClick={clearFilters} className="text-[10px] font-bold text-red-500 hover:text-red-600 flex items-center gap-1 cursor-pointer">
                <X className="w-3 h-3" /> Xoá bộ lọc
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* File types */}
            <div className="md:row-span-2">
              <div className="flex items-center gap-1.5 mb-2">
                <FileText className="w-3 h-3 text-slate-400" />
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Loại file</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {FILE_TYPES.map(ft => {
                  const active = selectedTypes.includes(ft.id);
                  return (
                    <button
                      key={ft.id}
                      type="button"
                      onClick={() => toggleFileType(ft.id)}
                      className={[
                        "flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-black border transition-all duration-200 cursor-pointer active:scale-95",
                        active
                           ? `${ft.color} text-white border-transparent shadow-sm`
                          : "bg-slate-50 dark:bg-white/5 text-slate-500 dark:text-slate-400 border-slate-200/60 dark:border-white/10 hover:border-violet-300",
                      ].join(" ")}
                    >
                      {active && <Check className="w-2.5 h-2.5" />}
                      {ft.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Date range */}
            <div className="md:col-span-2">
              <div className="flex items-center gap-1.5 mb-2">
                <Calendar className="w-3 h-3 text-slate-400" />
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Khoảng thời gian</span>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={dateFrom}
                  onChange={e => { setDateFrom(e.target.value); emitFilters({ dateFrom: e.target.value }); }}
                  className="flex-1 min-w-0 rounded-lg bg-slate-50 dark:bg-white/5 border border-slate-200/60 dark:border-white/10 px-2.5 py-1.5 text-[10px] text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-1 focus:ring-violet-500/40 cursor-pointer"
                />
                <span className="text-[10px] text-slate-400 shrink-0">→</span>
                <input
                  type="date"
                  value={dateTo}
                  onChange={e => { setDateTo(e.target.value); emitFilters({ dateTo: e.target.value }); }}
                  className="flex-1 min-w-0 rounded-lg bg-slate-50 dark:bg-white/5 border border-slate-200/60 dark:border-white/10 px-2.5 py-1.5 text-[10px] text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-1 focus:ring-violet-500/40 cursor-pointer"
                />
              </div>
            </div>

            {/* Tags input */}
            <div className="md:col-span-1">
              <div className="flex items-center gap-1.5 mb-2">
                <Hash className="w-3 h-3 text-slate-400" />
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Tags</span>
              </div>
              {/* Selected tag chips */}
              {selectedTags.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-2">
                  {selectedTags.map(tag => (
                    <span key={tag} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-violet-600 text-white text-[10px] font-bold">
                      <Hash className="w-2.5 h-2.5" />
                      {tag}
                      <button type="button" onClick={() => removeTag(tag)} className="hover:text-red-200 cursor-pointer">
                        <X className="w-2.5 h-2.5" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
              {/* Tag input */}
              <div ref={tagRef} className="relative">
                <input
                  type="text"
                  value={tagInput}
                  onChange={e => setTagInput(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === "Enter" && tagInput.trim()) { e.preventDefault(); addTag(tagInput); }
                    if (e.key === "Backspace" && !tagInput && selectedTags.length > 0) {
                      removeTag(selectedTags[selectedTags.length - 1]);
                    }
                  }}
                  placeholder="Nhập tag rồi Enter..."
                  className="w-full rounded-lg bg-slate-50 dark:bg-white/5 border border-slate-200/60 dark:border-white/10 px-3 py-1.5 text-xs placeholder:text-slate-400 dark:placeholder:text-slate-600 text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-1 focus:ring-violet-500/40"
                />
                {tagSuggestions.length > 0 && (
                  <ul className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-[#0f111a] border border-slate-200/60 dark:border-white/10 rounded-lg shadow-lg z-50 overflow-hidden">
                    {tagSuggestions.map(s => (
                      <li key={s.tag_id}>
                        <button
                          type="button"
                          onMouseDown={e => { e.preventDefault(); addTag(s.tag_name); }}
                          className="w-full text-left px-3 py-1.5 text-xs hover:bg-violet-50 dark:hover:bg-violet-950/20 flex items-center gap-1.5 text-slate-700 dark:text-slate-300 cursor-pointer"
                        >
                          <Hash className="w-2.5 h-2.5 text-violet-500" />
                          {s.tag_name}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>

            {/* Author */}
            <div className="md:col-span-1">
              <div className="flex items-center gap-1.5 mb-2">
                <User className="w-3 h-3 text-slate-400" />
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Tác giả</span>
              </div>
              <input
                type="text"
                value={authorInput}
                onChange={e => { setAuthorInput(e.target.value); emitFilters({ author: e.target.value }); }}
                placeholder="Tên tác giả..."
                className="w-full rounded-lg bg-slate-50 dark:bg-white/5 border border-slate-200/60 dark:border-white/10 px-3 py-1.5 text-xs placeholder:text-slate-400 dark:placeholder:text-slate-600 text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-1 focus:ring-violet-500/40"
              />
            </div>
          </div>

          {/* Apply */}
          <div className="flex justify-end pt-2 border-t border-slate-100 dark:border-white/5">
            <button
              type="button"
              onClick={() => { emitFilters(); commit(inputValue); setShowFilters(false); }}
              className="px-6 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-xs font-black transition-all duration-200 active:scale-[0.98] shadow-sm shadow-violet-300/20 cursor-pointer"
            >
              Áp dụng bộ lọc
            </button>
          </div>
        </div>
      </div>

      {/* ── Active Filter Chips (below bar, outside panel) ────────────────── */}
      {activeFilterCount > 0 && !showFilters && (
        <div className="flex flex-wrap gap-1.5 mt-2">
          {selectedTypes.map(t => (
            <span key={t} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 text-[10px] font-bold border border-blue-200/50 dark:border-blue-700/30">
              <FileText className="w-2.5 h-2.5" />
              {t.toUpperCase()}
              <button type="button" onClick={() => toggleFileType(t)} className="hover:text-red-500 cursor-pointer"><X className="w-2.5 h-2.5" /></button>
            </span>
          ))}
          {selectedTags.map(t => (
            <span key={t} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-violet-100 dark:bg-violet-950/40 text-violet-700 dark:text-violet-300 text-[10px] font-bold border border-violet-200/50 dark:border-violet-700/30">
              <Hash className="w-2.5 h-2.5" />
              {t}
              <button type="button" onClick={() => removeTag(t)} className="hover:text-red-500 cursor-pointer"><X className="w-2.5 h-2.5" /></button>
            </span>
          ))}
          {dateFrom && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 text-[10px] font-bold border border-emerald-200/50 dark:border-emerald-700/30">
              <Calendar className="w-2.5 h-2.5" />
              Từ {dateFrom}
              <button type="button" onClick={() => { setDateFrom(""); emitFilters({ dateFrom: "" }); }} className="hover:text-red-500 cursor-pointer"><X className="w-2.5 h-2.5" /></button>
            </span>
          )}
          {dateTo && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 text-[10px] font-bold border border-emerald-200/50 dark:border-emerald-700/30">
              <Calendar className="w-2.5 h-2.5" />
              Đến {dateTo}
              <button type="button" onClick={() => { setDateTo(""); emitFilters({ dateTo: "" }); }} className="hover:text-red-500 cursor-pointer"><X className="w-2.5 h-2.5" /></button>
            </span>
          )}
          {authorInput.trim() && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 text-[10px] font-bold border border-amber-200/50 dark:border-amber-700/30">
              <User className="w-2.5 h-2.5" />
              {authorInput}
              <button type="button" onClick={() => { setAuthorInput(""); emitFilters({ author: "" }); }} className="hover:text-red-500 cursor-pointer"><X className="w-2.5 h-2.5" /></button>
            </span>
          )}
          <button type="button" onClick={clearFilters} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-50 dark:bg-red-950/30 text-red-500 text-[10px] font-bold border border-red-200/50 hover:bg-red-100 cursor-pointer">
            <X className="w-2.5 h-2.5" /> Xoá tất cả
          </button>
        </div>
      )}

    </div>
  );
}