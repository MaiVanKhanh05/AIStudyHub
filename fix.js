const fs = require('fs');

let content = fs.readFileSync('frontend/src/components/Home.jsx', 'utf8').replace(/\r\n/g, '\n');

// Helper to reliably replace exactly once
function exactReplace(target, replacement, stepName) {
  if (content.indexOf(target) === -1) {
    console.error(`[ERROR] Failed to find target for: ${stepName}`);
    process.exit(1);
  }
  content = content.replace(target, replacement);
  console.log(`[OK] Replaced: ${stepName}`);
}

// 1. Add Missing Imports
const importsTarget = `import { toast } from "sonner";`;
const importsReplacement = `import { toast } from "sonner";\nimport DocumentPreviewModal from "./DocumentPreviewModal";`;
if (!content.includes('DocumentPreviewModal')) exactReplace(importsTarget, importsReplacement, "Imports");

const iconTarget = `import {`;
const iconReplacement = `import {\n  BookOpen as BookOpenIcon,`;
if (!content.includes('BookOpenIcon')) exactReplace(iconTarget, iconReplacement, "Icons");

// 2. Add Missing States
const stateTarget = `  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSubjectFilter, setSelectedSubjectFilter] = useState("All");`;
const stateReplacement = `  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSubjectFilter, setSelectedSubjectFilter] = useState("All");
  const [sortConfig, setSortConfig] = useState({ key: "upload_date", direction: "desc" });
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [previewDoc, setPreviewDoc] = useState(null);
  const [openMenuId, setOpenMenuId] = useState(null);
  const [shareModalDoc, setShareModalDoc] = useState(null);
  const [shareDescription, setShareDescription] = useState("");
  const [isSharing, setIsSharing] = useState(false);

  useEffect(() => {
    if (!showSortMenu) return;
    const closeMenu = () => setShowSortMenu(false);
    const timeoutId = setTimeout(() => window.addEventListener("click", closeMenu), 0);
    return () => { clearTimeout(timeoutId); window.removeEventListener("click", closeMenu); };
  }, [showSortMenu]);

  useEffect(() => {
    if (!openMenuId) return;
    const closeMenu = () => setOpenMenuId(null);
    const timeoutId = setTimeout(() => window.addEventListener("click", closeMenu), 0);
    return () => { clearTimeout(timeoutId); window.removeEventListener("click", closeMenu); };
  }, [openMenuId]);`;
exactReplace(stateTarget, stateReplacement, "States");

// 3. Fix Community Docs Mock Data
const communityMockTarget = `  useEffect(() => {
    if (activeTab === "Community") {
      setCommunityLoading(true);
      setTimeout(() => {
        const mockData = [
          { id: 1, title: "AI Basics", author: "An Nguyen", subject: "AI", file_type: "PDF", upload_date: "2026-05-30", downloads: 24, views: 105, isPinned: false },
          { id: 2, title: "Database Design", author: "Binh Tran", subject: "DBMS", file_type: "DOCX", upload_date: "2026-05-29", downloads: 12, views: 48, isPinned: false },
          { id: 3, title: "Machine Learning", author: "Nam Le", subject: "AI", file_type: "PDF", upload_date: "2026-05-28", downloads: 35, views: 189, isPinned: false },
          { id: 4, title: "Networking", author: "Hoa Tran", subject: "CCNA", file_type: "PDF", upload_date: "2026-05-27", downloads: 8, views: 32, isPinned: false },
          { id: 5, title: "Java OOP", author: "Minh Nguyen", subject: "Programming", file_type: "DOCX", upload_date: "2026-05-26", downloads: 19, views: 76, isPinned: false },
        ];

        const extendedData = [];
        for (let i = 0; i < 35; i++) {
          const originalDoc = mockData[i % mockData.length];
          extendedData.push({
            ...originalDoc,
            id: i + 1,
            title: \`\${originalDoc.title} (Vol \${Math.floor(i / mockData.length) + 1})\`
          });
        }
        setCommunityDocs(extendedData);
        setCommunityLoading(false);
      }, 500);
    }
  }, [activeTab]);`;

const communityMockReplacement = `  const fetchCommunityDocs = async () => {
    setCommunityLoading(true);
    try {
      const token = localStorage.getItem("token") || sessionStorage.getItem("token");
      const res = await fetch("http://localhost:5000/api/documents/community", {
        headers: { "Authorization": \`Bearer \${token}\` }
      });
      if (res.ok) {
        const data = await res.json();
        setCommunityDocs(data);
      }
    } catch (err) {
      console.error("Error fetching community documents:", err);
    } finally {
      setCommunityLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === "Community") {
      fetchCommunityDocs();
    }
  }, [activeTab]);`;
