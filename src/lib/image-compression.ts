/**
 * Compresses an image file and converts to WebP using Canvas API.
 * Returns a new File object ready for upload.
 */
export async function compressImage(
  file: File,
  options: { maxWidth?: number; maxHeight?: number; quality?: number } = {}
): Promise<File> {
  const { maxWidth = 1920, maxHeight = 1920, quality = 0.82 } = options;

  // Skip non-image files
  if (!file.type.startsWith("image/")) return file;

  // Skip SVGs - they don't need compression
  if (file.type === "image/svg+xml") return file;

  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);

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
        reject(new Error("Canvas context not available"));
        return;
      }

      ctx.drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error("Compression failed"));
            return;
          }

          const baseName = file.name.replace(/\.[^/.]+$/, "");
          const newFile = new File([blob], `${baseName}.webp`, {
            type: "image/webp",
            lastModified: Date.now(),
          });

          // Only use compressed version if it's actually smaller
          if (newFile.size < file.size) {
            resolve(newFile);
          } else {
            resolve(file);
          }
        },
        "image/webp",
        quality
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      // If we can't load the image, return original
      resolve(file);
    };

    img.src = url;
  });
}

/**
 * Compresses multiple image files in parallel.
 */
export async function compressImages(files: File[]): Promise<File[]> {
  return Promise.all(files.map((f) => compressImage(f)));
}
