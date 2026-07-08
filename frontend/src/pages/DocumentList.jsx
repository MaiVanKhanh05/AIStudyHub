import { useEffect, useState, useCallback } from "react";
import axios from "axios";
import DocumentCard from "../components/DocumentCard";
import SearchBar from "../components/SearchBar";
import SearchResultCard from "../components/SearchResultCard";
import TagCloudView from "../components/TagCloudView";
import Pagination from "../components/Pagination";
import DocumentPreviewModal from "../components/DocumentPreviewModal";
import {
  FolderOpen, ArrowRight, BookOpen, Heart, Folder,
  ChevronLeft, FileText, LayoutGrid, Tag, Clock,
  Search, TrendingUp, Star, Calendar, Hash, Layers, RefreshCw,
} from "lucide-react";

const API_BASE   = "http://localhost:5000";
const PAGE_SIZE  = 30;

// ── Helpers ───────────────────────────────────────────────────────────────────
function formatMonthYear(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleString("vi-VN", { month: "long", year: "numeric" });
}

function groupByMonth(docs) {
  const groups = {};
  docs.forEach(doc => {
    const key = formatMonthYear(doc.upload_date) || "Không rõ";
    if (!groups[key]) groups[key] = [];
    groups[key].push(doc);
  });
  return Object.entries(groups); // [["Tháng 6 2025", [docs]], ...]
}

function getToken() {
  return localStorage.getItem("token") || sessionStorage.getItem("token") || "";
}

// ── Smart Folder items ────────────────────────────────────────────────────────
const SMART_FOLDERS = [
  { id: "ALL",       label: "Tất cả",         icon: LayoutGrid, color: "text-violet-600" },
  { id: "MY_SHARED", label: "Tôi đã chia sẻ", icon: BookOpen,   color: "text-indigo-600" },
  { id: "FAVORITES", label: "Yêu thích",       icon: Heart,      color: "text-rose-500"   },
  { id: "RECENT",    label: "Mới nhất (30n)",  icon: Clock,      color: "text-emerald-600"},
];

// ── VIEW MODES ─────────────────────────────────────────────────────────────────
const VIEW_MODES = [
  { id: "TOPIC",    label: "Chủ đề", icon: Layers   },
  { id: "FOLDER",   label: "Thư mục",   icon: Folder  },
  { id: "TAGS",     label: "Tags",      icon: Tag     },
  { id: "TIMELINE", label: "Timeline",  icon: Calendar},
];

// ─────────────────────────────────────────────────────────────────────────────

