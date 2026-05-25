/**
 * Template Renderer for Arruda Imobi
 * Draws professional social media templates using Canvas API
 * 3 template designs: Story, Post, YouTube Thumb
 */

// Brand colors (Arruda Imobi)
const BRAND = {
  navy: '#1A2B4A',       // Primary dark navy
  navyLight: '#2A3B5C', // Lighter navy
  gold: '#D4A843',       // Gold accent
  goldLight: '#E8C06A', // Light gold
  white: '#FFFFFF',
  offWhite: '#F8F8F8',
  darkText: '#1A1A1A',
  mutedText: '#8A9BB0',
  overlay: 'rgba(15, 20, 35, 0.55)',
  gradientNavy: (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) => {
    const grad = ctx.createLinearGradient(x, y, x, y + h);
    grad.addColorStop(0, '#0D1520');
    grad.addColorStop(0.5, '#1A2B4A');
    grad.addColorStop(1, '#0D1520');
    ctx.fillStyle = grad;
    ctx.fillRect(x, y, w, h);
  },
  gradientGold: (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) => {
    const grad = ctx.createLinearGradient(x, y, x + w, y);
    grad.addColorStop(0, '#D4A843');
    grad.addColorStop(1, '#B8922E');
    ctx.fillStyle = grad;
    ctx.fillRect(x, y, w, h);
  },
};

export interface PropertyData {
  title?: string;
  price?: string | number;
  city?: string;
  area?: string;
  bedrooms?: number;
  bathrooms?: number;
  code?: string;
  contact?: string;
}

export interface TemplateResult {
  dataUrl: string;
  blob: Blob;
  width: number;
  height: number;
}

type DrawBackgroundFn = (ctx: CanvasRenderingContext2D, W: number, H: number) => void;
type DrawOverlayFn = (ctx: CanvasRenderingContext2D, W: number, H: number) => void;
type DrawBrandingFn = (ctx: CanvasRenderingContext2D, W: number, H: number, logo: HTMLImageElement | null) => void;

