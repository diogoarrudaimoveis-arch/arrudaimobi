const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..', 'src');
const files = [];

function walk(dir) {
  for (const dirent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, dirent.name);
    if (dirent.isDirectory()) {
      walk(p);
    } else if (/\.(ts|tsx)$/.test(dirent.name)) {
      files.push(p);
    }
  }
}
walk(root);
const allText = files.map(f => ({ path: f, text: fs.readFileSync(f, 'utf8') }));
const candidates = [];
for (const file of files) {
  const base = path.basename(file, path.extname(file));
  const search = new RegExp(`\\b${base}\\b`, 'g');
  let count = 0;
  for (const entry of allText) {
    if (entry.path === file) continue;
    if (search.test(entry.text)) count += 1;
  }
  if (count === 0) candidates.push({ file: path.relative(root, file), base });
}
console.log(candidates.sort((a,b) => a.file.localeCompare(b.file)).map(x => x.file).join('\n'));
