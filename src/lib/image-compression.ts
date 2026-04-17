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
    watermarkOpacity = 0.5,
    watermarkMaxWidthRatio = 0.15,
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
    try {
      const watermark = await loadImage(watermarkUrl);
      const maxWatermarkWidth = width * watermarkMaxWidthRatio;
      const watermarkRatio = Math.min(1, maxWatermarkWidth / watermark.width);
      const watermarkWidth = Math.round(watermark.width * watermarkRatio);
      const watermarkHeight = Math.round(watermark.height * watermarkRatio);
      const x = width - watermarkWidth - watermarkMargin;
      const y = height - watermarkHeight - watermarkMargin;

      ctx.globalAlpha = watermarkOpacity;
      ctx.drawImage(watermark, x, y, watermarkWidth, watermarkHeight);
      ctx.globalAlpha = 1;
    } catch {
      // Fallback: ignore watermark if it cannot be loaded.
    }
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

/**
 * Compresses multiple image files in parallel.
 */
export async function compressImages(files: File[]): Promise<File[]> {
  return Promise.all(files.map((f) => compressImage(f)));
}