interface TemplateConfig {
  name: string;
  width: number;
  height: number;
  drawBackground: DrawBackgroundFn;
  drawOverlay?: DrawOverlayFn;
  imageArea: { x: number; y: number; w: number; h: number };
  brandingArea: { x: number; y: number; w: number; h: number };
  drawBranding: DrawBrandingFn;
  imageMask?: 'cover' | 'contain';
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load: ${src}`));
    img.src = src;
  });
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function drawTextMultiline(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
  align: CanvasTextAlign = 'left'
): number {
  const words = text.split(' ');
  let line = '';
  let cy = y;

  ctx.textAlign = align;
  for (let n = 0; n < words.length; n++) {
    const testLine = line + words[n] + ' ';
    const metrics = ctx.measureText(testLine);
    if (metrics.width > maxWidth && n > 0) {
      ctx.fillText(line.trim(), x, cy);
      line = words[n] + ' ';
      cy += lineHeight;
    } else {
      line = testLine;
    }
  }
  ctx.fillText(line.trim(), x, cy);
  return cy + lineHeight;
}

async function renderTemplate(
  config: TemplateConfig,
  propertyImageUrl: string,
  propertyData: PropertyData,
  logoUrl: string | null
): Promise<TemplateResult> {
  const { width: W, height: H } = config;

  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d')!;

  // 1. Background
  config.drawBackground(ctx, W, H);

  // 2. Property image
  let logo: HTMLImageElement | null = null;
  if (logoUrl) {
    try { logo = await loadImage(logoUrl); } catch (_) { /* skip logo */ }
  }

  let propImg: HTMLImageElement | null = null;
  try { propImg = await loadImage(propertyImageUrl); } catch (_) { /* skip */ }

  if (propImg) {
    const { x, y, w, h } = config.imageArea;
    ctx.save();
    // Draw image with cover/contain
    const imgAspect = propImg.naturalWidth / propImg.naturalHeight;
    const boxAspect = w / h;

    let sx = 0, sy = 0, sw = propImg.naturalWidth, sh = propImg.naturalHeight;

    if (config.imageMask === 'contain') {
      // Fit image inside box (letterbox)
      const scale = Math.min(w / propImg.naturalWidth, h / propImg.naturalHeight);
      const dw = propImg.naturalWidth * scale;
      const dh = propImg.naturalHeight * scale;
      const dx = x + (w - dw) / 2;
      const dy = y + (h - dh) / 2;
      ctx.drawImage(propImg, dx, dy, dw, dh);
    } else {
      // Cover - crop to fill
      if (imgAspect > boxAspect) {
        sw = propImg.naturalHeight * boxAspect;
        sx = (propImg.naturalWidth - sw) / 2;
      } else {
        sh = propImg.naturalWidth / boxAspect;
        sy = (propImg.naturalHeight - sh) / 2;
      }
      ctx.drawImage(propImg, sx, sy, sw, sh, x, y, w, h);
    }
    ctx.restore();
  }

  // 3. Optional overlay (dark gradient over image for text readability)
  if (config.drawOverlay) {
    config.drawOverlay(ctx, W, H);
  }

  // 4. Branding panel
  config.drawBranding(ctx, W, H, logo);

  // 5. Return
  return new Promise((resolve) => {
    canvas.toBlob((blob) => {
      resolve({
        dataUrl: canvas.toDataURL('image/png'),
        blob: blob!,
        width: W,
        height: H,
      });
    }, 'image/png');
  });
}

// ============================================================
// TEMPLATE 1: Story Instagram 1080x1920 — "Premium Dark"
// ============================================================
const STORY_1080: TemplateConfig = {
  name: 'Story Instagram (1080×1920)',
  width: 1080,
  height: 1920,

  imageArea: { x: 0, y: 0, w: 1080, h: 1920 },

  drawBackground(ctx, W, H) {
    const grad = ctx.createLinearGradient(0, 0, W, H);
    grad.addColorStop(0, '#0A0F1A');
    grad.addColorStop(0.4, '#1A2B4A');
    grad.addColorStop(1, '#0A0F1A');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);

    // Subtle grid pattern
    ctx.strokeStyle = 'rgba(255,255,255,0.03)';
    ctx.lineWidth = 1;
    for (let gx = 0; gx < W; gx += 60) {
      ctx.beginPath(); ctx.moveTo(gx, 0); ctx.lineTo(gx, H); ctx.stroke();
    }
    for (let gy = 0; gy < H; gy += 60) {
      ctx.beginPath(); ctx.moveTo(0, gy); ctx.lineTo(W, gy); ctx.stroke();
    }
  },

  drawOverlay(ctx, W, H) {
    // Bottom gradient for text readability
    const grad = ctx.createLinearGradient(0, H * 0.55, 0, H);
    grad.addColorStop(0, 'rgba(10,15,26,0)');
    grad.addColorStop(0.3, 'rgba(10,15,26,0.7)');
    grad.addColorStop(1, 'rgba(10,15,26,0.97)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);

    // Top vignette
    const topGrad = ctx.createLinearGradient(0, 0, 0, H * 0.2);
    topGrad.addColorStop(0, 'rgba(10,15,26,0.6)');
    topGrad.addColorStop(1, 'rgba(10,15,26,0)');
    ctx.fillStyle = topGrad;
    ctx.fillRect(0, 0, W, H * 0.2);
  },

  brandingArea: { x: 0, y: 1200, w: 1080, h: 720 },

  drawBranding(ctx, W, H, logo) {
    const pad = 48;
    const bottomY = H;

    // Gold top border line
    ctx.fillStyle = BRAND.gold;
    ctx.fillRect(pad, 1160, W - pad * 2, 4);

    // Price badge
    const priceText = (typeof propData.price === 'number')
      ? `R$ ${propData.price.toLocaleString('pt-BR')}`
      : (propData.price || '');
    if (priceText) {
      ctx.font = 'bold 56px Inter, Arial, sans-serif';
      const priceW = ctx.measureText(priceText).width;
      const priceX = pad;
      const priceY = 1240;

      // Price background pill
      roundRect(ctx, priceX - 16, priceY - 48, priceW + 32, 72, 12);
      ctx.fillStyle = BRAND.gold;
      ctx.fill();

      ctx.fillStyle = '#0A0F1A';
      ctx.textAlign = 'left';
      ctx.fillText(priceText, priceX, priceY);
    }

    // Property title
    const title = propData.title || 'Imóvel Exclusivo';
    ctx.font = 'bold 52px Inter, Arial, sans-serif';
    ctx.fillStyle = BRAND.white;
    ctx.textAlign = 'left';
    const titleY = 1380;
    const lines = [];
    let line = '';
    const maxW = W - pad * 2;
    for (const word of title.split(' ')) {
      const test = line + word + ' ';
      if (ctx.measureText(test).width > maxW && line) {
        lines.push(line.trim());
        line = word + ' ';
      } else line = test;
    }
    if (line) lines.push(line.trim());
    lines.slice(0, 3).forEach((l, i) => {
      ctx.fillText(l, pad, titleY + i * 68);
    });

    // Divider line
    ctx.fillStyle = 'rgba(212,168,67,0.4)';
    ctx.fillRect(pad, titleY + lines.slice(0, 3).length * 68 + 16, W - pad * 2, 2);

    // Details row
    const detailsY = titleY + lines.slice(0, 3).length * 68 + 60;
    const details: string[] = [];
    if (propData.city) details.push(`📍 ${propData.city}`);
    if (propData.area) details.push(`📐 ${propData.area}`);
    if (propData.bedrooms) details.push(`🛏 ${propData.bedrooms} quartos`);

    ctx.font = '32px Inter, Arial, sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    let dx = pad;
    for (const det of details.slice(0, 3)) {
      const w = ctx.measureText(det).width;
      ctx.fillText(det, dx, detailsY);
      dx += w + 40;
    }

    // Contact CTA bar
    const ctaY = H - 180;
    roundRect(ctx, pad, ctaY, W - pad * 2, 100, 16);
    ctx.fillStyle = BRAND.gold;
    ctx.fill();
    ctx.font = 'bold 34px Inter, Arial, sans-serif';
    ctx.fillStyle = '#0A0F1A';
    ctx.textAlign = 'center';
    ctx.fillText('📞 AGENDE SUA VISITA AGORA!', W / 2, ctaY + 64);

    // Logo + brand name
    if (logo) {
      const logoH2 = 52;
      const logoW2 = logoH2 * (logo.naturalWidth / logo.naturalHeight);
      ctx.drawImage(logo, W - pad - logoW2, 1160 + 8, logoW2, logoH2);
    } else {
      ctx.font = 'bold 28px Inter, Arial, sans-serif';
      ctx.fillStyle = BRAND.gold;
      ctx.textAlign = 'right';
      ctx.fillText('ARRUDA IMOBI', W - pad, 1160 + 40);
    }

    // Code badge
    if (propData.code) {
      ctx.font = '24px Inter, Arial, sans-serif';
      ctx.fillStyle = 'rgba(255,255,255,0.4)';
      ctx.textAlign = 'left';
      ctx.fillText(`Código: ${propData.code}`, pad, H - 60);
    }
  },
};

const propData = {} as PropertyData; // will be set per render

// ============================================================
// TEMPLATE 2: Post Facebook/Instagram 1200×628 — "Split Modern"
// ============================================================
const POST_MODERN: TemplateConfig = {
  name: 'Post Instagram (1200×628)',
  width: 1200,
  height: 628,

  imageArea: { x: 0, y: 0, w: 700, h: 628 },

  drawBackground(ctx, W, H) {
    // Left image area - property photo (drawn separately)
    // Right panel
    const panelW = W - 700;
    const grad = ctx.createLinearGradient(700, 0, W, 0);
    grad.addColorStop(0, '#0D1520');
    grad.addColorStop(1, '#1A2B4A');
    ctx.fillStyle = grad;
    ctx.fillRect(700, 0, panelW, H);

    // Gold accent stripe
    ctx.fillStyle = BRAND.gold;
    ctx.fillRect(700, 0, 4, H);

    // Subtle pattern
    ctx.strokeStyle = 'rgba(255,255,255,0.03)';
    ctx.lineWidth = 1;
    for (let gx = 700; gx < W; gx += 40) {
      ctx.beginPath(); ctx.moveTo(gx, 0); ctx.lineTo(gx, H); ctx.stroke();
    }
    for (let gy = 0; gy < H; gy += 40) {
      ctx.beginPath(); ctx.moveTo(700, gy); ctx.lineTo(W, gy); ctx.stroke();
    }
  },

  brandingArea: { x: 704, y: 0, w: 496, h: 628 },

  drawBranding(ctx, W, H, logo) {
    const pad = 40;
    const panelX = 704;
    const panelW = W - panelX;
    const priceText = (typeof propData.price === 'number')
      ? `R$ ${propData.price.toLocaleString('pt-BR')}`
      : (propData.price || '');

    // Gold top accent
    ctx.fillStyle = BRAND.gold;
    ctx.fillRect(panelX + pad, pad, panelW - pad * 2, 5);

    // Logo or brand name
    if (logo) {
      const lh = 48;
      const lw = lh * (logo.naturalWidth / logo.naturalHeight);
      ctx.drawImage(logo, panelX + pad, pad + 20, lw, lh);
    } else {
      ctx.font = 'bold 32px Inter, Arial, sans-serif';
      ctx.fillStyle = BRAND.gold;
      ctx.textAlign = 'left';
      ctx.fillText('ARRUDA IMOBI', panelX + pad, pad + 48);
    }

    // Price badge
    if (priceText) {
      ctx.font = 'bold 56px Inter, Arial, sans-serif';
      ctx.fillStyle = BRAND.gold;
      ctx.textAlign = 'left';
      ctx.fillText(priceText, panelX + pad, pad + 140);
    }

    // Property title
    const title = propData.title || '';
    if (title) {
      ctx.font = 'bold 38px Inter, Arial, sans-serif';
      ctx.fillStyle = BRAND.white;
      ctx.textAlign = 'left';
      const maxW = panelW - pad * 2;
      const titleLines: string[] = [];
      let line = '';
      for (const word of title.split(' ')) {
        const test = line + word + ' ';
        if (ctx.measureText(test).width > maxW && line) {
          titleLines.push(line.trim());
          line = word + ' ';
        } else line = test;
      }
      if (line) titleLines.push(line.trim());
      let ty = pad + 200;
      for (const l of titleLines.slice(0, 4)) {
        ctx.fillText(l, panelX + pad, ty);
        ty += 50;
      }
    }

    // Details
    const details: string[] = [];
    if (propData.city) details.push(`📍 ${propData.city}`);
    if (propData.area) details.push(`📐 ${propData.area}`);
    if (propData.bedrooms) details.push(`🛏 ${propData.bedrooms} quartos`);
    if (propData.bathrooms) details.push(`🛁 ${propData.bathrooms} banheiros`);

    if (details.length) {
      ctx.font = '28px Inter, Arial, sans-serif';
      ctx.fillStyle = 'rgba(255,255,255,0.75)';
      ctx.textAlign = 'left';
      let dy = pad + 400;
      for (const d of details.slice(0, 4)) {
        ctx.fillText(d, panelX + pad, dy);
        dy += 44;
      }
    }

    // CTA button
    const ctaY = H - 100;
    roundRect(ctx, panelX + pad, ctaY, panelW - pad * 2, 70, 12);
    ctx.fillStyle = BRAND.gold;
    ctx.fill();
    ctx.font = 'bold 26px Inter, Arial, sans-serif';
    ctx.fillStyle = '#0A0F1A';
    ctx.textAlign = 'center';
    ctx.fillText('📞 FALE CONOSCO', panelX + panelW / 2, ctaY + 46);

    // Code
    if (propData.code) {
      ctx.font = '22px Inter, Arial, sans-serif';
      ctx.fillStyle = 'rgba(255,255,255,0.35)';
      ctx.textAlign = 'left';
      ctx.fillText(`Código: ${propData.code}`, panelX + pad, H - 20);
    }
  },
};

// ============================================================
// TEMPLATE 3: YouTube Thumbnail 1280×720 — "Bold Impact"
// ============================================================
const THUMB_BOLD: TemplateConfig = {
  name: 'YouTube Thumbnail (1280×720)',
  width: 1280,
  height: 720,

  imageArea: { x: 0, y: 0, w: 1280, h: 720 },

  drawBackground(ctx, W, H) {
    const grad = ctx.createLinearGradient(0, 0, W, H);
    grad.addColorStop(0, '#1A2B4A');
    grad.addColorStop(0.5, '#0D1520');
    grad.addColorStop(1, '#1A2B4A');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);

    // Geometric accent lines
    ctx.strokeStyle = 'rgba(212,168,67,0.15)';
    ctx.lineWidth = 2;
    for (let i = 0; i < 8; i++) {
      ctx.beginPath();
      ctx.moveTo(W * 0.6 + i * 30, 0);
      ctx.lineTo(W + i * 30, H);
      ctx.stroke();
    }
  },

  drawOverlay(ctx, W, H) {
    // Heavy vignette for text readability
    const grad = ctx.createRadialGradient(W/2, H/2, H*0.2, W/2, H/2, H*0.9);
    grad.addColorStop(0, 'rgba(10,15,26,0.1)');
    grad.addColorStop(0.7, 'rgba(10,15,26,0.4)');
    grad.addColorStop(1, 'rgba(10,15,26,0.85)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);

    // Bottom gradient
    const bGrad = ctx.createLinearGradient(0, H * 0.65, 0, H);
    bGrad.addColorStop(0, 'rgba(10,15,26,0)');
    bGrad.addColorStop(1, 'rgba(10,15,26,0.9)');
    ctx.fillStyle = bGrad;
    ctx.fillRect(0, 0, W, H);
  },

  brandingArea: { x: 0, y: 0, w: 1280, h: 720 },

  drawBranding(ctx, W, H, logo) {
    const pad = 50;

    // Gold stripe top
    ctx.fillStyle = BRAND.gold;
    ctx.fillRect(0, 0, W, 6);

    // Big title at top
    const title = propData.title || '';
    if (title) {
      ctx.font = 'bold 72px Inter, Arial, sans-serif';
      ctx.fillStyle = BRAND.white;
      ctx.textAlign = 'left';
      ctx.shadowColor = 'rgba(0,0,0,0.8)';
      ctx.shadowBlur = 12;
      ctx.shadowOffsetX = 3;
      ctx.shadowOffsetY = 3;

      const maxW = W * 0.75;
      const lines: string[] = [];
      let line = '';
      for (const word of title.split(' ')) {
        const test = line + word + ' ';
        if (ctx.measureText(test).width > maxW && line) {
          lines.push(line.trim());
          line = word + ' ';
        } else line = test;
      }
      if (line) lines.push(line.trim());
      let ty = 100;
      for (const l of lines.slice(0, 2)) {
        ctx.fillText(l, pad, ty);
        ty += 90;
      }
      ctx.shadowBlur = 0;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 0;
    }

    // Price badge (bottom left)
    const priceText = (typeof propData.price === 'number')
      ? `R$ ${propData.price.toLocaleString('pt-BR')}`
      : (propData.price || '');
    if (priceText) {
      const badgeX = pad;
      const badgeY = H - 140;
      roundRect(ctx, badgeX, badgeY, 480, 90, 14);
      ctx.fillStyle = BRAND.gold;
      ctx.fill();
      ctx.font = 'bold 52px Inter, Arial, sans-serif';
      ctx.fillStyle = '#0A0F1A';
      ctx.textAlign = 'left';
      ctx.fillText(priceText, badgeX + 20, badgeY + 62);
    }

    // Location + details (bottom center-right)
    const detY = H - 80;
    ctx.font = '32px Inter, Arial, sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    ctx.textAlign = 'left';
    const parts: string[] = [];
    if (propData.city) parts.push(`📍 ${propData.city}`);
    if (propData.area) parts.push(`📐 ${propData.area}`);
    if (propData.bedrooms) parts.push(`🛏 ${propData.bedrooms} quartos`);
    ctx.fillText(parts.join('   •   '), pad, detY);

    // Logo (bottom right)
    if (logo) {
      const lh = 60;
      const lw = lh * (logo.naturalWidth / logo.naturalHeight);
      ctx.drawImage(logo, W - pad - lw, H - lh - 30, lw, lh);
    } else {
      ctx.font = 'bold 28px Inter, Arial, sans-serif';
      ctx.fillStyle = BRAND.gold;
      ctx.textAlign = 'right';
      ctx.fillText('ARRUDA IMOBI', W - pad, H - 50);
    }

    // Code badge (top right)
    if (propData.code) {
      ctx.font = '24px Inter, Arial, sans-serif';
      ctx.fillStyle = 'rgba(255,255,255,0.4)';
      ctx.textAlign = 'right';
      ctx.fillText(`#${propData.code}`, W - pad, 50);
    }
  },
};

