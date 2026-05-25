/**
 * Post-build: copy dist/index.html to project root.
 * This ensures the root index.html has production script refs
 * (not the dev /src/main.tsx reference).
 * Vercel serves from root, so this is critical.
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

// Only overwrite if it's the production build (has hashed assets)
if (html.includes('/assets/')) {
  fs.writeFileSync(dst, html, 'utf-8');
  console.log('generate-prod-index: copied dist/index.html -> root (production assets OK)');
} else {
  console.error('generate-prod-index: dist/index.html does not look like production build!');
  process.exit(1);
}
