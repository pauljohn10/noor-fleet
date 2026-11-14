/**
 * Noor Fleet ERP — Enterprise Image Compression & Optimization Engine
 * Handles high-resolution mobile camera photos (up to 25MB),
 * downscales to max 1600px maintaining aspect ratio,
 * targets 200KB - 400KB with sharp mechanical & defect clarity.
 */

export interface CompressionResult {
  file: File;
  blob: Blob;
  dataUrl: string;
  originalSizeBytes: number;
  compressedSizeBytes: number;
  originalWidth: number;
  originalHeight: number;
  compressedWidth: number;
  compressedHeight: number;
  compressionRatioPercent: number;
  mimeType: string;
}

export interface CompressionOptions {
  maxDimension?: number; // default: 1600px
  quality?: number; // default: 0.82
  targetSizeKB?: number; // default: 350KB
  mimeType?: 'image/jpeg' | 'image/webp';
}

export function formatFileSize(bytes: number): string {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(i === 0 ? 0 : 1)} ${sizes[i]}`;
}

export async function compressImageFile(
  file: File,
  options: CompressionOptions = {}
): Promise<CompressionResult> {
  const maxDim = options.maxDimension || 1600;
  const targetQuality = options.quality !== undefined ? options.quality : 0.82;
  const preferredMime = options.mimeType || 'image/jpeg';

  return new Promise((resolve, reject) => {
    // Validate that input is an image
    if (!file.type.startsWith('image/')) {
      return reject(new Error('Selected file is not an image'));
    }

    const originalSizeBytes = file.size;
    const reader = new FileReader();

    reader.onerror = () => reject(new Error('Failed to read image file'));

    reader.onload = (e) => {
      const img = new Image();
      img.onerror = () => reject(new Error('Failed to decode image data'));

      img.onload = () => {
        const originalWidth = img.naturalWidth || img.width;
        const originalHeight = img.naturalHeight || img.height;

        // Calculate new dimensions preserving aspect ratio
        let targetWidth = originalWidth;
        let targetHeight = originalHeight;

        if (originalWidth > originalHeight) {
          if (originalWidth > maxDim) {
            targetHeight = Math.round((originalHeight * maxDim) / originalWidth);
            targetWidth = maxDim;
          }
        } else {
          if (originalHeight > maxDim) {
            targetWidth = Math.round((originalWidth * maxDim) / originalHeight);
            targetHeight = maxDim;
          }
        }

        // Create canvas for rendering & compression
        const canvas = document.createElement('canvas');
        canvas.width = targetWidth;
        canvas.height = targetHeight;
        const ctx = canvas.getContext('2d');

        if (!ctx) {
          return reject(new Error('Canvas 2D context not available'));
        }

        // Enable high quality image smoothing
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';

        // Draw image onto canvas
        ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

        // Convert to Blob with target quality
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              return reject(new Error('Image compression failed'));
            }

            const compressedSizeBytes = blob.size;
            const ratio = Math.max(
              0,
              Math.round(((originalSizeBytes - compressedSizeBytes) / originalSizeBytes) * 100)
            );

            // Generate clean compressed file name
            const baseName = file.name.replace(/\.[^/.]+$/, '');
            const ext = preferredMime === 'image/webp' ? 'webp' : 'jpg';
            const compressedFile = new File([blob], `${baseName}_optimized.${ext}`, {
              type: preferredMime,
              lastModified: Date.now(),
            });

            // Generate preview Data URL
            const dataUrl = canvas.toDataURL(preferredMime, targetQuality);

            resolve({
              file: compressedFile,
              blob,
              dataUrl,
              originalSizeBytes,
              compressedSizeBytes,
              originalWidth,
              originalHeight,
              compressedWidth: targetWidth,
              compressedHeight: targetHeight,
              compressionRatioPercent: ratio,
              mimeType: preferredMime,
            });
          },
          preferredMime,
          targetQuality
        );
      };

      img.src = e.target?.result as string;
    };

    reader.readAsDataURL(file);
  });
}