// ============================================================
// TEMPLATE 4: Property Card 1080×1080 — "Square Premium"
// ============================================================
const CARD_SQUARE: TemplateConfig = {
  name: 'Cartão de Imóvel (1080×1080)',
  width: 1080,
  height: 1080,

  imageArea: { x: 0, y: 0, w: 1080, h: 700 },

  drawBackground(ctx, W, H) {
    const grad = ctx.createLinearGradient(0, 0, W, H);
    grad.addColorStop(0, '#0D1520');
    grad.addColorStop(1, '#1A2B4A');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);
  },

  drawOverlay(ctx, W, H) {
    const bGrad = ctx.createLinearGradient(0, H * 0.5, 0, H);
    bGrad.addColorStop(0, 'rgba(10,15,26,0)');
    bGrad.addColorStop(1, 'rgba(10,15,26,0.95)');
    ctx.fillStyle = bGrad;
    ctx.fillRect(0, 0, W, H);
  },

  brandingArea: { x: 0, y: 580, w: 1080, h: 500 },

  drawBranding(ctx, W, H, logo) {
    const pad = 44;

    // Gold top border
    ctx.fillStyle = BRAND.gold;
    ctx.fillRect(pad, 580, W - pad * 2, 5);

    // Price badge
    const priceText = (typeof propData.price === 'number')
      ? `R$ ${propData.price.toLocaleString('pt-BR')}`
      : (propData.price || '');
    if (priceText) {
      ctx.font = 'bold 68px Inter, Arial, sans-serif';
      ctx.fillStyle = BRAND.gold;
      ctx.textAlign = 'left';
      ctx.fillText(priceText, pad, 680);
    }

    // Title
    const title = propData.title || '';
    if (title) {
      ctx.font = 'bold 44px Inter, Arial, sans-serif';
      ctx.fillStyle = BRAND.white;
      ctx.textAlign = 'left';
      const maxW = W - pad * 2 - 200;
      const lines: string[] = [];
      let line = '';
      for (const word of title.split(' ')) {
        const test = line + word + ' ';
        if (ctx.measureText(test).width > maxW && line) {
          lines.push(line.trim());
          line = word + ' ';
        } else line = test;
      }
      if (line) lines.push(line.trim());
      let ty = 760;
      for (const l of lines.slice(0, 2)) {
        ctx.fillText(l, pad, ty);
        ty += 56;
      }
    }

    // Details row
    const dets: string[] = [];
    if (propData.city) dets.push(`📍 ${propData.city}`);
    if (propData.area) dets.push(`📐 ${propData.area}`);
    if (propData.bedrooms) dets.push(`🛏 ${propData.bedrooms}`);
    if (dets.length) {
      ctx.font = '30px Inter, Arial, sans-serif';
      ctx.fillStyle = 'rgba(255,255,255,0.7)';
      ctx.textAlign = 'left';
      ctx.fillText(dets.join('  •  '), pad, 880);
    }

    // CTA bar
    roundRect(ctx, pad, 920, W - pad * 2, 80, 14);
    ctx.fillStyle = BRAND.gold;
    ctx.fill();
    ctx.font = 'bold 30px Inter, Arial, sans-serif';
    ctx.fillStyle = '#0A0F1A';
    ctx.textAlign = 'center';
    ctx.fillText('📞 VISITE NOSSA CARTEIRA COMPLETA!', W / 2, 970);

    // Logo (bottom right)
    if (logo) {
      const lh = 44;
      const lw = lh * (logo.naturalWidth / logo.naturalHeight);
      ctx.drawImage(logo, W - pad - lw, 590, lw, lh);
    } else {
      ctx.font = 'bold 24px Inter, Arial, sans-serif';
      ctx.fillStyle = BRAND.gold;
      ctx.textAlign = 'right';
      ctx.fillText('ARRUDA IMOBI', W - pad, 622);
    }

    // Code
    if (propData.code) {
      ctx.font = '22px Inter, Arial, sans-serif';
      ctx.fillStyle = 'rgba(255,255,255,0.35)';
      ctx.textAlign = 'left';
      ctx.fillText(`Código: ${propData.code}`, pad, H - 20);
    }
  },
};

