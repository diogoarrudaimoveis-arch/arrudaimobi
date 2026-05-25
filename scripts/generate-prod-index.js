/**
 * Post-build: copy dist/index.html to project root.
 *
 * Vite processes src/main.tsx (via the <script> tag in root index.html)
 * and writes dist/index.html with hashed asset references.
 * We copy that production HTML to the project root so Vercel
 * (which serves from root) always gets the correct hashed script tags.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, '..');

const src = path.join(root, 'dist', 'index.html');
const dst = path.join(root, 'index.html');

if (!fs.existsSync(src)) {
  console.error('generate-prod-index: dist/index.html not found!');
  process.exit(1);
}

const html = fs.readFileSync(src, 'utf-8');

if (html.includes('/assets/')) {
  fs.writeFileSync(dst, html, 'utf-8');
  console.log('generate-prod-index: copied dist/index.html -> root (production OK)');
} else {
  console.error('generate-prod-index: dist/index.html has no /assets/ — build may have failed');
  process.exit(1);
}