export default function DocumentList() {
  // ── Core data ──────────────────────────────────────────────────────────────
  const [documents,      setDocuments]      = useState([]);
  const [bookmarkedDocs, setBookmarkedDocs] = useState([]);
  const [tagCloud,       setTagCloud]       = useState([]);
  const [loading,        setLoading]        = useState(false);
  const [currentUser,    setCurrentUser]    = useState(null);
  const [previewDoc,     setPreviewDoc]     = useState(null);

  // ── Search & filter state ──────────────────────────────────────────────────
  const [search,      setSearch]      = useState("");
  const [filters,     setFilters]     = useState({ fileTypes: [], tags: [], dateFrom: "", dateTo: "", author: "" });
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [isSearchMode,  setIsSearchMode]  = useState(false);

  // ── Navigation state ───────────────────────────────────────────────────────
  const [smartFolder,      setSmartFolder]      = useState("ALL");
  const [viewMode,         setViewMode]         = useState("TOPIC");
  const [selectedSubject,  setSelectedSubject]  = useState(null);
  const [selectedTagName,  setSelectedTagName]  = useState(null);
  const [selectedTopic,    setSelectedTopic]    = useState(null);
  const [page,             setPage]             = useState(1);
  const [sidebarOpen,      setSidebarOpen]      = useState(true);

  // ── Topics (AI-generated) ─────────────────────────────────────────────────
  const [topics,        setTopics]        = useState([]);
  const [topicsLoading, setTopicsLoading] = useState(false);

  const fetchTopics = useCallback(async () => {
    setTopicsLoading(true);
    try {
      const res = await axios.get(`${API_BASE}/api/topics`);
      setTopics(res.data || []);
    } catch (err) {
      console.error("Error loading topics:", err);
    } finally {
      setTopicsLoading(false);
    }
  }, []);

  const regenerateTopics = async () => {
    setTopicsLoading(true);
    try {
      const token = getToken();
      const res = await axios.post(`${API_BASE}/api/topics/regenerate`, {}, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      setTopics(res.data.topics || []);
    } catch (err) {
      console.error("Error regenerating topics:", err);
    } finally {
      setTopicsLoading(false);
    }
  };

  // ── Fetch main data ────────────────────────────────────────────────────────
  const fetchDocuments = useCallback(async () => {
    setLoading(true);
    try {
      const token = getToken();
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const [docsRes, cloudRes] = await Promise.all([
        axios.get(`${API_BASE}/api/documents/community`, { headers }),
        axios.get(`${API_BASE}/api/documents/tag-cloud`).catch(() => ({ data: [] })),
      ]);
      let docs = docsRes.data;
      setTagCloud(cloudRes.data || []);

      if (token) {
        try {
          const bkRes = await axios.get(`${API_BASE}/api/documents/bookmarks`, { headers });
          const bkIds = new Set(bkRes.data.map(b => b.document_id));
          setBookmarkedDocs(bkRes.data.map(d => ({ ...d, isBookmarked: true })));
          docs = docs.map(d => ({ ...d, isBookmarked: bkIds.has(d.document_id) }));
        } catch {}
      }
      setDocuments(docs);
    } catch (err) {
      console.error("Error loading documents:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const us = sessionStorage.getItem("user") || localStorage.getItem("user");
    if (us) setCurrentUser(JSON.parse(us));
    fetchDocuments();
    fetchTopics();
  }, [fetchDocuments, fetchTopics]);

  // ── Full-text search via API ───────────────────────────────────────────────
  const doSearch = useCallback(async (keyword, activeFilters) => {
    const kw = (keyword || "").trim();
    const hasFilters = activeFilters && (
      activeFilters.fileTypes?.length || activeFilters.tags?.length ||
      activeFilters.dateFrom || activeFilters.dateTo || activeFilters.author?.trim()
    );

    if (!kw && !hasFilters) {
      setIsSearchMode(false);
      setSearchResults([]);
      return;
    }

    setIsSearchMode(true);
    setSearchLoading(true);
    try {
      const params = new URLSearchParams();
      if (kw)                          params.set("q", kw);
      if (activeFilters?.fileTypes?.length) params.set("fileTypes", activeFilters.fileTypes.join(","));
      if (activeFilters?.tags?.length)      params.set("tags", activeFilters.tags.join(","));
      if (activeFilters?.dateFrom)     params.set("dateFrom", activeFilters.dateFrom);
      if (activeFilters?.dateTo)       params.set("dateTo", activeFilters.dateTo);
      if (activeFilters?.author?.trim()) params.set("author", activeFilters.author.trim());

      const res = await axios.get(`${API_BASE}/api/documents/search?${params}`, {
        headers: { Authorization: `Bearer ${getToken()}` }
      });
      setSearchResults(res.data || []);
    } catch (err) {
      console.error("Search error:", err);
      // Fallback to client-side filter
      const kwLower = kw.toLowerCase();
      setSearchResults(
        documents.filter(d =>
          !kw || [d.title, d.subject_name, d.subject_code, d.author]
            .some(f => (f || "").toLowerCase().includes(kwLower))
        )
      );
    } finally {
      setSearchLoading(false);
    }
  }, [documents]);

  // Reset page on navigation changes
  useEffect(() => { setPage(1); }, [smartFolder, viewMode, selectedSubject, selectedTagName, selectedTopic, isSearchMode]);

  // ── Source documents based on smart folder ──────────────────────────────
  const mySharedDocs = currentUser ? documents.filter(d => d.user_id === currentUser.user_id) : [];
  const recentDocs   = documents.filter(d => {
    if (!d.upload_date) return false;
    const diff = (Date.now() - new Date(d.upload_date).getTime()) / (1000 * 60 * 60 * 24);
    return diff <= 30;
  });

  let sourceDocs = documents;
  if (smartFolder === "MY_SHARED") sourceDocs = mySharedDocs;
  if (smartFolder === "FAVORITES") sourceDocs = bookmarkedDocs;
  if (smartFolder === "RECENT")    sourceDocs = recentDocs;

  // ── Build folders (for FOLDER view) ──────────────────────────────────────
  const foldersMap = new Map();
  sourceDocs.forEach(doc => {
    const key = doc.subject_code || doc.subject || "Chung";
    if (!foldersMap.has(key)) foldersMap.set(key, { name: key, count: 0, subject_name: doc.subject_name });
    foldersMap.get(key).count++;
  });
  const folders = Array.from(foldersMap.values()).sort((a, b) => a.name.localeCompare(b.name));

  // ── Build tag map (for TAG view) ──────────────────────────────────────────
  const tagMap = new Map();
  sourceDocs.forEach(doc => {
    (doc.tags || []).forEach(tag => {
      const key = tag.tag_name;
      if (!tagMap.has(key)) tagMap.set(key, { tag_id: tag.tag_id, tag_name: key, doc_count: 0 });
      tagMap.get(key).doc_count++;
    });
  });
  const docTags = Array.from(tagMap.values()).sort((a, b) => b.doc_count - a.doc_count);

  // ── Docs to show in the list ───────────────────────────────────────────────
  let docsToShow = sourceDocs;
  if (viewMode === "FOLDER" && selectedSubject) {
    docsToShow = sourceDocs.filter(d => (d.subject_code || d.subject || "Chung") === selectedSubject);
  }
  if (viewMode === "TAGS" && selectedTagName) {
    docsToShow = sourceDocs.filter(d => (d.tags || []).some(t => t.tag_name === selectedTagName));
  }

  // Pagination
  const totalPages  = Math.max(1, Math.ceil(docsToShow.length / PAGE_SIZE));
  const currentDocs = docsToShow.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // Search pagination & contextual filtering
  let finalSearchResults = searchResults;
  if (viewMode === "FOLDER" && selectedSubject) {
    finalSearchResults = searchResults.filter(d => (d.subject_code || d.subject || "Chung") === selectedSubject);
  } else if (viewMode === "TAGS" && selectedTagName) {
    finalSearchResults = searchResults.filter(d => (d.tags || []).some(t => t.tag_name === selectedTagName));
  }

  const searchTotalPages = Math.max(1, Math.ceil(finalSearchResults.length / PAGE_SIZE));
  const searchCurrentDocs = finalSearchResults.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const searchKeywords = search.split(/\s+/).filter(Boolean);

  // ── Render helpers ─────────────────────────────────────────────────────────
  // ── Render: Topic view (AI-clustered) ─────────────────────────────────────
  // Use topic.color from DB instead of PALETTE

    const renderTopicView = () => {
    if (topicsLoading) return (
      <div className="flex items-center justify-center py-20">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-violet-300 border-t-violet-600 animate-spin" />
          <p className="text-xs font-semibold text-slate-400">Đang tải chủ đề...</p>
        </div>
      </div>
    );

    // Inside a topic → show subject sub-folders
    if (selectedTopic) {
      const topic = topics.find(t => t.topic_id === selectedTopic);
      if (!topic) return null;
      const topicColor = topic.color || '#8b5cf6';
      const topicSubjectCodes = new Set((topic.subjects || []).map(s => s.subject_code));
      const topicFolders = folders.filter(f => topicSubjectCodes.has(f.name));
      if (selectedSubject) return renderFlatDocs();
      return (
        <>
          <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
            {topicFolders.map((folder) => {
              const displayName = folder.subject_name && folder.subject_name !== folder.name ? folder.subject_name : folder.name;
              return (
                <div
                  key={folder.name}
                  onClick={() => { setSelectedSubject(folder.name); setPage(1); }}
                  className="group bg-white dark:bg-[#0f111a]/80 rounded-2xl p-5 border border-slate-200/80 dark:border-white/5 hover:shadow-md transition-all duration-300 cursor-pointer flex flex-col items-center justify-center min-h-[130px] relative overflow-hidden"
                  style={{ '--hover-color': `${topicColor}30` }}
                >
                  <div className="absolute inset-0 transition-opacity opacity-0 group-hover:opacity-100" style={{ backgroundImage: `linear-gradient(to bottom right, ${topicColor}15, transparent)` }} />
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-3 group-hover:scale-110 transition-transform duration-300 shadow-sm border" style={{ backgroundColor: `${topicColor}15`, borderColor: `${topicColor}30`, color: topicColor }}>
                    <Folder size={22} />
                  </div>
                  <h3 className="font-black text-slate-800 dark:text-slate-100 text-center text-sm leading-tight transition-colors line-clamp-2 px-1" style={{ color: 'inherit' }}>{displayName}</h3>
                  {folder.name !== displayName && <span className="mt-1.5 px-2 py-0.5 rounded-full text-[9px] font-black" style={{ backgroundColor: `${topicColor}15`, color: topicColor }}>{folder.name}</span>}
                  <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-2 flex items-center gap-1"><FileText size={11} /> {folder.count} tài liệu</p>
                </div>
              );
            })}
            {topicFolders.length === 0 && <EmptyState icon={<Folder size={32} />} title="Chưa có môn học nào" />}
          </div>
        </>
      );
    }

    // Top-level topic list (like screenshot)
    if (topics.length === 0) return (
      <div className="text-center py-16 bg-white dark:bg-[#0f111a]/60 rounded-2xl border border-dashed border-slate-200 dark:border-white/5">
        <Layers size={32} className="mx-auto text-slate-300 dark:text-slate-600 mb-3" />
        <p className="text-sm font-bold text-slate-500">Chưa có chủ đề nào</p>
      </div>
    );

    return (
      <div className="space-y-0 bg-white dark:bg-[#0f111a]/80 rounded-2xl border border-slate-200/80 dark:border-white/5 overflow-hidden divide-y divide-slate-100 dark:divide-white/5">
        {topics.map((topic) => {
          const topicColor = topic.color || '#8b5cf6';
          const totalDocs = (topic.subjects || []).reduce((s, sub) => s + (Number(sub.doc_count) || 0), 0);
          return (
            <div
              key={topic.topic_id}
              className="flex items-center gap-5 px-5 py-4 hover:bg-slate-50 dark:hover:bg-white/[0.03] transition-colors cursor-pointer group"
              onClick={() => { setSelectedTopic(topic.topic_id); setSelectedSubject(null); setPage(1); }}
            >
              {/* Icon */}
              <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl shrink-0 shadow-sm group-hover:scale-105 transition-transform border" style={{ backgroundColor: `${topicColor}15`, borderColor: `${topicColor}30`, color: topicColor }}>
                <Folder size={24} />
              </div>

              {/* Left: name + description + subject badges */}
              <div className="flex-1 min-w-0">
                <p className="font-black text-slate-800 dark:text-slate-100 text-sm transition-colors" style={{ color: 'inherit' }}>{topic.name}</p>
                {topic.description && <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5 truncate">{topic.description}</p>}
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {(topic.subjects || []).slice(0, 8).map(s => (
                    <span
                      key={s.subject_code}
                      onClick={e => { e.stopPropagation(); setSelectedTopic(topic.topic_id); setSelectedSubject(s.subject_code); setPage(1); }}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold cursor-pointer hover:opacity-80 transition-opacity"
                      style={{ backgroundColor: `${topicColor}15`, color: topicColor }}
                    >
                      <Folder size={9} /> {s.subject_code}
                    </span>
                  ))}
                  {(topic.subjects || []).length > 8 && (
                    <span className="text-[10px] text-slate-400 font-semibold self-center">+{topic.subjects.length - 8} môn</span>
                  )}
                </div>
              </div>

              {/* Right: stats */}
              <div className="shrink-0 flex gap-5 text-center">
                <div>
                  <p className="text-base font-black" style={{ color: topicColor }}>{(topic.subjects || []).length}</p>
                  <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Môn học</p>
                </div>
                <div>
                  <p className="text-base font-black" style={{ color: topicColor }}>{totalDocs}</p>
                  <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Tài liệu</p>
                </div>
              </div>

              <ArrowRight size={16} className="text-slate-300 dark:text-slate-600 group-hover:translate-x-1 transition-all shrink-0" style={{ color: topicColor }} />
            </div>
          );
        })}
      </div>
    );
  };
const renderFolderGrid = () => (
    <>
      {folders.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
          {folders.map((folder, i) => {
            // Cycle through gradient colors
            const colors = [
              { bg: "bg-violet-100 dark:bg-violet-950/40", text: "text-violet-600 dark:text-violet-400", fill: "fill-violet-200 dark:fill-violet-900", badge: "bg-violet-600" },
              { bg: "bg-indigo-100 dark:bg-indigo-950/40", text: "text-indigo-600 dark:text-indigo-400", fill: "fill-indigo-200 dark:fill-indigo-900", badge: "bg-indigo-600" },
              { bg: "bg-sky-100 dark:bg-sky-950/40",     text: "text-sky-600 dark:text-sky-400",     fill: "fill-sky-200 dark:fill-sky-900",     badge: "bg-sky-600" },
              { bg: "bg-emerald-100 dark:bg-emerald-950/40", text: "text-emerald-600 dark:text-emerald-400", fill: "fill-emerald-200 dark:fill-emerald-900", badge: "bg-emerald-600" },
              { bg: "bg-amber-100 dark:bg-amber-950/40", text: "text-amber-600 dark:text-amber-400", fill: "fill-amber-200 dark:fill-amber-900",   badge: "bg-amber-600" },
              { bg: "bg-rose-100 dark:bg-rose-950/40",   text: "text-rose-600 dark:text-rose-400",   fill: "fill-rose-200 dark:fill-rose-900",     badge: "bg-rose-600" },
            ];
            const c = colors[i % colors.length];
            const displayName = folder.subject_name && folder.subject_name !== folder.name
              ? folder.subject_name
              : folder.name;
            const codeLabel = folder.name !== displayName ? folder.name : null;

            return (
              <div
                key={folder.name}
                onClick={() => { setSelectedSubject(folder.name); setPage(1); }}
                className="group bg-white dark:bg-[#0f111a]/80 rounded-2xl p-5 border border-slate-200/80 dark:border-white/5 hover:border-violet-300/60 dark:hover:border-violet-500/30 hover:shadow-md transition-all duration-300 cursor-pointer flex flex-col items-center justify-center min-h-[140px] relative overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-violet-50/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                {/* Icon */}
                <div className={`w-14 h-14 ${c.bg} ${c.text} rounded-2xl flex items-center justify-center mb-3 group-hover:scale-110 transition-transform duration-300`}>
                  <Folder size={28} className={c.fill} />
                </div>
                {/* Subject name (primary) */}
                <h3 className="font-black text-slate-800 dark:text-slate-100 text-center text-sm leading-tight group-hover:text-violet-700 dark:group-hover:text-violet-300 transition-colors line-clamp-2 px-1">
                  {displayName}
                </h3>
                {/* Subject code (secondary) */}
                {codeLabel && (
                  <span className={`mt-1 px-2 py-0.5 rounded-full text-[9px] font-black text-white ${c.badge} opacity-80`}>
                    {codeLabel}
                  </span>
                )}
                {/* Count */}
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-2 flex items-center gap-1">
                  <FileText size={11} /> {folder.count} tài liệu
                </p>
              </div>
            );
          })}
        </div>
      ) : (
        <EmptyState icon={<FolderOpen size={32} />} title="Chưa có thư mục nào" />
      )}
    </>
  );

  const renderTagView = () => (
    <>
      {!selectedTagName ? (
        <div className="space-y-6">
          <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold">
            {docTags.length} tags — click để xem tài liệu theo tag
          </p>
          {docTags.length > 0 ? (
            <TagCloudView
              tags={docTags}
              selectedTags={[]}
              onTagSelect={(name) => { setSelectedTagName(name); setPage(1); }}
            />
          ) : (
            <EmptyState icon={<Tag size={32} />} title="Chưa có tags nào" sub="Upload tài liệu và gắn tag để tổ chức kho học liệu của bạn" />
          )}
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
          {currentDocs.map(doc => (
            <DocumentCard
              key={doc.document_id}
              doc={doc}
              isPersonal={false}
              isMyShared={currentUser && doc.user_id === currentUser.user_id}
              onUnshare={fetchDocuments}
              onBookmarkChange={(docId, isBookmarked) => {
                if (!isBookmarked) {
                  setBookmarkedDocs(prev => prev.filter(d => String(d.document_id || d.id) !== String(docId)));
                }
              }}
            />
          ))}
          {docsToShow.length === 0 && (
            <div className="col-span-full">
              <EmptyState icon={<Tag size={32} />} title={`Không có tài liệu với tag "${selectedTagName}"`} />
            </div>
          )}
        </div>
      )}
    </>
  );

  const renderTimeline = () => {
    const groups = groupByMonth(docsToShow);
    if (!groups.length) return <EmptyState icon={<Calendar size={32} />} title="Chưa có tài liệu nào" />;
    return (
      <div className="space-y-8">
        {groups.map(([month, docs]) => (
          <div key={month} className="relative">
            {/* Month header */}
            <div className="flex items-center gap-3 mb-4">
              <div className="w-3 h-3 rounded-full bg-violet-500 shrink-0 shadow-sm shadow-violet-300" />
              <div className="h-px flex-1 bg-gradient-to-r from-violet-200 dark:from-violet-800/50 to-transparent" />
              <span className="text-xs font-black text-violet-600 dark:text-violet-400 uppercase tracking-wider shrink-0">{month}</span>
              <span className="text-[10px] font-bold text-slate-400 shrink-0">{docs.length} tài liệu</span>
            </div>
            {/* Docs strip */}
            <div className="ml-4 grid gap-4 sm:grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
              {docs.map(doc => (
                <DocumentCard
                  key={doc.document_id}
                  doc={doc}
                  isPersonal={false}
                  isMyShared={currentUser && doc.user_id === currentUser.user_id}
                  onUnshare={fetchDocuments}
                  onBookmarkChange={(docId, isBookmarked) => {
                    if (!isBookmarked) {
                      setBookmarkedDocs(prev => prev.filter(d => String(d.document_id || d.id) !== String(docId)));
                    }
                  }}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderFlatDocs = () => (
    <>
      <div className="grid gap-5 sm:grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
        {currentDocs.map(doc => (
          <DocumentCard
            key={doc.document_id}
            doc={doc}
            isPersonal={false}
            isMyShared={currentUser && doc.user_id === currentUser.user_id}
            onUnshare={fetchDocuments}
            onBookmarkChange={(docId, isBookmarked) => {
              if (!isBookmarked) {
                setBookmarkedDocs(prev => prev.filter(d => String(d.document_id || d.id) !== String(docId)));
              }
            }}
          />
        ))}
      </div>
      {docsToShow.length === 0 && <EmptyState icon={<FileText size={32} />} title="Không có tài liệu nào" />}
      {docsToShow.length > PAGE_SIZE && (
        <Pagination page={page} totalPages={totalPages} setPage={setPage} />
      )}
    </>
  );

  // ── Main render ─────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50/80 dark:bg-[#080a0f]">
      <div className="max-w-[1440px] mx-auto px-4 py-8">

        {/* ── Page Header ───────────────────────────────────────────────── */}
        <div className="mb-6">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-violet-100 dark:bg-violet-950/40 border border-violet-200/60 dark:border-violet-500/20 text-violet-600 dark:text-violet-400 text-[10px] font-black uppercase tracking-widest mb-3">
            <FolderOpen size={12} />
            Cộng Đồng AIStudyHub
          </div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white leading-tight">
            Khám Phá Tài Liệu
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Tìm kiếm và khám phá tài liệu học tập từ mọi người
          </p>
        </div>

        {/* ── Search Bar ────────────────────────────────────────────────── */}
        <div className="mb-6">
          <SearchBar
            search={search}
            setSearch={setSearch}
            className="max-w-full"
            userId={currentUser?.user_id || null}
            onSearch={(kw) => {
              setSearch(kw);
              setPage(1);
              doSearch(kw, filters);
            }}
            onFiltersChange={(newFilters) => {
              setFilters(newFilters);
              doSearch(search, newFilters);
            }}
          />
        </div>

        {/* ── Body: Sidebar + Main ────────────────────────────────────────── */}
        <div className="flex gap-6 items-start">

          {/* ── Left Sidebar ───────────────────────────────────────────── */}
          <aside className={`shrink-0 transition-all duration-300 ${sidebarOpen ? "w-56" : "w-0 overflow-hidden"}`}>
            <div className="sticky top-6 space-y-4">

              {/* Smart Folders */}
              <nav className="bg-white dark:bg-[#0f111a]/80 rounded-2xl border border-slate-200/80 dark:border-white/5 overflow-hidden">
                <div className="px-3 py-2 border-b border-slate-100 dark:border-white/5">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Thư mục thông minh</span>
                </div>
                {SMART_FOLDERS.map(sf => {
                  const Icon = sf.icon;
                  const active = smartFolder === sf.id && !isSearchMode;
                  return (
                    <button
                      key={sf.id}
                      onClick={() => { setSmartFolder(sf.id); setSelectedSubject(null); setSelectedTagName(null); setIsSearchMode(false); setSearch(""); setPage(1); }}
                      className={[
                        "w-full flex items-center gap-2.5 px-3 py-2.5 text-xs font-semibold transition-all duration-150 cursor-pointer text-left",
                        active
                          ? "bg-violet-50 dark:bg-violet-950/30 text-violet-700 dark:text-violet-300"
                          : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-white/5",
                      ].join(" ")}
                    >
                      <Icon size={14} className={active ? "text-violet-600 dark:text-violet-400" : sf.color} />
                      {sf.label}
                      {sf.id === "MY_SHARED" && mySharedDocs.length > 0 && (
                        <span className="ml-auto text-[9px] font-black bg-indigo-100 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 px-1.5 py-0.5 rounded-full">
                          {mySharedDocs.length}
                        </span>
                      )}
                      {sf.id === "FAVORITES" && bookmarkedDocs.length > 0 && (
                        <span className="ml-auto text-[9px] font-black bg-rose-100 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 px-1.5 py-0.5 rounded-full">
                          {bookmarkedDocs.length}
                        </span>
                      )}
                    </button>
                  );
                })}
              </nav>

              {/* View Mode Toggle */}
              {!isSearchMode && (
                <div className="bg-white dark:bg-[#0f111a]/80 rounded-2xl border border-slate-200/80 dark:border-white/5 overflow-hidden">
                  <div className="px-3 py-2 border-b border-slate-100 dark:border-white/5">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Chế độ xem</span>
                  </div>
                  {VIEW_MODES.map(vm => {
                    const Icon = vm.icon;
                    const active = viewMode === vm.id;
                    return (
                      <button
                        key={vm.id}
                        onClick={() => { setViewMode(vm.id); setSelectedSubject(null); setSelectedTagName(null); setSelectedTopic(null); setPage(1); }}
                        className={[
                          "w-full flex items-center gap-2.5 px-3 py-2.5 text-xs font-semibold transition-all duration-150 cursor-pointer text-left",
                          active
                            ? "bg-violet-50 dark:bg-violet-950/30 text-violet-700 dark:text-violet-300"
                            : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-white/5",
                        ].join(" ")}
                      >
                        <Icon size={14} className={active ? "text-violet-500" : "text-slate-400"} />
                        {vm.label}
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Tag Cloud (sidebar) */}
              {tagCloud.length > 0 && !isSearchMode && (
                <div className="bg-white dark:bg-[#0f111a]/80 rounded-2xl border border-slate-200/80 dark:border-white/5 p-3">
                  <div className="flex items-center gap-1.5 mb-2.5">
                    <Hash size={11} className="text-slate-400" />
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tags phổ biến</span>
                  </div>
                  <TagCloudView
                    tags={tagCloud.slice(0, 12)}
                    selectedTags={selectedTagName ? [selectedTagName] : []}
                    onTagSelect={(name) => {
                      setSelectedTagName(prev => prev === name ? null : name);
                      setViewMode("TAGS");
                      setPage(1);
                    }}
                    compact
                  />
                </div>
              )}
            </div>
          </aside>

          {/* ── Main content ──────────────────────────────────────────── */}
          <main className="flex-1 min-w-0">

            {/* Breadcrumb / status bar */}
            <div className="flex items-center justify-between mb-4 min-h-8">
              <div className="flex items-center gap-2">
                {/* Back button */}
                {(selectedSubject || selectedTagName || selectedTopic) && (
                  <button
                    onClick={() => {
                      if (selectedSubject) { setSelectedSubject(null); setPage(1); }
                      else if (selectedTopic) { setSelectedTopic(null); setPage(1); }
                      else { setSelectedTagName(null); setPage(1); }
                    }}
                    className="flex items-center gap-1.5 text-xs font-bold text-violet-600 dark:text-violet-400 hover:text-violet-800 dark:hover:text-violet-200 bg-violet-50 dark:bg-violet-950/30 hover:bg-violet-100 dark:hover:bg-violet-950/50 px-3 py-1.5 rounded-xl transition-all cursor-pointer"
                  >
                    <ChevronLeft size={14} /> Quay lại
                  </button>
                )}

                {/* Breadcrumb */}
                <span className="text-xs text-slate-400 dark:text-slate-500 font-semibold">
                  {isSearchMode
                    ? `${searchLoading ? "Đang tìm..." : `${finalSearchResults.length} kết quả${selectedSubject ? ` trong "${selectedSubject}"` : selectedTagName ? ` trong "#${selectedTagName}"` : ""}`}`
                    : selectedSubject
                      ? selectedSubject
                      : selectedTopic
                        ? (topics.find(t => t.topic_id === selectedTopic)?.name || "Chủ đề")
                        : selectedTagName
                          ? `#${selectedTagName}`
                          : `${docsToShow.length} tài liệu`}
                </span>
              </div>

              {/* Sidebar toggle + regenerate button */}
              <div className="flex items-center gap-2">
                
                <button
                  onClick={() => setSidebarOpen(v => !v)}
                  className="text-[10px] font-bold text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 px-2 py-1 rounded-lg hover:bg-slate-100 dark:hover:bg-white/5 transition-colors cursor-pointer"
                >
                  {sidebarOpen ? "← Ẩn panel" : "→ Mở panel"}
                </button>
              </div>
            </div>

            {/* Loading */}
            {(loading || searchLoading) && (
              <div className="flex justify-center items-center py-20">
                <div className="flex flex-col items-center gap-3">
                  <div className="w-8 h-8 rounded-full border-2 border-violet-300 border-t-violet-600 animate-spin" />
                  <p className="text-xs font-semibold text-slate-400">
                    {searchLoading ? "Đang tìm kiếm..." : "Đang tải tài liệu..."}
                  </p>
                </div>
              </div>
            )}

            {/* ── SEARCH RESULTS MODE ──────────────────────────────────── */}
            {!loading && !searchLoading && isSearchMode && (
              <div className="space-y-3">
                {searchCurrentDocs.length > 0 ? (
                  <>
                    {searchCurrentDocs.map((doc, i) => (
                      <SearchResultCard
                        key={doc.document_id}
                        doc={doc}
                        keywords={searchKeywords}
                        onClick={(d) => setPreviewDoc(d)}
                        animDelay={i * 40}
                      />
                    ))}
                    {finalSearchResults.length > PAGE_SIZE && (
                      <Pagination page={page} totalPages={searchTotalPages} setPage={setPage} />
                    )}
                  </>
                ) : (
                  <EmptyState
                    icon={<Search size={32} />}
                    title="Không tìm thấy tài liệu nào"
                    sub={`Thử từ khoá khác hoặc điều chỉnh bộ lọc`}
                  />
                )}
              </div>
            )}

            {/* ── NORMAL MODES (Topic / Folder / Tag / Timeline) ───────── */}
            {!loading && !searchLoading && !isSearchMode && (
              <>
                {/* TOPIC view — AI-generated clusters */}
                {viewMode === "TOPIC" && renderTopicView()}

                {/* FOLDER view — either showing folder grid, or docs inside a folder */}
                {viewMode === "FOLDER" && (
                  !selectedSubject ? renderFolderGrid() : renderFlatDocs()
                )}

                {/* TAGS view */}
                {viewMode === "TAGS" && renderTagView()}

                {/* TIMELINE view */}
                {viewMode === "TIMELINE" && renderTimeline()}
              </>
            )}
          </main>
        </div>
      </div>

      {/* Preview Modal */}
      {previewDoc && (
        <DocumentPreviewModal
          doc={previewDoc}
          onClose={() => setPreviewDoc(null)}
        />
      )}
    </div>
  );
}

// ── Empty State ────────────────────────────────────────────────────────────────
function EmptyState({ icon, title, sub }) {
  return (
    <div className="text-center py-16 bg-white dark:bg-[#0f111a]/60 rounded-2xl border border-dashed border-slate-200 dark:border-white/5">
      <div className="w-14 h-14 bg-slate-100 dark:bg-white/5 text-slate-400 dark:text-slate-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
        {icon}
      </div>
      <p className="text-sm font-bold text-slate-500 dark:text-slate-400">{title}</p>
      {sub && <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">{sub}</p>}
    </div>
  );
}