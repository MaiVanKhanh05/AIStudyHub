const fs = require('fs');
const path = require('path');

function processDir(dir) {
    const files = fs.readdirSync(dir);
    let count = 0;
    for (const file of files) {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            count += processDir(fullPath);
        } else if (fullPath.endsWith('.jsx') || fullPath.endsWith('.js')) {
            let content = fs.readFileSync(fullPath, 'utf8');
            const original = content;

            // Fix: const API_BASE = "${API_URL}" -> const API_BASE = API_URL
            content = content.replace(/const API_BASE\s*=\s*"\$\{API_URL\}"/g, 'const API_BASE = API_URL');
            content = content.replace(/const API_BASE\s*=\s*`\$\{API_URL\}`/g, 'const API_BASE = API_URL');

            // Fix: fetch("${API_URL}/path") -> fetch(`${API_URL}/path`)
            content = content.replace(/"\$\{API_URL\}([^"]*)"/g, '`$$${API_URL}$1`');

            // Fix: href="${API_URL}/path" -> href={`${API_URL}/path`}
            content = content.replace(/href="\$\{API_URL\}([^"]*)"/g, 'href={`$$${API_URL}$1`}');
            content = content.replace(/href=`\$\{API_URL\}([^`]*)`/g, 'href={`$$${API_URL}$1`}');

            // also fix axios.get("${API_URL}...")
            // The "\$\{API_URL\}([^"]*)" already covers anything starting with "${API_URL}" and ending with "

            if (content !== original) {
                fs.writeFileSync(fullPath, content, 'utf8');
                console.log('Fixed:', fullPath);
                count++;
            }
        }
    }
    return count;
}

const count = processDir(path.join(__dirname, 'frontend', 'src'));
console.log('Total files fixed:', count);
