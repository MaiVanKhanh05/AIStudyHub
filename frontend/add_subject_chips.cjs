const fs = require('fs');

const path = 'd:/AIStudyHub/frontend/src/pages/admin/AdminTopicManagement.jsx';
let content = fs.readFileSync(path, 'utf8');

const target = `<div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Môn học ({formData.subjects.length} đã chọn)</label>
                  <div className="flex gap-2">
                    <button 
                      type="button"
                      onClick={() => setShowAddSubject(!showAddSubject)}
                      className="px-3 py-1.5 text-xs font-semibold bg-emerald-100 text-emerald-700 hover:bg-emerald-200 rounded-md transition-colors flex items-center gap-1"
                    >
                      <Plus size={14} /> Thêm môn
                    </button>
                    <div className="relative w-48">
                      <Search className="absolute left-2.5 top-1.5 text-slate-400 w-4 h-4" />
                      <input 
                        type="text" 
                        placeholder="Tìm kiếm môn học..."
                        value={subjectSearch}
                        onChange={e => setSubjectSearch(e.target.value)}
                        className="w-full pl-8 pr-3 py-1 text-sm border border-slate-200 rounded-md focus:ring-1 focus:ring-violet-500 focus:border-violet-500 outline-none"
                      />
                    </div>
                  </div>
                </div>`;

const addition = `
                {formData.subjects.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {formData.subjects.map(code => {
                      const s = subjects.find(sub => sub.subject_code === code);
                      return (
                        <span key={code} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-violet-50 border border-violet-200 text-violet-700 text-xs font-medium">
                          <span className="font-bold">{code}</span>
                          <span className="text-violet-500/50">|</span>
                          <span className="truncate max-w-[120px]" title={s?.subject_name || ""}>{s?.subject_name || ""}</span>
                          <button type="button" onClick={() => toggleSubject(code)} className="ml-1 p-0.5 hover:bg-violet-200 rounded-full text-violet-500 hover:text-violet-800 transition-colors">
                            <X size={12} />
                          </button>
                        </span>
                      );
                    })}
                  </div>
                )}
`;

content = content.replace(target, target + addition);

fs.writeFileSync(path, content);
console.log('AdminTopicManagement updated with subject chips');
