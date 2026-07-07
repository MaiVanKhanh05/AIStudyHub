const fs = require('fs');

const path = 'd:/AIStudyHub/frontend/src/pages/admin/AdminTopicManagement.jsx';
let content = fs.readFileSync(path, 'utf8');

// 1. Add state
const stateToAdd = `  const [isSubjectModalOpen, setIsSubjectModalOpen] = useState(false);`;
content = content.replace('const [showAddSubject, setShowAddSubject] = useState(false);', stateToAdd + '\n  const [showAddSubject, setShowAddSubject] = useState(false);');

// 2. Add handleStandaloneCreateSubject function
const funcToAdd = `
  const handleStandaloneCreateSubject = async (e) => {
    e.preventDefault();
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
      
      setIsSubjectModalOpen(false);
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
content = content.replace('const handleCreateSubject = async () => {', funcToAdd + '\n  const handleCreateSubject = async () => {');

// 3. Add button next to "Thêm Chủ đề"
const buttonTarget = `<button 
          onClick={() => handleOpenModal()}
          className="flex items-center gap-2 px-4 py-2.5 bg-violet-600 hover:bg-violet-700 text-white rounded-lg font-bold transition-all shadow-sm active:scale-95"
        >`;

const newButtons = `<div className="flex gap-3">
          <button 
            onClick={() => setIsSubjectModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold transition-all shadow-sm active:scale-95"
          >
            <Plus size={18} /> Thêm Mã Môn
          </button>
          <button 
            onClick={() => handleOpenModal()}
            className="flex items-center gap-2 px-4 py-2.5 bg-violet-600 hover:bg-violet-700 text-white rounded-lg font-bold transition-all shadow-sm active:scale-95"
          >`;
content = content.replace(buttonTarget, newButtons);
content = content.replace(/<\/button>\s*<\/div>\s*\{loading \? \(/, '</button>\n        </div>\n      </div>\n\n      {loading ? (');

// 4. Add standalone subject modal
const modalToAdd = `
      {isSubjectModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-[60]">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h2 className="text-lg font-extrabold text-slate-800 flex items-center gap-2">
                <BookOpen size={20} className="text-emerald-500" />
                Thêm Mã Môn Mới
              </h2>
              <button onClick={() => setIsSubjectModalOpen(false)} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
            </div>
            
            <form onSubmit={handleStandaloneCreateSubject} className="p-5 space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Mã môn học</label>
                <input 
                  type="text" 
                  value={newSubjectCode}
                  onChange={e => setNewSubjectCode(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all text-sm uppercase" 
                  placeholder="VD: PRJ301" 
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Mô tả / Tên môn học</label>
                <input 
                  type="text" 
                  value={newSubjectName}
                  onChange={e => setNewSubjectName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all text-sm" 
                  placeholder="VD: Lập trình Java Web" 
                />
              </div>
            </form>

            <div className="p-4 border-t border-slate-100 flex justify-end gap-3 bg-slate-50">
              <button type="button" onClick={() => setIsSubjectModalOpen(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-200 rounded-lg font-medium text-sm transition-colors">Hủy</button>
              <button onClick={handleStandaloneCreateSubject} disabled={isAddingSubject} className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-sm shadow-sm transition-all active:scale-95 disabled:opacity-50">
                {isAddingSubject ? "Đang thêm..." : "Lưu môn học"}
              </button>
            </div>
          </div>
        </div>
      )}
`;

content = content.replace('return (', 'return (\n    <>\n');
content = content.replace(/(?<=<\/div>\s*)$/, '\n      ' + modalToAdd + '\n    </>\n'); // append at end before export if needed. Wait, it's safer to append just before the final </div> of the component.
// Instead of replacing the end, let's insert it right after the main topic modal.
content = content.replace('</div>\n        </div>\n      )}\n    </div>\n  );\n}', '</div>\n        </div>\n      )}\n' + modalToAdd + '\n    </div>\n  );\n}');

fs.writeFileSync(path, content);
console.log('AdminTopicManagement updated with standalone subject button');
