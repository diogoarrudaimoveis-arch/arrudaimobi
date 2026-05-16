import { chromium } from './node_modules/playwright/index.mjs';
import { writeFileSync } from 'fs';

const URLs = [
  [1, 'admin#/admin', 'https://arrudaimobi.vercel.app/admin#/admin'],
  [2, 'admin#/admin/proprietarios', 'https://arrudaimobi.vercel.app/admin#/admin/proprietarios'],
  [3, 'admin#/admin/imoveis', 'https://arrudaimobi.vercel.app/admin#/admin/imoveis'],
  [4, 'admin#/admin/agenda', 'https://arrudaimobi.vercel.app/admin#/admin/agenda'],
  [5, 'admin#/admin/agentes', 'https://arrudaimobi.vercel.app/admin#/admin/agentes'],
  [6, 'admin#/admin/tipos', 'https://arrudaimobi.vercel.app/admin#/admin/tipos'],
  [7, 'admin#/admin/comodidades', 'https://arrudaimobi.vercel.app/admin#/admin/comodidades'],
  [8, 'admin#/admin/blog', 'https://arrudaimobi.vercel.app/admin#/admin/blog'],
  [9, 'admin#/admin/contactos', 'https://arrudaimobi.vercel.app/admin#/admin/contactos'],
  [10, 'admin#/admin/mensagens', 'https://arrudaimobi.vercel.app/admin#/admin/mensagens'],
  [11, 'admin#/admin/configuracoes-ia', 'https://arrudaimobi.vercel.app/admin#/admin/configuracoes-ia'],
  [12, 'admin#/admin/portais', 'https://arrudaimobi.vercel.app/admin#/admin/portais'],
  [13, 'admin#/admin/marketing-portal', 'https://arrudaimobi.vercel.app/admin#/admin/marketing-portal'],
  [14, 'admin#/admin/performance', 'https://arrudaimobi.vercel.app/admin#/admin/performance'],
  [15, 'admin#/admin/ia-operacional', 'https://arrudaimobi.vercel.app/admin#/admin/ia-operacional'],
  [16, 'admin#/admin/ia-agentes', 'https://arrudaimobi.vercel.app/admin#/admin/ia-agentes'],
  [17, 'admin#/admin/ia-automacoes', 'https://arrudaimobi.vercel.app/admin#/admin/ia-automacoes'],
  [18, 'admin#/admin/ia-logs', 'https://arrudaimobi.vercel.app/admin#/admin/ia-logs'],
  [19, 'admin#/admin/ia-health', 'https://arrudaimobi.vercel.app/admin#/admin/ia-health'],
  [20, 'admin#/admin/devops', 'https://arrudaimobi.vercel.app/admin#/admin/devops'],
  [21, 'admin#/admin/meta-ads', 'https://arrudaimobi.vercel.app/admin#/admin/meta-ads'],
  [22, 'admin#/admin/supabase-monitor', 'https://arrudaimobi.vercel.app/admin#/admin/supabase-monitor'],
  [23, 'admin#/admin/perfil', 'https://arrudaimobi.vercel.app/admin#/admin/perfil'],
  [24, 'admin#/admin/email', 'https://arrudaimobi.vercel.app/admin#/admin/email'],
  [25, 'admin#/admin/configuracoes', 'https://arrudaimobi.vercel.app/admin#/admin/configuracoes'],
  [26, 'admin#/admin/permissoes-menu', 'https://arrudaimobi.vercel.app/admin#/admin/permissoes-menu'],
];

const browser = await chromium.launch({
  args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  executablePath: '/usr/bin/chromium-browser',
  headless: true
});

const context = await browser.newContext();
const results = [];

for (const [num, path, url] of URLs) {
  const page = await context.newPage();
  const consoleErrors = [];
  
  page.on('console', msg => {
    if (msg.type() === 'error') consoleErrors.push(msg.text().substring(0, 100));
  });
  page.on('pageerror', err => consoleErrors.push(`PAGE_ERR: ${err.message.substring(0, 80)}`));

  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 15000 });
    await page.waitForTimeout(3000);
    
    const finalUrl = page.url();
    const isLogin = finalUrl.includes('/login');
    
    let darkSidebar = false;
    let whiteCards = false;
    let saasLayout = false;
    
    if (!isLogin) {
      darkSidebar = await page.evaluate(() => {
        const sidebar = document.querySelector('aside, [class*="sidebar"], nav');
        if (!sidebar) return false;
        const bg = window.getComputedStyle(sidebar).backgroundColor;
        return bg.includes('15, 23, 42') || bg.includes('30, 41, 59') || bg.includes('rgb(15') || bg.includes('rgb(30');
      });
      
      whiteCards = await page.evaluate(() => {
        const cards = document.querySelectorAll('[class*="bg-white"], [class*="bg-slate-50"], .card, [class*="rounded-lg"], [class*="shadow"]');
        return cards.length > 2;
      });
      
      saasLayout = darkSidebar && whiteCards;
    }
    
    results.push({
      num, path, url,
      finalUrl: finalUrl.replace('https://arrudaimobi.vercel.app', ''),
      pageLoaded: isLogin ? 'AUTH_REQUIRED' : 'YES',
      darkSidebar: isLogin ? 'N/A' : (darkSidebar ? 'PASS' : 'FAIL'),
      whiteCards: isLogin ? 'N/A' : (whiteCards ? 'PASS' : 'FAIL'),
      saasLayout: isLogin ? 'AUTH_REQUIRED' : (saasLayout ? 'PASS' : 'FAIL'),
      errors: consoleErrors.slice(0, 3)
    });
  } catch (err) {
    results.push({
      num, path, url,
      finalUrl: 'ERROR',
      pageLoaded: 'FAIL',
      darkSidebar: 'N/A',
      whiteCards: 'N/A',
      saasLayout: 'FAIL',
      errors: [err.message.substring(0, 80)]
    });
  }
  
  await page.close();
  console.log(`✓ Completed ${num}/26: ${path}`);
}

await browser.close();

let md = `# Arruda Imobi Admin Panel — QA Validation Results\n\n`;
md += `| # | Path | Final URL | Loaded | Dark Sidebar | White Cards | SaaS Layout | Errors |\n`;
md += `|---|------|-----------|--------|--------------|-------------|-------------|--------|\n`;

for (const r of results) {
  const errStr = r.errors.length ? r.errors.join(' | ').substring(0, 50) : '-';
  md += `| ${r.num} | \`${r.path}\` | \`${r.finalUrl}\` | ${r.pageLoaded} | ${r.darkSidebar} | ${r.whiteCards} | ${r.saasLayout} | ${errStr} |\n`;
}

const passCount = results.filter(r => r.saasLayout === 'PASS').length;
md += `\n**Summary:** ${passCount}/26 PASS | ${results.filter(r => r.pageLoaded === 'AUTH_REQUIRED').length} require auth | ${results.filter(r => r.pageLoaded === 'FAIL').length} failed\n`;

writeFileSync('/tmp/arruda_validation_results.md', md);
console.log('\n' + md);
