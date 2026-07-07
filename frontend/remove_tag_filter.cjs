const fs = require('fs');
const path = 'd:/AIStudyHub/frontend/src/components/Home.jsx';
let content = fs.readFileSync(path, 'utf8');

const startTag = '{/* ── Tag filter chips (Community) ── */}';
const endTagStr = '                  </div>\n                );\n              })()}';

const startIdx = content.indexOf(startTag);
if (startIdx !== -1) {
  // Find the exact end.
  const regex = /\{\/\* ── Tag filter chips \(Community\) ── \*\/\}[\s\S]*?Bỏ lọc\s*<\/button>\s*\)\}\s*<\/div>\s*\);\s*\}\)\(\)\}/m;
  content = content.replace(regex, '');
  fs.writeFileSync(path, content);
  console.log('Home.jsx updated (removed tag filter chips)');
} else {
  console.log('Tag filter chips block not found. Checking alternate encoding...');
  // It might use weird encoding for the comments. Let's use a broader regex.
  const broadRegex = /\{\/\* [^\n]*Tag filter chips \(Community\)[^\n]*\*\/\}[\s\S]*?Bỏ lọc\s*<\/button>\s*\)\}\s*<\/div>\s*\);\s*\}\)\(\)\}/m;
  content = content.replace(broadRegex, '');
  fs.writeFileSync(path, content);
  console.log('Home.jsx updated with broad regex');
}