// Global propData reference (hack for template closures)
// We'll pass it as parameter instead
let _propData: PropertyData = {};

const _wrapBranding = (orig: DrawBrandingFn) =>
  (ctx: CanvasRenderingContext2D, W: number, H: number, logo: HTMLImageElement | null) =>
    orig(ctx, W, H, logo);

// ============================================================
// PUBLIC API
// ============================================================

export const TEMPLATES = {
  'story': (W: number, H: number, bg: DrawBackgroundFn, overlay: DrawOverlayFn | undefined, branding: DrawBrandingFn, imgMask?: 'cover' | 'contain') =>
    ({ name: 'Story Instagram (1080×1920)', width: 1080, height: 1920, imageArea: { x: 0, y: 0, w: 1080, h: 1920 }, drawBackground: bg, drawOverlay: overlay, brandingArea: { x: 0, y: 1200, w: 1080, h: 720 }, drawBranding: branding, imageMask: imgMask || 'cover' }),
  'post': (W: number, H: number, bg: DrawBackgroundFn, branding: DrawBrandingFn, imgArea: {x:number,y:number,w:number,h:number}) =>
    ({ name: 'Post Instagram (1200×628)', width: 1200, height: 628, imageArea: imgArea, drawBackground: bg, brandingArea: { x: 704, y: 0, w: 496, h: 628 }, drawBranding: branding, imageMask: 'cover' as const }),
  'thumb': (W: number, H: number, bg: DrawBackgroundFn, overlay: DrawOverlayFn, branding: DrawBrandingFn) =>
    ({ name: 'YouTube Thumbnail (1280×720)', width: 1280, height: 720, imageArea: { x: 0, y: 0, w: 1280, h: 720 }, drawBackground: bg, drawOverlay: overlay, brandingArea: { x: 0, y: 0, w: 1280, h: 720 }, drawBranding: branding, imageMask: 'cover' as const }),
  'card': (W: number, H: number, bg: DrawBackgroundFn, overlay: DrawOverlayFn, branding: DrawBrandingFn, imgArea: {x:number,y:number,w:number,h:number}) =>
    ({ name: 'Cartão de Imóvel (1080×1080)', width: 1080, height: 1080, imageArea: imgArea, drawBackground: bg, drawOverlay: overlay, brandingArea: { x: 0, y: 580, w: 1080, h: 500 }, drawBranding: branding, imageMask: 'cover' as const }),
};

