const fs = require('fs');
const path = 'd:/AIStudyHub/frontend/src/components/Home.jsx';
let content = fs.readFileSync(path, 'utf8');

let changed = false;

// 1. Fix loading text "AI đang phân loại chủ đề..." -> "Đang tải chủ đề..."
const loadingRegex = />AI [^<]*ph[^<]*lo[^<]*ch[^<]*[ủu][^<]* [dđ][^<]*[eê][^<]*[\.\.\.]+</;
if(loadingRegex.test(content)) {
    content = content.replace(loadingRegex, '>Đang tải chủ đề...<');
    console.log('Replaced loading text');
    changed = true;
}

// 2. Remove "Tạo chủ đề bằng AI ngay" button in the empty state
const aiButtonRegex = /\s*<button onClick=\{regenerateCommunityTopics\}[^>]*>\s*<RefreshCw[^\/]*\/> T[^<]*AI[^<]*<\/button>/g;
if(aiButtonRegex.test(content)) {
    content = content.replace(aiButtonRegex, '');
    console.log('Removed AI regenerate button');
    changed = true;
}

// 3. Remove TOPIC_PALETTE const inside the IIFE
const paletteRegex = /const TOPIC_PALETTE = \[[\s\S]*?\];\s*\n/g;
if(paletteRegex.test(content)) {
    content = content.replace(paletteRegex, '');
    console.log('Removed TOPIC_PALETTE');
    changed = true;
}

if(changed) {
    fs.writeFileSync(path, content);
    console.log('Home.jsx successfully patched');
} else {
    console.log('No changes needed or patterns not found');
}
