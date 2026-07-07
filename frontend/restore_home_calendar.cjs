const fs = require('fs');
const path = 'd:/AIStudyHub/frontend/src/components/Home.jsx';
let content = fs.readFileSync(path, 'utf8');

// The broken section starts at the incomplete className template literal
const brokenTarget = `                              className={\`
                                 h-8 text-xs font-semibold rounded-lg flex items-center justify-center transition-all select-none cursor-pointer
                                 \${boundary
              ) : (
                /* Layout: Document List takes full width */`;

const fixedReplacement = `                              className={\`
                                h-8 text-xs font-semibold rounded-lg flex items-center justify-center transition-all select-none cursor-pointer
                                \${boundary
                                  ? "bg-purple-600 text-white shadow-md shadow-purple-500/20 hover:bg-purple-700"
                                  : selected
                                    ? "bg-purple-100 dark:bg-purple-900/35 text-purple-700 dark:text-purple-300 font-bold hover:bg-purple-200 dark:hover:bg-purple-900/50"
                                    : "text-slate-700 dark:text-slate-350 hover:bg-slate-100 dark:hover:bg-slate-800"
                                }
                              \`}
                            >
                              {cellDay}
                            </button>
                          );
                        })}
                      </div>

                      {/* Footer */}
                      <div className="mt-4 pt-3 border-t border-slate-150 dark:border-slate-800 flex items-center justify-between">
                        <span className="text-[9px] text-slate-450 dark:text-slate-500 font-medium italic">
                          Kéo chuột để chọn nhiều ngày
                        </span>
                        <button
                          onClick={() => {
                            setRangeStart(null);
                            setRangeEnd(null);
                          }}
                          className="text-[10px] font-bold text-red-500 hover:underline cursor-pointer"
                        >
                          Đặt lại
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>



              {/* ── View Mode Selector & Back Button ── */}
              <div className="flex items-center justify-between mb-4 mt-2">
                <div className="flex items-center gap-1">
                  {/* Toggle buttons removed as requested by user */}
                </div>

                {/* Back button when inside a subject */}
                {selectedCommunitySubjectCode && (
                  <button
                    onClick={() => { setSelectedCommunitySubjectCode(null); setCommunityPage(1); }}
                    className="flex items-center gap-1 text-[11px] font-bold text-violet-600 bg-violet-50 hover:bg-violet-100 px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer mr-1"
                  >
                    <ChevronLeft size={14} /> Quay lại
                  </button>
                )}
              </div>

              {/* Loading & Grid/Topic Section */}
              {communityLoading ? (
                <div className="flex flex-col justify-center items-center py-20 space-y-4">
                  <div className="w-8 h-8 border-4 border-purple-500/20 border-t-purple-600 rounded-full animate-spin" />
                  <span className="text-xs font-bold text-slate-400 dark:text-slate-500 tracking-wider uppercase animate-pulse">
                    Đang tải danh mục cộng đồng...
                  </span>
                </div>
              ) : (
                /* Layout: Document List takes full width */`;

if (content.includes(brokenTarget)) {
  content = content.replace(brokenTarget, fixedReplacement);
  fs.writeFileSync(path, content);
  console.log('Home.jsx successfully restored!');
} else {
  console.log('Broken target not found, trying with trimmed whitespace...');
  // Try a simpler pattern
  const brokenSimple = `\${boundary\n              ) : (`;
  const idx = content.indexOf('${boundary\n              ) : (');
  if(idx !== -1) {
    console.log('Found at idx:', idx);
  } else {
    // Find the broken section by line pattern
    const lines = content.split('\n');
    for(let i=0; i<lines.length; i++) {
      if(lines[i].includes('${boundary') && lines[i+1] && lines[i+1].includes(') : (') && lines[i+2] && lines[i+2].includes('Layout: Document')) {
        console.log('Found broken section at line', i+1);
        break;
      }
    }
  }
}