export type TemplateId = 'story' | 'post' | 'thumb' | 'card';

export interface RenderOptions {
  templateId: TemplateId;
  propertyImageUrl: string;
  propertyData: PropertyData;
  logoUrl?: string | null;
}

export async function renderPropertyTemplate(options: RenderOptions): Promise<TemplateResult> {
  const { templateId, propertyImageUrl, propertyData, logoUrl } = options;
  _propData = propertyData;

  switch (templateId) {
    case 'story': return renderStoryTemplate(propertyImageUrl, propertyData, logoUrl);
    case 'post': return renderPostTemplate(propertyImageUrl, propertyData, logoUrl);
    case 'thumb': return renderThumbTemplate(propertyImageUrl, propertyData, logoUrl);
    case 'card': return renderCardTemplate(propertyImageUrl, propertyData, logoUrl);
    default: throw new Error(`Unknown template: ${templateId}`);
  }
}

async function renderStoryTemplate(imgUrl: string, pd: PropertyData, logoUrl: string | null): Promise<TemplateResult> {
  const W = 1080, H = 1920;
  const canvas = document.createElement('canvas');
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d')!;

  // Background
  const bgGrad = ctx.createLinearGradient(0, 0, W, H);
  bgGrad.addColorStop(0, '#0A0F1A'); bgGrad.addColorStop(0.4, '#1A2B4A'); bgGrad.addColorStop(1, '#0A0F1A');
  ctx.fillStyle = bgGrad; ctx.fillRect(0, 0, W, H);

  // Grid
  ctx.strokeStyle = 'rgba(255,255,255,0.03)'; ctx.lineWidth = 1;
  for (let gx = 0; gx < W; gx += 60) { ctx.beginPath(); ctx.moveTo(gx, 0); ctx.lineTo(gx, H); ctx.stroke(); }
  for (let gy = 0; gy < H; gy += 60) { ctx.beginPath(); ctx.moveTo(0, gy); ctx.lineTo(W, gy); ctx.stroke(); }

  // Image
  let logo: HTMLImageElement | null = null;
  if (logoUrl) { try { logo = await loadImage(logoUrl); } catch (_) {} }
  let propImg: HTMLImageElement | null = null;
  try { propImg = await loadImage(imgUrl); } catch (_) {}

  if (propImg) {
    const ia = { x: 0, y: 0, w: 1080, h: 1920 };
    const ia2 = propImg, iw = propImg.naturalWidth, ih = propImg.naturalHeight;
    const boxAsp = ia.w / ia.h, imgAsp = iw / ih;
    let sx = 0, sy = 0, sw = iw, sh = ih;
    if (imgAsp > boxAsp) { sw = ih * boxAsp; sx = (iw - sw) / 2; }
    else { sh = iw / boxAsp; sy = (ih - sh) / 2; }
    ctx.drawImage(ia2, sx, sy, sw, sh, ia.x, ia.y, ia.w, ia.h);
  }

  // Overlays
  const botGrad = ctx.createLinearGradient(0, H * 0.52, 0, H);
  botGrad.addColorStop(0, 'rgba(10,15,26,0)'); botGrad.addColorStop(0.35, 'rgba(10,15,26,0.75)'); botGrad.addColorStop(1, 'rgba(10,15,26,0.97)');
  ctx.fillStyle = botGrad; ctx.fillRect(0, 0, W, H);
  const topGrad = ctx.createLinearGradient(0, 0, 0, H * 0.18);
  topGrad.addColorStop(0, 'rgba(10,15,26,0.55)'); topGrad.addColorStop(1, 'rgba(10,15,26,0)');
  ctx.fillStyle = topGrad; ctx.fillRect(0, 0, W, H * 0.18);

  // Gold line
  ctx.fillStyle = '#D4A843'; ctx.fillRect(48, 1160, W - 96, 4);

  // Price
  const price = (typeof pd.price === 'number') ? `R$ ${pd.price.toLocaleString('pt-BR')}` : (pd.price || '');
  if (price) {
    ctx.font = 'bold 56px Inter, Arial, sans-serif';
    const pw = ctx.measureText(price).width;
    roundRect(ctx, 48 - 16, 1192, pw + 32, 72, 12);
    ctx.fillStyle = '#D4A843'; ctx.fill();
    ctx.fillStyle = '#0A0F1A'; ctx.textAlign = 'left';
    ctx.fillText(price, 48, 1240);
  }

  // Title
  const title = pd.title || '';
  if (title) {
    ctx.font = 'bold 52px Inter, Arial, sans-serif';
    ctx.fillStyle = '#FFFFFF'; ctx.textAlign = 'left';
    const lines: string[] = []; let line = '';
    for (const w2 of title.split(' ')) {
      const t = line + w2 + ' ';
      if (ctx.measureText(t).width > W - 96 && line) { lines.push(line.trim()); line = w2 + ' '; }
      else line = t;
    }
    if (line) lines.push(line.trim());
    let ty = 1380;
    for (const l of lines.slice(0, 3)) { ctx.fillText(l, 48, ty); ty += 68; }
  }

  // Details
  const dets: string[] = [];
  if (pd.city) dets.push(`${pd.city}`);
  if (pd.area) dets.push(`${pd.area}`);
  if (pd.bedrooms) dets.push(`${pd.bedrooms} quarto(s)`);
  if (dets.length) {
    ctx.font = '32px Inter, Arial, sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.85)'; ctx.textAlign = 'left';
    ctx.fillText(dets.join('  •  '), 48, 1380 + 3 * 68 + 20);
  }

  // CTA
  const ctaY = H - 180;
  roundRect(ctx, 48, ctaY, W - 96, 100, 16);
  ctx.fillStyle = '#D4A843'; ctx.fill();
  ctx.font = 'bold 34px Inter, Arial, sans-serif';
  ctx.fillStyle = '#0A0F1A'; ctx.textAlign = 'center';
  ctx.fillText('AGENDAR VISITA', W / 2, ctaY + 64);

  // Logo
  if (logo) {
    const lh = 52, lw = lh * (logo.naturalWidth / logo.naturalHeight);
    ctx.drawImage(logo, W - 48 - lw, 1160 + 8, lw, lh);
  } else {
    ctx.font = 'bold 28px Inter, Arial, sans-serif';
    ctx.fillStyle = '#D4A843'; ctx.textAlign = 'right';
    ctx.fillText('ARRUDA IMOBI', W - 48, 1160 + 42);
  }

  // Code
  if (pd.code) {
    ctx.font = '24px Inter, Arial, sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.4)'; ctx.textAlign = 'left';
    ctx.fillText(`Código: ${pd.code}`, 48, H - 60);
  }

  return new Promise(resolve => {
    canvas.toBlob(blob => resolve({ dataUrl: canvas.toDataURL('image/png'), blob: blob!, width: W, height: H }), 'image/png');
  });
}