exactReplace(communityMockTarget, communityMockReplacement, "Community Fetch");

// 4. Update the filteredDocuments sort logic to actually apply sortConfig
const sortTarget = `  const filteredDocuments = documents.filter((doc) => {
    const matchesSearch = doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.subject_code.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesSubject = selectedSubjectFilter === "All" || doc.subject_code === selectedSubjectFilter;
    return matchesSearch && matchesSubject;
  });`;
const sortReplacement = `  const filteredDocuments = documents.filter((doc) => {
    const matchesSearch = doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.subject_code.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesSubject = selectedSubjectFilter === "All" || doc.subject_code === selectedSubjectFilter;
    return matchesSearch && matchesSubject;
  }).sort((a, b) => {
    if (sortConfig.key === "upload_date") {
      const dateA = new Date(a.upload_date).getTime();
      const dateB = new Date(b.upload_date).getTime();
      return sortConfig.direction === "desc" ? dateB - dateA : dateA - dateB;
    } else if (sortConfig.key === "file_size") {
      const sizeA = a.file_size || 0;
      const sizeB = b.file_size || 0;
      return sortConfig.direction === "desc" ? sizeB - sizeA : sizeA - sizeB;
    }
    return 0;
  });`;
exactReplace(sortTarget, sortReplacement, "Sort Logic");

// 5. Replace "Lọc theo" button area
const filtersTarget = `                {/* Filters */}
                <div className="flex bg-slate-100 dark:bg-[#151722] border border-slate-200 dark:border-slate-800 rounded-lg p-0.5">
                  {["All", "WED202c", "MAS291", "CSI104"].map((filter) => (
                    <button
                      key={filter}
                      onClick={() => setSelectedSubjectFilter(filter)}
                      className={\`px-3 py-1.5 rounded-md text-[10px] font-bold uppercase transition-all cursor-pointer \${selectedSubjectFilter === filter
                        ? "bg-white dark:bg-[#0c0d13] text-purple-700 dark:text-purple-450 border border-slate-200 dark:border-slate-800 shadow-sm"
                        : "text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
                        }\`}
                    >
                      {filter === "All" ? "Tất cả" : filter}
                    </button>
                  ))}
                </div>`;
const filtersReplacement = `                {/* Filters */}
                <div className="flex items-center gap-2 relative">
                  <span className="text-xs font-bold text-slate-500">Lọc theo:</span>
                  <div 
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowSortMenu(!showSortMenu);
                    }}
                    className="flex items-center gap-2 bg-slate-100 dark:bg-[#151722] hover:bg-slate-200 dark:hover:bg-slate-800/60 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-1.5 text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer transition-colors"
                  >
                    <span>
                      {sortConfig.key === "upload_date" && sortConfig.direction === "desc" && "Ngày tải lên (Mới nhất)"}
                      {sortConfig.key === "upload_date" && sortConfig.direction === "asc" && "Ngày tải lên (Cũ nhất)"}
                      {sortConfig.key === "file_size" && sortConfig.direction === "desc" && "Kích cỡ (Lớn nhất)"}
                      {sortConfig.key === "file_size" && sortConfig.direction === "asc" && "Kích cỡ (Nhỏ nhất)"}
                    </span>
                    <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                  </div>

                  {showSortMenu && (
                    <div 
                      onClick={(e) => e.stopPropagation()}
                      className="absolute right-0 top-10 w-48 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl shadow-[0_10px_30px_rgba(0,0,0,0.08)] z-30 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150 p-1 text-left"
                    >
                      {[
                        { label: "Ngày tải lên (Mới nhất)", key: "upload_date", direction: "desc" },
                        { label: "Ngày tải lên (Cũ nhất)", key: "upload_date", direction: "asc" },
                        { label: "Kích cỡ (Lớn nhất)", key: "file_size", direction: "desc" },
                        { label: "Kích cỡ (Nhỏ nhất)", key: "file_size", direction: "asc" }
                      ].map((option, idx) => (
                        <button
                          key={idx}
                          onClick={() => {
                            setSortConfig({ key: option.key, direction: option.direction });
                            setShowSortMenu(false);
                          }}
                          className={\`w-full flex items-center text-left px-3 py-2.5 text-xs font-medium rounded-md transition-colors \${
                            sortConfig.key === option.key && sortConfig.direction === option.direction 
                            ? "bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 font-bold" 
                            : "text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/60"
                          }\`}
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>`;
exactReplace(filtersTarget, filtersReplacement, "Filter UI");

// 6. Update Table Header with new columns
const tableHeaderRealTarget = `                        <th className="px-5 py-3.5">Tiêu đề học liệu</th>
                        <th className="px-5 py-3.5">Môn học</th>
                        <th className="px-5 py-3.5">Tác giả</th>
                        <th className="px-5 py-3.5 text-right">Tùy chọn</th>`;
