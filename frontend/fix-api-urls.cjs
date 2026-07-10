const fs = require('fs');
const path = require('path');

function getFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const stat = fs.statSync(path.join(dir, file));
    if (stat.isDirectory()) {
      getFiles(path.join(dir, file), fileList);
    } else if (file.endsWith('.js') || file.endsWith('.jsx')) {
      fileList.push(path.join(dir, file));
    }
  }
  return fileList;
}

const srcDir = path.join(__dirname, 'src');
const files = getFiles(srcDir);

let fixedCount = 0;

for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');
  let original = content;

  // Pattern to find fetch('/api/...') or axios.get('/api/...')
  content = original.replace(/(fetch|axios\.(?:get|post|put|delete|patch))\(\s*(['"`])(\/api\/[^'"`]*)\2/g, (match, method, quote, urlPath) => {
    return `${method}(\`${"${API_URL}"}${urlPath}\``;
  });

  if (content !== original) {
    if (!content.includes('import { API_URL }')) {
      const importRegex = /^import .*;/gm;
      let match;
      let lastIndex = 0;
      while ((match = importRegex.exec(content)) !== null) {
        lastIndex = match.index + match[0].length;
      }
      if (lastIndex > 0) {
        content = content.slice(0, lastIndex) + '\nimport { API_URL } from "@/config/api.js";' + content.slice(lastIndex);
      } else {
        content = 'import { API_URL } from "@/config/api.js";\n' + content;
      }
    }
    fs.writeFileSync(file, content, 'utf8');
    fixedCount++;
    console.log('Fixed:', file);
  }
}
console.log('Total fixed:', fixedCount);
