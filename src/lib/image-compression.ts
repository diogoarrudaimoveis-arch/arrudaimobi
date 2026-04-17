import { supabase } from "@/integrations/supabase/client";

/**
 * Compresses an image file and converts to WebP using Canvas API.
 * Returns a new File object ready for upload.
 */
async function loadImage(src: string, crossOrigin = "anonymous"): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = crossOrigin;
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

async function loadImageFromFile(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Unable to load image file"));
    };

    img.src = url;
  });
}

export async function compressImage(
  file: File,
  options: { maxWidth?: number; maxHeight?: number; quality?: number } = {}
): Promise<File> {
  const { maxWidth = 1920, maxHeight = 1920, quality = 0.82 } = options;

  // Skip non-image files
  if (!file.type.startsWith("image/")) return file;

  // Skip SVGs - they don't need compression
  if (file.type === "image/svg+xml") return file;

  const img = await loadImageFromFile(file);
  let { width, height } = img;

  // Scale down if needed
  if (width > maxWidth || height > maxHeight) {
    const ratio = Math.min(maxWidth / width, maxHeight / height);
    width = Math.round(width * ratio);
    height = Math.round(height * ratio);
  }

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Canvas context not available");
  }

  ctx.drawImage(img, 0, 0, width, height);

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/webp", quality)
  );

  if (!blob) {
    throw new Error("Compression failed");
  }

  const baseName = file.name.replace(/\.[^/.]+$/, "");
  return new File([blob], `${baseName}.webp`, {
    type: "image/webp",
    lastModified: Date.now(),
  });
}

export async function processImageWithWatermark(
  file: File,
  watermarkUrl?: string,
  options: {
    maxWidth?: number;
    maxHeight?: number;
    quality?: number;
    watermarkOpacity?: number;
    watermarkMaxWidthRatio?: number;
    watermarkMargin?: number;
  } = {}
): Promise<File> {
  const {
    maxWidth = 1920,
    maxHeight = 1920,
    quality = 0.8,
    watermarkOpacity = 0.6,
    watermarkMaxWidthRatio = 0.3,
    watermarkMargin = 24,
  } = options;

  // Only images are processed here
  if (!file.type.startsWith("image/")) return file;
  if (file.type === "image/svg+xml") return file;

  const img = await loadImageFromFile(file);
  let { width, height } = img;

  if (width > maxWidth || height > maxHeight) {
    const ratio = Math.min(maxWidth / width, maxHeight / height);
    width = Math.round(width * ratio);
    height = Math.round(height * ratio);
  }

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Canvas context not available");
  }

  ctx.drawImage(img, 0, 0, width, height);

  if (watermarkUrl) {
    console.log('Aplicando marca d\'água com a logo:', watermarkUrl);
    try {
      const watermark = await loadImage(watermarkUrl, 'anonymous');
      const maxWatermarkWidth = width * watermarkMaxWidthRatio;
      const watermarkRatio = Math.min(1, maxWatermarkWidth / watermark.width);
      const watermarkWidth = Math.round(watermark.width * watermarkRatio);
      const watermarkHeight = Math.round(watermark.height * watermarkRatio);
      const x = (width - watermarkWidth) / 2;
      const y = (height - watermarkHeight) / 2;

      console.log('[DEBUG] Watermark dimensions:', { watermarkWidth, watermarkHeight, x, y, width, height });
      if (x < 0 || y < 0 || x + watermarkWidth > width || y + watermarkHeight > height) {
        console.warn('[DEBUG] Coordenadas de marca d\'água fora da área visível:', { x, y, watermarkWidth, watermarkHeight, width, height });
      }

      ctx.globalAlpha = watermarkOpacity;
      ctx.drawImage(watermark, x, y, watermarkWidth, watermarkHeight);
      ctx.globalAlpha = 1;
      console.log('[CANVAS] Marca d\'água desenhada no centro: ', { x, y, width: watermarkWidth, height: watermarkHeight });
    } catch (error) {
      console.warn('Falha ao carregar marca d\'água com a logo:', watermarkUrl, error);
      console.log('[PROCESSO] Aplicando marca d\'água de texto fallback ARRUDA IMOBI.');
      ctx.globalAlpha = watermarkOpacity;
      ctx.font = 'bold 48px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = 'rgba(255,255,255,0.7)';
      ctx.fillText('ARRUDA IMOBI', width / 2, height / 2);
      ctx.globalAlpha = 1;
      console.log('[CANVAS] Marca d\'água de texto fallback desenhada no centro.');
    }
  } else {
    console.log('Marca d\'água não aplicada porque watermarkUrl não foi fornecida. Aplicando texto fallback.');
    ctx.globalAlpha = watermarkOpacity;
    ctx.font = 'bold 48px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.fillText('ARRUDA IMOBI', width / 2, height / 2);
    ctx.globalAlpha = 1;
    console.log('[CANVAS] Marca d\'água de texto fallback desenhada no centro.');
  }

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/webp", quality)
  );

  if (!blob) {
    throw new Error("Image processing failed");
  }

  const baseName = file.name.replace(/\.[^/.]+$/, "");
  return new File([blob], `${baseName}.webp`, {
    type: "image/webp",
    lastModified: Date.now(),
  });
}