const tableHeaderRealReplacement = `                        <th className="px-5 py-3.5">Tiêu đề học liệu</th>
                        <th className="px-5 py-3.5">Môn học</th>
                        <th className="px-5 py-3.5">Tác giả</th>
                        <th className="px-5 py-3.5">Ngày lưu trữ</th>
                        <th className="px-5 py-3.5">Dung lượng</th>
                        <th className="px-5 py-3.5 text-right">Tùy chọn</th>`;
if (content.includes(tableHeaderRealTarget)) {
  exactReplace(tableHeaderRealTarget, tableHeaderRealReplacement, "Table Header Columns");
}

const tablePulseTarget = `                            <td className="px-5 py-4"><div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-20" /></td>
                            <td className="px-5 py-4"><div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-6 ml-auto" /></td>`;
const tablePulseReplacement = `                            <td className="px-5 py-4"><div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-20" /></td>
                            <td className="px-5 py-4"><div className="h-3 bg-slate-200 dark:bg-slate-800 rounded w-24" /></td>
                            <td className="px-5 py-4"><div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-10" /></td>
                            <td className="px-5 py-4"><div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-6 ml-auto" /></td>`;
if (content.includes(tablePulseTarget)) {
  exactReplace(tablePulseTarget, tablePulseReplacement, "Table Pulse Loading");
}

const tableColspanTarget = `<td colSpan="4" className="px-5 py-8 text-center text-xs font-bold text-slate-400">`;
const tableColspanReplacement = `<td colSpan="6" className="px-5 py-8 text-center text-xs font-bold text-slate-400">`;
if (content.includes(tableColspanTarget)) {
  exactReplace(tableColspanTarget, tableColspanReplacement, "Table Colspan");
}

const tableRowTarget = `                            <td className="px-5 py-3.5 text-right">
                              <div className="flex items-center justify-end gap-1">`;
const tableRowReplacement = `                            <td className="px-5 py-3.5 font-bold">
                              {new Date(doc.upload_date).toLocaleDateString("vi-VN", {
                                month: "short",
                                day: "numeric",
                                year: "numeric"
                              })}
                            </td>
                            <td className="px-5 py-3.5 font-bold text-slate-500 dark:text-slate-400">{formatFileSize(doc.file_size)}</td>
                            <td className="px-5 py-3.5 text-right relative">
                              <div className="flex items-center justify-end gap-1">`;
if (content.includes(tableRowTarget)) {
  exactReplace(tableRowTarget, tableRowReplacement, "Table Row Columns");
}

// 7. Replace row options buttons with Dropdown
const optionsTarget = `                              <div className="flex items-center justify-end gap-1">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (doc.file_url) {
                                      const link = document.createElement("a");
                                      link.href = doc.file_url + "?download=";
                                      link.download = doc.title || "download";
                                      document.body.appendChild(link);
                                      link.click();
                                      document.body.removeChild(link);
                                    } else {
                                      toast.error("Không tìm thấy đường dẫn tải xuống!");
                                    }
                                  }}
                                  className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-purple-600 transition-colors cursor-pointer"
                                  title="Tải xuống"
                                >
                                  <Download className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={(e) => handleDeleteDocument(doc.document_id, e)}
                                  className="p-1 rounded hover:bg-red-50 dark:hover:bg-red-950/20 text-slate-400 hover:text-red-650 transition-colors cursor-pointer"
                                  title="Xóa vĩnh viễn"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>`;
const optionsReplacement = `                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setOpenMenuId(openMenuId === doc.document_id ? null : doc.document_id);
                                }}
                                className="w-7 h-7 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-purple-600 flex items-center justify-center transition-colors font-bold ml-auto relative"
                              >
                                ⋯
                              </button>

                              {openMenuId === doc.document_id && (
                                <div 
                                  onClick={(e) => e.stopPropagation()}
                                  className="absolute right-5 top-10 w-36 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl shadow-[0_10px_30px_rgba(0,0,0,0.08)] z-30 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150 p-1 text-left"
                                >
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setOpenMenuId(null);
                                        setPreviewDoc(doc);
                                      }}
                                      className="w-full flex items-center gap-2 text-left px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/60 rounded-md transition-colors"
                                    >
                                      <BookOpenIcon className="w-4 h-4 text-slate-400" />
                                      Xem trước
                                    </button>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setOpenMenuId(null);
                                        if (doc.file_url) {
                                          const link = document.createElement("a");
                                          link.href = doc.file_url + "?download=";
                                          link.download = doc.title || "download";
                                          document.body.appendChild(link);
                                          link.click();
                                          document.body.removeChild(link);
                                        } else {
                                          toast.error("Không tìm thấy đường dẫn tải xuống!");
                                        }
                                      }}
                                      className="w-full flex items-center gap-2 text-left px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/60 rounded-md transition-colors"
                                    >
                                      <Download className="w-4 h-4 text-slate-400" />
                                      Tải xuống
                                    </button>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setOpenMenuId(null);
                                        setShareModalDoc(doc);
                                        setShareDescription(doc.description || "");
                                      }}
                                      className="w-full flex items-center gap-2 text-left px-3 py-2 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/60 rounded-md transition-colors"
                                    >
                                      <Share2 className="w-4 h-4 text-slate-400" />
                                      Chia sẻ
                                    </button>
                                    <div className="h-px bg-slate-100 dark:bg-slate-800/60 my-1" />
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setOpenMenuId(null);
                                        handleDeleteDocument(doc.document_id, e);
                                      }}
                                      className="w-full flex items-center gap-2 text-left px-3 py-2 text-xs font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-md transition-colors"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                      Gỡ bỏ
                                    </button>
                                  </div>
                              )}`;