async function renderPostTemplate(imgUrl: string, pd: PropertyData, logoUrl: string | null): Promise<TemplateResult> {
  const W = 1200, H = 628, panelX = 700;
  const canvas = document.createElement('canvas');
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d')!;

  // Right panel background
  const rGrad = ctx.createLinearGradient(panelX, 0, W, 0);
  rGrad.addColorStop(0, '#0D1520'); rGrad.addColorStop(1, '#1A2B4A');
  ctx.fillStyle = rGrad; ctx.fillRect(panelX, 0, W - panelX, H);

  // Gold stripe
  ctx.fillStyle = '#D4A843'; ctx.fillRect(panelX, 0, 4, H);

  // Grid on panel
  ctx.strokeStyle = 'rgba(255,255,255,0.03)'; ctx.lineWidth = 1;
  for (let gx = panelX; gx < W; gx += 40) { ctx.beginPath(); ctx.moveTo(gx, 0); ctx.lineTo(gx, H); ctx.stroke(); }
  for (let gy = 0; gy < H; gy += 40) { ctx.beginPath(); ctx.moveTo(panelX, gy); ctx.lineTo(W, gy); ctx.stroke(); }

  // Property image (left)
  let logo: HTMLImageElement | null = null;
  if (logoUrl) { try { logo = await loadImage(logoUrl); } catch (_) {} }
  let propImg: HTMLImageElement | null = null;
  try { propImg = await loadImage(imgUrl); } catch (_) {}
  if (propImg) {
    const iw = propImg.naturalWidth, ih = propImg.naturalHeight;
    const ia = { x: 0, y: 0, w: panelX, h: H };
    const boxAsp = ia.w / ia.h, imgAsp = iw / ih;
    let sx = 0, sy = 0, sw = iw, sh = ih;
    if (imgAsp > boxAsp) { sw = ih * boxAsp; sx = (iw - sw) / 2; }
    else { sh = iw / boxAsp; sy = (ih - sh) / 2; }
    ctx.drawImage(propImg, sx, sy, sw, sh, ia.x, ia.y, ia.w, ia.h);
  }

  const pad = 40;

  // Gold accent
  ctx.fillStyle = '#D4A843'; ctx.fillRect(panelX + pad, pad, W - panelX - pad * 2, 5);

  // Logo
  if (logo) {
    const lh = 48, lw = lh * (logo.naturalWidth / logo.naturalHeight);
    ctx.drawImage(logo, panelX + pad, pad + 20, lw, lh);
  } else {
    ctx.font = 'bold 32px Inter, Arial, sans-serif';
    ctx.fillStyle = '#D4A843'; ctx.textAlign = 'left';
    ctx.fillText('ARRUDA IMOBI', panelX + pad, pad + 48);
  }

  // Price
  const price = (typeof pd.price === 'number') ? `R$ ${pd.price.toLocaleString('pt-BR')}` : (pd.price || '');
  if (price) {
    ctx.font = 'bold 56px Inter, Arial, sans-serif';
    ctx.fillStyle = '#D4A843'; ctx.textAlign = 'left';
    ctx.fillText(price, panelX + pad, pad + 145);
  }

  // Title
  const title = pd.title || '';
  if (title) {
    ctx.font = 'bold 38px Inter, Arial, sans-serif';
    ctx.fillStyle = '#FFFFFF'; ctx.textAlign = 'left';
    const lines: string[] = []; let line = '';
    const maxW = W - panelX - pad * 2;
    for (const w2 of title.split(' ')) {
      const t = line + w2 + ' ';
      if (ctx.measureText(t).width > maxW && line) { lines.push(line.trim()); line = w2 + ' '; }
      else line = t;
    }
    if (line) lines.push(line.trim());
    let ty = pad + 200;
    for (const l of lines.slice(0, 4)) { ctx.fillText(l, panelX + pad, ty); ty += 50; }
  }

  // Details
  const dets: string[] = [];
  if (pd.city) dets.push(`📍 ${pd.city}`);
  if (pd.area) dets.push(`📐 ${pd.area}`);
  if (pd.bedrooms) dets.push(`🛏 ${pd.bedrooms} quarto(s)`);
  if (pd.bathrooms) dets.push(`🛁 ${pd.bathrooms} banheiro(s)`);
  if (dets.length) {
    ctx.font = '28px Inter, Arial, sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.75)'; ctx.textAlign = 'left';
    let dy = pad + 420;
    for (const d of dets.slice(0, 4)) { ctx.fillText(d, panelX + pad, dy); dy += 44; }
  }

  // CTA
  const ctaY = H - 100;
  roundRect(ctx, panelX + pad, ctaY, W - panelX - pad * 2, 70, 12);
  ctx.fillStyle = '#D4A843'; ctx.fill();
  ctx.font = 'bold 26px Inter, Arial, sans-serif';
  ctx.fillStyle = '#0A0F1A'; ctx.textAlign = 'center';
  ctx.fillText('FALE CONOSCO', panelX + (W - panelX) / 2, ctaY + 46);

  // Code
  if (pd.code) {
    ctx.font = '22px Inter, Arial, sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.textAlign = 'left';
    ctx.fillText(`Código: ${pd.code}`, panelX + pad, H - 20);
  }

  return new Promise(resolve => {
    canvas.toBlob(blob => resolve({ dataUrl: canvas.toDataURL('image/png'), blob: blob!, width: W, height: H }), 'image/png');
  });
}

