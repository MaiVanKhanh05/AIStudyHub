const fs = require('fs');

const path = 'd:/AIStudyHub/frontend/src/pages/UploadPage.jsx';
let content = fs.readFileSync(path, 'utf8');

// 1. Remove SubjectSelector function definition
const startIdx = content.indexOf('function SubjectSelector({');
if (startIdx !== -1) {
  let endIdx = content.indexOf('// ── Main Page', startIdx);
  if (endIdx === -1) {
    endIdx = content.indexOf('export default function UploadPage()');
  }
  
  if (endIdx !== -1) {
    content = content.substring(0, startIdx) + content.substring(endIdx);
  }
}

// 2. Replace SubjectSelector usage with strict select
const subjectTarget = `<label className="block text-xs font-black text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                  Danh mục / Môn học
                </label>
                <SubjectSelector
                  subjectCode={subjectCode}
                  subjectName={subjectName}
                  onChange={(code, name) => { setSubjectCode(code); setSubjectName(name); }}
                  topicSubjects={topicSubjects}
                />
                <p className="text-[10px] text-slate-400 mt-1.5 flex items-center gap-1">
                  <FolderPlus className="w-3 h-3" />
                  Chọn môn học có sẵn hoặc gõ tên mới để tạo danh mục — tài liệu sẽ được nhóm vào đây
                </p>`;

// I will just use regex to replace the whole Subject / Folder div contents.
const newSubjectHTML = `<label className="block text-xs font-black text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                  Danh mục / Môn học
                </label>
                <select
                  value={subjectCode}
                  onChange={e => {
                    const code = e.target.value;
                    let name = "";
                    if (code && topicSubjects) {
                      const subj = topicSubjects.find(s => s.subject_code === code);
                      if (subj) name = subj.subject_name;
                    }
                    setSubjectCode(code);
                    setSubjectName(name);
                  }}
                  disabled={!selectedTopicId}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200/80 dark:border-white/10 bg-white/80 dark:bg-[#0c0d13]/80 text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-500/60 transition-all appearance-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <option value="">{selectedTopicId ? "-- Chọn Môn học --" : "-- Vui lòng chọn Chủ đề trước --"}</option>
                  {(topicSubjects || []).map(s => (
                    <option key={s.subject_code} value={s.subject_code}>{s.subject_code} - {s.subject_name}</option>
                  ))}
                </select>
                <p className="text-[10px] text-slate-400 mt-1.5 flex items-center gap-1">
                  <FolderPlus className="w-3 h-3" />
                  Tài liệu sẽ được nhóm vào môn học này
                </p>`;

content = content.replace(/<label className="block text-xs font-black text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-1\.5">\s*Danh m(ụ|)c \/ M(ô|')n h(ọ|)\?c\s*<\/label>[\s\S]*?(?=<\/div>)/m, newSubjectHTML);

// 3. Make Topic Selection mandatory
const topicTarget = `<option value="">-- Tất cả môn học (Không chọn Chủ đề) --</option>`;
content = content.replace(topicTarget, `<option value="">-- Vui lòng chọn Chủ đề --</option>`);

// Fix upload button requirement
content = content.replace('!files.length || uploading || !documentTitle.trim()', '!files.length || uploading || !documentTitle.trim() || !selectedTopicId || !subjectCode');

fs.writeFileSync(path, content);
console.log('UploadPage.jsx updated');
