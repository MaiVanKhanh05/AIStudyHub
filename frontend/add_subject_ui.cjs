const fs = require('fs');

const path = 'd:/AIStudyHub/frontend/src/pages/admin/AdminTopicManagement.jsx';
let content = fs.readFileSync(path, 'utf8');

// 1. Add states
const statesToAdd = `  const [showAddSubject, setShowAddSubject] = useState(false);
  const [newSubjectCode, setNewSubjectCode] = useState("");
  const [newSubjectName, setNewSubjectName] = useState("");
  const [isAddingSubject, setIsAddingSubject] = useState(false);`;

content = content.replace('const [subjectSearch, setSubjectSearch] = useState("");', 'const [subjectSearch, setSubjectSearch] = useState("");\n' + statesToAdd);

// 2. Add handleCreateSubject function
const funcToAdd = `
  const handleCreateSubject = async () => {
    if (!newSubjectCode || !newSubjectName) {
      showToast("Vui lòng nhập đầy đủ mã môn và mô tả", "error");
      return;
    }
    setIsAddingSubject(true);
    try {
      const token = localStorage.getItem("token") || sessionStorage.getItem("token");
      const res = await fetch("http://localhost:5000/api/subjects", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": \`Bearer \${token}\` },
        body: JSON.stringify({ subject_code: newSubjectCode, subject_name: newSubjectName })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Lỗi khi thêm môn học");
      
      const newSubj = { subject_code: data.subject_code, subject_name: data.subject_name };
      setSubjects(prev => [...prev, newSubj].sort((a, b) => a.subject_code.localeCompare(b.subject_code)));
      setFormData(prev => ({ ...prev, subjects: [...prev.subjects, data.subject_code] }));
      
      setShowAddSubject(false);
      setNewSubjectCode("");
      setNewSubjectName("");
      showToast("Đã thêm môn học thành công!");
    } catch (err) {
      showToast(err.message, "error");
    } finally {
      setIsAddingSubject(false);
    }
  };
`;
content = content.replace('const handleSubmit = async (e) => {', funcToAdd + '\n  const handleSubmit = async (e) => {');

// 3. Add UI
const uiToAdd = `
                <div className="flex items-center justify-between">
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
                </div>

                {showAddSubject && (
                  <div className="bg-emerald-50 border border-emerald-100 p-3 rounded-xl flex flex-col gap-2 animate-in slide-in-from-top-2">
                    <div className="flex gap-2">
                      <input 
                        type="text" 
                        placeholder="Mã môn (VD: CS101)" 
                        value={newSubjectCode}
                        onChange={e => setNewSubjectCode(e.target.value)}
                        className="w-1/3 px-3 py-1.5 text-sm border border-slate-200 rounded-lg focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
                      />
                      <input 
                        type="text" 
                        placeholder="Mô tả / Tên môn học" 
                        value={newSubjectName}
                        onChange={e => setNewSubjectName(e.target.value)}
                        className="flex-1 px-3 py-1.5 text-sm border border-slate-200 rounded-lg focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
                      />
                    </div>
                    <div className="flex justify-end gap-2">
                      <button type="button" onClick={() => setShowAddSubject(false)} className="px-3 py-1.5 text-xs font-medium text-slate-500 hover:bg-slate-200 rounded-lg">Hủy</button>
                      <button type="button" onClick={handleCreateSubject} disabled={isAddingSubject} className="px-4 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm disabled:opacity-50">
                        {isAddingSubject ? "Đang thêm..." : "Lưu môn học"}
                      </button>
                    </div>
                  </div>
                )}
`;

const replaceTarget = `<div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Môn học ({formData.subjects.length} đã chọn)</label>
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
                </div>`;

content = content.replace(replaceTarget, uiToAdd);

fs.writeFileSync(path, content);
console.log('AdminTopicManagement updated');