async function renderThumbTemplate(imgUrl: string, pd: PropertyData, logoUrl: string | null): Promise<TemplateResult> {
  const W = 1280, H = 720;
  const canvas = document.createElement('canvas');
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d')!;

  const bgGrad = ctx.createLinearGradient(0, 0, W, H);
  bgGrad.addColorStop(0, '#1A2B4A'); bgGrad.addColorStop(0.5, '#0D1520'); bgGrad.addColorStop(1, '#1A2B4A');
  ctx.fillStyle = bgGrad; ctx.fillRect(0, 0, W, H);

  // Geometric lines
  ctx.strokeStyle = 'rgba(212,168,67,0.12)'; ctx.lineWidth = 2;
  for (let i = 0; i < 10; i++) {
    ctx.beginPath(); ctx.moveTo(W * 0.55 + i * 35, 0); ctx.lineTo(W + i * 35, H); ctx.stroke();
  }

  // Property image
  let logo: HTMLImageElement | null = null;
  if (logoUrl) { try { logo = await loadImage(logoUrl); } catch (_) {} }
  let propImg: HTMLImageElement | null = null;
  try { propImg = await loadImage(imgUrl); } catch (_) {}
  if (propImg) {
    const iw = propImg.naturalWidth, ih = propImg.naturalHeight;
    const ia = { x: 0, y: 0, w: W, h: H };
    const boxAsp = ia.w / ia.h, imgAsp = iw / ih;
    let sx = 0, sy = 0, sw = iw, sh = ih;
    if (imgAsp > boxAsp) { sw = ih * boxAsp; sx = (iw - sw) / 2; }
    else { sh = iw / boxAsp; sy = (ih - sh) / 2; }
    ctx.drawImage(propImg, sx, sy, sw, sh, ia.x, ia.y, ia.w, ia.h);
  }

  // Vignette overlay
  const vig = ctx.createRadialGradient(W/2, H/2, H*0.15, W/2, H/2, H*0.85);
  vig.addColorStop(0, 'rgba(10,15,26,0.05)'); vig.addColorStop(0.7, 'rgba(10,15,26,0.45)'); vig.addColorStop(1, 'rgba(10,15,26,0.88)');
  ctx.fillStyle = vig; ctx.fillRect(0, 0, W, H);

  const pad = 50;
  ctx.fillStyle = '#D4A843'; ctx.fillRect(0, 0, W, 6);

  // Title shadow helper
  const shadow = () => { ctx.shadowColor = 'rgba(0,0,0,0.85)'; ctx.shadowBlur = 14; ctx.shadowOffsetX = 4; ctx.shadowOffsetY = 4; };
  const noShadow = () => { ctx.shadowBlur = 0; ctx.shadowOffsetX = 0; ctx.shadowOffsetY = 0; };

  // Title
  const title = pd.title || '';
  if (title) {
    ctx.font = 'bold 76px Inter, Arial, sans-serif';
    ctx.fillStyle = '#FFFFFF'; ctx.textAlign = 'left';
    shadow();
    const lines: string[] = []; let line = '';
    for (const w2 of title.split(' ')) {
      const t = line + w2 + ' ';
      if (ctx.measureText(t).width > W * 0.72 && line) { lines.push(line.trim()); line = w2 + ' '; }
      else line = t;
    }
    if (line) lines.push(line.trim());
    let ty = 105;
    for (const l of lines.slice(0, 2)) { ctx.fillText(l, pad, ty); ty += 95; }
    noShadow();
  }

  // Price badge
  const price = (typeof pd.price === 'number') ? `R$ ${pd.price.toLocaleString('pt-BR')}` : (pd.price || '');
  if (price) {
    roundRect(ctx, pad, H - 145, 520, 95, 14);
    ctx.fillStyle = '#D4A843'; ctx.fill();
    ctx.font = 'bold 54px Inter, Arial, sans-serif';
    ctx.fillStyle = '#0A0F1A'; ctx.textAlign = 'left';
    ctx.fillText(price, pad + 20, H - 73);
  }

  // Details
  const dets: string[] = [];
  if (pd.city) dets.push(`📍 ${pd.city}`);
  if (pd.area) dets.push(`📐 ${pd.area}`);
  if (pd.bedrooms) dets.push(`🛏 ${pd.bedrooms} quarto(s)`);
  if (dets.length) {
    ctx.font = '32px Inter, Arial, sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.8)'; ctx.textAlign = 'left';
    ctx.fillText(dets.join('   •   '), pad, H - 35);
  }

  // Logo
  if (logo) {
    const lh = 62, lw = lh * (logo.naturalWidth / logo.naturalHeight);
    ctx.drawImage(logo, W - pad - lw, H - lh - 25, lw, lh);
  } else {
    ctx.font = 'bold 28px Inter, Arial, sans-serif';
    ctx.fillStyle = '#D4A843'; ctx.textAlign = 'right';
    ctx.fillText('ARRUDA IMOBI', W - pad, H - 48);
  }

  // Code
  if (pd.code) {
    ctx.font = '24px Inter, Arial, sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.4)'; ctx.textAlign = 'right';
    ctx.fillText(`#${pd.code}`, W - pad, 52);
  }

  return new Promise(resolve => {
    canvas.toBlob(blob => resolve({ dataUrl: canvas.toDataURL('image/png'), blob: blob!, width: W, height: H }), 'image/png');
  });
}

