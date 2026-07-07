const fs = require('fs');

const path = 'd:/AIStudyHub/frontend/src/pages/admin/AdminSidebar.jsx';
let content = fs.readFileSync(path, 'utf8');

// Use regex to remove the line with key: "documents"
const regex = /^\s*\{\s*key:\s*"documents".*\r?\n/m;
content = content.replace(regex, '');

fs.writeFileSync(path, content);
console.log('AdminSidebar updated');
