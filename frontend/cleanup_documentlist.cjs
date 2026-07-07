const fs = require('fs');

const path = 'd:/AIStudyHub/frontend/src/pages/DocumentList.jsx';
let content = fs.readFileSync(path, 'utf8');

// 1. Rename Chủ đề (AI) to Chủ đề
content = content.replace('{ id: "TOPIC",    label: "Chủ đề (AI)", icon: Layers   }', '{ id: "TOPIC",    label: "Chủ đề", icon: Layers   }');

// 2. Remove "AI đang phân loại chủ đề..."
content = content.replace('AI đang phân loại chủ đề...', 'Đang tải chủ đề...');

// 3. Remove "Tạo chủ đề bằng AI ngay" button
content = content.replace('<button onClick={regenerateTopics} className="mt-3 text-xs text-violet-600 dark:text-violet-400 font-bold hover:underline cursor-pointer">Tạo chủ đề bằng AI ngay</button>', '');

// 4. Remove the Regenerate button at the top
const regenBtnStr = `{viewMode === "TOPIC" && !selectedTopic && (
                  <button
                    onClick={regenerateTopics}
                    title="AI tạo lại chủ đề"
                    className="text-[10px] font-bold text-violet-500 dark:text-violet-400 hover:text-violet-700 dark:hover:text-violet-200 px-2 py-1 rounded-lg hover:bg-violet-50 dark:hover:bg-violet-950/30 transition-colors cursor-pointer flex items-center gap-1"
                  >
                    <RefreshCw size={11} /> Tạo lại
                  </button>
                )}`;
content = content.replace(regenBtnStr, '');

fs.writeFileSync(path, content);
console.log('DocumentList.jsx cleaned up');
