const fs = require('fs');
const path = 'd:/AIStudyHub/frontend/src/pages/DocumentList.jsx';
let content = fs.readFileSync(path, 'utf8');

// Replace TOPIC_PALETTE and its usage.
const regex = /const TOPIC_PALETTE = \[[\s\S]*?\];/;
content = content.replace(regex, `// Use topic.color from DB instead of PALETTE`);

const topicFoldersRegex = /const c = TOPIC_PALETTE\[i % TOPIC_PALETTE\.length\];[\s\S]*?<div className=\{`w-12 h-12 rounded-xl bg-gradient-to-br \$\{c\.bg\} flex items-center justify-center mb-3 group-hover:scale-110 transition-transform duration-300 shadow-sm`\}>[\s\S]*?<Folder size=\{22\} className="text-white" \/>[\s\S]*?<\/div>[\s\S]*?<h3 className="font-black text-slate-800 dark:text-slate-100 text-center text-sm leading-tight group-hover:text-violet-700 dark:group-hover:text-violet-300 transition-colors line-clamp-2 px-1">\{displayName\}<\/h3>[\s\S]*?\{folder\.name !== displayName && <span className=\{`mt-1\.5 px-2 py-0\.5 rounded-full text-\[9px\] font-black \$\{c\.badge\}`\}>\{folder\.name\}<\/span>\}/g;

const renderTopicViewStr = content.substring(content.indexOf('const renderTopicView = () => {'), content.indexOf('const renderFolderGrid = () => ('));

// I will just rewrite the `renderTopicView` string and replace it.
const newRenderTopicView = `  const renderTopicView = () => {
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
                  style={{ '--hover-color': \`\${topicColor}30\` }}
                >
                  <div className="absolute inset-0 transition-opacity opacity-0 group-hover:opacity-100" style={{ backgroundImage: \`linear-gradient(to bottom right, \${topicColor}15, transparent)\` }} />
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-3 group-hover:scale-110 transition-transform duration-300 shadow-sm border" style={{ backgroundColor: \`\${topicColor}15\`, borderColor: \`\${topicColor}30\`, color: topicColor }}>
                    <Folder size={22} />
                  </div>
                  <h3 className="font-black text-slate-800 dark:text-slate-100 text-center text-sm leading-tight transition-colors line-clamp-2 px-1" style={{ color: 'inherit' }}>{displayName}</h3>
                  {folder.name !== displayName && <span className="mt-1.5 px-2 py-0.5 rounded-full text-[9px] font-black" style={{ backgroundColor: \`\${topicColor}15\`, color: topicColor }}>{folder.name}</span>}
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
              <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl shrink-0 shadow-sm group-hover:scale-105 transition-transform border" style={{ backgroundColor: \`\${topicColor}15\`, borderColor: \`\${topicColor}30\`, color: topicColor }}>
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
                      style={{ backgroundColor: \`\${topicColor}15\`, color: topicColor }}
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
`;

content = content.replace(renderTopicViewStr, newRenderTopicView);

fs.writeFileSync(path, content);
console.log('DocumentList.jsx successfully updated');
