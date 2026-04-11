import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SITE_URL = 'https://arrudaimobi.vercel.app';
const PROJECT_ID = 'udutxbyzrdwucabxqvgg';
const API_URL = `https://${PROJECT_ID}.supabase.co/functions/v1/public-api?action=get-properties`;

async function generateSitemap() {
  const routes = [
    '', 
    '/imoveis', 
    '/agentes', 
    '/contato', 
    '/blog', 
    '/termos', 
    '/privacidade', 
    '/login'
  ];
  
  let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
  xml += `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`;

  // Rotas estaticas
  for (const route of routes) {
    xml += `  <url>\n    <loc>${SITE_URL}${route}</loc>\n    <changefreq>weekly</changefreq>\n    <priority>${route === '' ? '1.0' : '0.8'}</priority>\n  </url>\n`;
  }

  // Busca propriedades ativas para injetar nas URLS do Sitemap (Node 18+ nativo)
  try {
    const res = await fetch(API_URL);
    if (res.ok) {
      const reqData = await res.json();
      const data = reqData.data || reqData;
      if (Array.isArray(data)) {
        data.forEach(prop => {
          xml += `  <url>\n    <loc>${SITE_URL}/imoveis/${prop.id}</loc>\n    <changefreq>daily</changefreq>\n    <priority>0.9</priority>\n  </url>\n`;
        });
      }
    }
  } catch (err) {
    console.error("Erro ao buscar imoveis para o sitemap", err);
  }

  xml += `</urlset>\n`;
  
  const publicDir = path.join(__dirname, '..', 'public');
  if (!fs.existsSync(publicDir)){
    fs.mkdirSync(publicDir, { recursive: true });
  }
  
  fs.writeFileSync(path.join(publicDir, 'sitemap.xml'), xml);
  console.log('Sitemap dinâmico gerado com sucesso em public/sitemap.xml');
}

generateSitemap();
