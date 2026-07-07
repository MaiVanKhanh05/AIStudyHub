const fs = require('fs');
const path = 'd:/AIStudyHub/frontend/src/components/Home.jsx';
let content = fs.readFileSync(path, 'utf8');

const targetStr = `                          {communityTopics.map((topic, idx) => {
                            const pal = TOPIC_PALETTE[idx % TOPIC_PALETTE.length];
                            const totalDocs = (topic.subjects || []).reduce((s, sub) => s + (Number(sub.doc_count) || 0), 0);
                            return (
                              <div
                                key={topic.topic_id}
                                className="flex items-center gap-5 px-5 py-4 hover:bg-white/80 dark:hover:bg-white/10 transition-colors group"
                              >
                                {/* Icon */}
                                <div className={\`w-12 h-12 rounded-xl bg-gradient-to-br \$\{pal.bg\} flex items-center justify-center text-2xl shrink-0 shadow-sm group-hover:scale-105 transition-transform\`}>
                                  {topic.icon || "📚"}
                                </div>

                                {/* Left: name + description + subject badges */}
                                <div className="flex-1 min-w-0">
                                  <p className="font-black text-slate-800 dark:text-slate-100 text-sm">{topic.name}</p>
                                  {topic.description && <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5 truncate">{topic.description}</p>}
                                  <div className="flex flex-wrap gap-1.5 mt-2">
                                    {(topic.subjects || []).map(s => (
                                      <button
                                        key={s.subject_code}
                                        onClick={() => { setSelectedCommunityTopicId(topic.topic_id); setSelectedCommunitySubjectCode(s.subject_code); setCommunityPage(1); }}
                                        className={\`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold \$\{pal.badge\} cursor-pointer hover:opacity-80 hover:shadow-sm active:scale-95 transition-all\`}
                                      >
                                        <Folder size={10} /> {s.subject_code}
                                      </button>
                                    ))}
                                  </div>
                                </div>

                                {/* Right: stats */}
                                <div className="shrink-0 flex gap-5 text-center">
                                  <div>
                                    <p className="text-base font-black text-violet-600 dark:text-violet-400">{(topic.subjects || []).length}</p>
                                    <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Môn học</p>
                                  </div>
                                  <div>
                                    <p className="text-base font-black text-violet-600 dark:text-violet-400">{totalDocs}</p>
                                    <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Tài liệu</p>
                                  </div>
                                </div>
                              </div>
                            );
                          })}`;

const newStr = `                          {communityTopics.map((topic) => {
                            const topicColor = topic.color || '#8b5cf6';
                            const totalDocs = (topic.subjects || []).reduce((s, sub) => s + (Number(sub.doc_count) || 0), 0);
                            return (
                              <div
                                key={topic.topic_id}
                                className="flex items-center gap-5 px-5 py-4 hover:bg-white/80 dark:hover:bg-white/10 transition-colors group"
                              >
                                {/* Icon */}
                                <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 shadow-sm group-hover:scale-105 transition-transform border" style={{ backgroundColor: \`\${topicColor}15\`, borderColor: \`\${topicColor}30\`, color: topicColor }}>
                                  <Folder size={24} />
                                </div>

                                {/* Left: name + description + subject badges */}
                                <div className="flex-1 min-w-0">
                                  <p className="font-black text-slate-800 dark:text-slate-100 text-sm transition-colors" style={{ color: topicColor }}>{topic.name}</p>
                                  {topic.description && <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5 truncate">{topic.description}</p>}
                                  <div className="flex flex-wrap gap-1.5 mt-2">
                                    {(topic.subjects || []).map(s => (
                                      <button
                                        key={s.subject_code}
                                        onClick={() => { setSelectedCommunityTopicId(topic.topic_id); setSelectedCommunitySubjectCode(s.subject_code); setCommunityPage(1); }}
                                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold cursor-pointer hover:opacity-80 hover:shadow-sm active:scale-95 transition-all"
                                        style={{ backgroundColor: \`\${topicColor}15\`, color: topicColor }}
                                      >
                                        <Folder size={10} /> {s.subject_code}
                                      </button>
                                    ))}
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
                              </div>
                            );
                          })}`;

if (content.includes(targetStr)) {
  content = content.replace(targetStr, newStr);
  console.log('Successfully replaced topics render.');
} else {
  console.log('Target string not found, falling back to regex.');
  // Fallback regex if formatting slightly differs
  const regex = /\{communityTopics\.map\(\(topic, idx\) => \{[\s\S]*?\{totalDocs\}<\/p>\s*<p className="text-\[9px\] font-black uppercase tracking-widest text-slate-400">Tài liệu<\/p>\s*<\/div>\s*<\/div>\s*<\/div>\s*\);\s*\}\)\}/m;
  if(regex.test(content)) {
      content = content.replace(regex, newStr);
      console.log('Successfully replaced topics render using regex.');
  } else {
      console.log('Failed to find topics render via regex too.');
  }
}

// Remove the "Làm mới AI Topics" button
const btnRegex = /\{\/\* Force regenerate button at bottom \*\/\}[\s\S]*?Làm mới AI Topics\s*<\/button>\s*<\/div>/g;
content = content.replace(btnRegex, '');

fs.writeFileSync(path, content);
console.log('Home.jsx updated (replaced topic UI)');