async function getSignedStorageUrlForImage(url: string): Promise<string | null> {
  const path = getStoragePathFromUrl(url);
  if (!path) return null;

  const { data, error } = await supabase.storage.from("property-images").createSignedUrl(path, 60);
  if (error || !data?.signedUrl) {
    console.warn("Falha ao gerar signed URL de fallback para imagem de storage:", error?.message || error);
    return null;
  }

  return data.signedUrl;
}

async function downloadImageFromStorage(path: string, filename?: string): Promise<File> {
  const cleanPath = path.replace(/\?.*$/, "");
  const cacheBustedPath = `${cleanPath}?t=${Date.now()}`;
  let downloadResult = await supabase.storage.from("property-images").download(cacheBustedPath);
  let data = downloadResult.data;
  let error = downloadResult.error;

  if (error || !data) {
    console.warn('[SISTEMA] Download SDK falhou, tentando fallback por publicUrl:', error?.message || error);
    const publicUrlResult = await supabase.storage.from("property-images").getPublicUrl(cleanPath);
    if (!publicUrlResult.data?.publicUrl) {
      throw new Error(error?.message || "Download falhou ou arquivo vazio");
    }
    const response = await fetch(`${publicUrlResult.data.publicUrl}&t=${Date.now()}`);
    if (!response.ok) {
      throw new Error(`Falha ao baixar via publicUrl: ${response.status} ${response.statusText}`);
    }
    data = await response.blob();
  }

  const blob = data instanceof Blob ? data : new Blob([data as unknown as ArrayBuffer], { type: "image/jpeg" });
  if (!blob || blob.size === 0) {
    throw new Error("Download falhou ou arquivo vazio");
  }

  const fileName = filename || cleanPath.split("/").pop() || `downloaded-image.${blob.type.split("/")[1] || "jpg"}`;
  console.log('[SISTEMA] Arquivo processado: ', blob.size, 'bytes, Tipo:', blob.type);

  return new File([blob], fileName, {
    type: blob.type || "image/jpeg",
    lastModified: Date.now(),
  });
}

export async function fetchImageAsFile(url: string, filename?: string): Promise<File> {
  const path = getStoragePathFromUrl(url);
  console.log('[DEBUG] Path exato para download:', path);
  if (!path) {
    throw new Error("Não foi possível extrair o caminho do storage a partir da URL da imagem.");
  }

  return await downloadImageFromStorage(path, filename);
}

export function getStoragePathFromUrl(url: string): string | undefined {
  const markers = [
    "/object/public/property-images/",
    "/object/sign/property-images/",
    "/storage/v1/object/public/property-images/",
    "/storage/v1/object/property-images/",
    "/property-images/",
  ];

  const cleanUrl = url.split(/[?#]/)[0];

  for (const marker of markers) {
    const index = cleanUrl.indexOf(marker);
    if (index !== -1) {
      return decodeURIComponent(cleanUrl.slice(index + marker.length)).replace(/^\/+/, "");
    }
  }

  const fallbackMatch = cleanUrl.match(/property-images\/(.+)$/);
  if (fallbackMatch?.[1]) {
    return decodeURIComponent(fallbackMatch[1]).replace(/^\/+/, "");
  }

  return undefined;
}

/**
 * Compresses multiple image files in parallel.
 */
export async function compressImages(files: File[]): Promise<File[]> {
  return Promise.all(files.map((f) => compressImage(f)));
}
