const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const entries = [];

function walk(dir) {
  for (const dirent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, dirent.name);
    if (dirent.isDirectory()) {
      walk(p);
    } else if (/\.(ts|tsx)$/.test(dirent.name) && (p.includes(path.join('src', 'hooks')) || p.includes(path.join('src', 'pages')))) {
      entries.push(p);
    }
  }
}

walk(root);
const pattern = /from\(["']([^"']+)["']\)/g;
const results = new Set();
for (const p of entries) {
  const text = fs.readFileSync(p, 'utf8');
  let match;
  while ((match = pattern.exec(text))) {
    results.add(match[1]);
  }
}
console.log([...results].sort().join('\n'));