async function renderCardTemplate(imgUrl: string, pd: PropertyData, logoUrl: string | null): Promise<TemplateResult> {
  const W = 1080, H = 1080;
  const canvas = document.createElement('canvas');
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d')!;

  const bgGrad = ctx.createLinearGradient(0, 0, W, H);
  bgGrad.addColorStop(0, '#0D1520'); bgGrad.addColorStop(1, '#1A2B4A');
  ctx.fillStyle = bgGrad; ctx.fillRect(0, 0, W, H);

  let logo: HTMLImageElement | null = null;
  if (logoUrl) { try { logo = await loadImage(logoUrl); } catch (_) {} }
  let propImg: HTMLImageElement | null = null;
  try { propImg = await loadImage(imgUrl); } catch (_) {}
  if (propImg) {
    const iw = propImg.naturalWidth, ih = propImg.naturalHeight;
    const ia = { x: 0, y: 0, w: W, h: 700 };
    const boxAsp = ia.w / ia.h, imgAsp = iw / ih;
    let sx = 0, sy = 0, sw = iw, sh = ih;
    if (imgAsp > boxAsp) { sw = ih * boxAsp; sx = (iw - sw) / 2; }
    else { sh = iw / boxAsp; sy = (ih - sh) / 2; }
    ctx.drawImage(propImg, sx, sy, sw, sh, ia.x, ia.y, ia.w, ia.h);
  }

  const botGrad = ctx.createLinearGradient(0, H * 0.5, 0, H);
  botGrad.addColorStop(0, 'rgba(10,15,26,0)'); botGrad.addColorStop(1, 'rgba(10,15,26,0.95)');
  ctx.fillStyle = botGrad; ctx.fillRect(0, 0, W, H);

  const pad = 44;

  ctx.fillStyle = '#D4A843'; ctx.fillRect(pad, 580, W - pad * 2, 5);

  const price = (typeof pd.price === 'number') ? `R$ ${pd.price.toLocaleString('pt-BR')}` : (pd.price || '');
  if (price) {
    ctx.font = 'bold 68px Inter, Arial, sans-serif';
    ctx.fillStyle = '#D4A843'; ctx.textAlign = 'left';
    ctx.fillText(price, pad, 680);
  }

  const title = pd.title || '';
  if (title) {
    ctx.font = 'bold 44px Inter, Arial, sans-serif';
    ctx.fillStyle = '#FFFFFF'; ctx.textAlign = 'left';
    const lines: string[] = []; let line = '';
    for (const w2 of title.split(' ')) {
      const t = line + w2 + ' ';
      if (ctx.measureText(t).width > W - pad * 2 - 200 && line) { lines.push(line.trim()); line = w2 + ' '; }
      else line = t;
    }
    if (line) lines.push(line.trim());
    let ty = 760;
    for (const l of lines.slice(0, 2)) { ctx.fillText(l, pad, ty); ty += 56; }
  }

  const dets: string[] = [];
  if (pd.city) dets.push(`📍 ${pd.city}`);
  if (pd.area) dets.push(`📐 ${pd.area}`);
  if (pd.bedrooms) dets.push(`🛏 ${pd.bedrooms}`);
  if (dets.length) {
    ctx.font = '30px Inter, Arial, sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.7)'; ctx.textAlign = 'left';
    ctx.fillText(dets.join('  •  '), pad, 880);
  }

  roundRect(ctx, pad, 920, W - pad * 2, 80, 14);
  ctx.fillStyle = '#D4A843'; ctx.fill();
  ctx.font = 'bold 30px Inter, Arial, sans-serif';
  ctx.fillStyle = '#0A0F1A'; ctx.textAlign = 'center';
  ctx.fillText('VISAO NOSSA CARTEIRA COMPLETA', W / 2, 970);

  if (logo) {
    const lh = 44, lw = lh * (logo.naturalWidth / logo.naturalHeight);
    ctx.drawImage(logo, W - pad - lw, 590, lw, lh);
  } else {
    ctx.font = 'bold 24px Inter, Arial, sans-serif';
    ctx.fillStyle = '#D4A843'; ctx.textAlign = 'right';
    ctx.fillText('ARRUDA IMOBI', W - pad, 622);
  }

  if (pd.code) {
    ctx.font = '22px Inter, Arial, sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.textAlign = 'left';
    ctx.fillText(`Código: ${pd.code}`, pad, H - 20);
  }

  return new Promise(resolve => {
    canvas.toBlob(blob => resolve({ dataUrl: canvas.toDataURL('image/png'), blob: blob!, width: W, height: H }), 'image/png');
  });
}