exactReplace(optionsTarget, optionsReplacement, "Row Options Dropdown");

// 8. Add Modals at end of file
const footerTarget = `      )}
    </div>
  );
}`;

const footerReplacement = `      )}

      {/* Premium Share Modal */}
      {shareModalDoc && (
        <div className="fixed inset-0 bg-slate-900/60 dark:bg-black/70 backdrop-blur-md flex items-center justify-center z-[9999] animate-in fade-in duration-200" onClick={() => !isSharing && setShareModalDoc(null)}>
          <div className="w-full max-w-md p-6 bg-white/95 dark:bg-[#0f111a]/95 border border-slate-200/50 dark:border-white/10 rounded-2xl shadow-2xl flex flex-col gap-4 animate-in zoom-in-95 duration-200" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-full bg-purple-100 dark:bg-purple-950/40 text-purple-650 dark:text-purple-400 flex items-center justify-center border border-purple-500/10">
                <Share2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">Chia sẻ lên cộng đồng</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">Mọi người sẽ có thể xem và tải tài liệu này</p>
              </div>
            </div>
            
            <div className="flex flex-col gap-1.5">
              <p className="text-xs text-slate-600 dark:text-slate-300">
                Tài liệu: <span className="font-bold text-slate-900 dark:text-white">{shareModalDoc.title}</span>
              </p>
              <textarea
                value={shareDescription}
                onChange={(e) => setShareDescription(e.target.value)}
                placeholder="Nhập mô tả tài liệu (tùy chọn nhưng khuyến khích)..."
                className="w-full mt-2 p-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 rounded-xl outline-none focus:ring-2 focus:ring-purple-500/50 text-sm min-h-[100px] resize-none text-slate-800 dark:text-slate-200 placeholder:text-slate-400"
              />
            </div>
            
            <div className="flex gap-3 mt-4">
              <button
                type="button"
                onClick={() => !isSharing && setShareModalDoc(null)}
                disabled={isSharing}
                className="flex-1 px-4 py-2.5 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-350 hover:bg-slate-50 dark:hover:bg-slate-850 font-bold text-xs cursor-pointer select-none transition-colors"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={async () => {
                  setIsSharing(true);
                  try {
                    const token = localStorage.getItem("token") || sessionStorage.getItem("token");
                    const res = await fetch(\`http://localhost:5000/api/documents/\${shareModalDoc.document_id}/share\`, {
                      method: "PUT",
                      headers: { 
                        "Authorization": \`Bearer \${token}\`,
                        "Content-Type": "application/json"
                      },
                      body: JSON.stringify({ description: shareDescription })
                    });
                    if (!res.ok) throw new Error("Failed");
                    toast.success("Đã chia sẻ tài liệu lên cộng đồng thành công!");
                    setShareModalDoc(null);
                    window.location.reload(); 
                  } catch (err) {
                    toast.error("Lỗi khi chia sẻ tài liệu");
                  } finally {
                    setIsSharing(false);
                  }
                }}
                disabled={isSharing}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-purple-600 hover:bg-purple-700 text-white border border-transparent font-bold text-xs cursor-pointer select-none shadow-sm transition-all duration-300 disabled:opacity-70"
              >
                {isSharing ? "Đang chia sẻ..." : (
                  <><Share2 className="w-4 h-4" /> Chia sẻ ngay</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Document Preview Modal */}
      {previewDoc && (
        <DocumentPreviewModal
          doc={previewDoc}
          onClose={() => setPreviewDoc(null)}
        />
      )}
    </div>
  );
}`;
exactReplace(footerTarget, footerReplacement, "Modals");

fs.writeFileSync('frontend/src/components/Home.jsx', content);
console.log("ALL DONE!");
