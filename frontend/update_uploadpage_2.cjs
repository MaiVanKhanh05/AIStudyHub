const fs = require('fs');

const path = 'd:/AIStudyHub/frontend/src/pages/UploadPage.jsx';
let content = fs.readFileSync(path, 'utf8');

// Find the exact Subject / Folder section
const regex = /<label className="block text-xs font-black text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-1\.5">[\s\S]*?<\/div>/g;

let matches = [...content.matchAll(regex)];

if (matches.length > 0) {
  // Replace the first match inside the JSX which is the Subject / Folder part
  const oldText = matches.find(m => m[0].includes('<SubjectSelector'))[0];
  if (oldText) {
    const newText = `<label className="block text-xs font-black text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-1.5">
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
                </p>
              </div>`;
              
    content = content.replace(oldText, newText);
    
    // Also remove the SubjectSelector function entirely
    const funcRegex = /function SubjectSelector\(\{[\s\S]*?\}\s*\)\s*\{[\s\S]*?\n\s*\}/m;
    content = content.replace(funcRegex, '');
    
    fs.writeFileSync(path, content);
    console.log('UploadPage.jsx successfully updated');
  } else {
    console.log('Could not find SubjectSelector in JSX');
  }
} else {
  console.log('Could not find match');
}
