/**
 * Image processing for PPTX picture slots.
 * Supports:
 * - default (cover): centre-crop on canvas to frame aspect ratio, export JPEG 0.9, max 1920px long side
 * - contain: draw whole image centred on transparent canvas of frame aspect, export PNG, max 1920px
 */

export interface ProcessedSlotImage {
  blob: Blob;
  extension: 'jpg' | 'png';
  contentType: string;
  width: number;
  height: number;
}

/**
 * Calculates canvas target dimensions and crop offsets for cover vs contain
 */
export function calculateImageDimensions(
  srcWidth: number,
  srcHeight: number,
  frameCx: number,
  frameCy: number,
  isContain: boolean,
  maxLongSide: number = 1920
): {
  canvasWidth: number;
  canvasHeight: number;
  drawX: number;
  drawY: number;
  drawWidth: number;
  drawHeight: number;
} {
  const frameAspect = frameCy > 0 ? frameCx / frameCy : 1;

  // Determine canvas width and height preserving frame aspect ratio
  let canvasWidth: number;
  let canvasHeight: number;

  if (frameAspect >= 1) {
    canvasWidth = Math.min(maxLongSide, Math.max(100, Math.round(srcWidth)));
    canvasHeight = Math.round(canvasWidth / frameAspect);
  } else {
    canvasHeight = Math.min(maxLongSide, Math.max(100, Math.round(srcHeight)));
    canvasWidth = Math.round(canvasHeight * frameAspect);
  }

  // Ensure minimum dimensions
  canvasWidth = Math.max(1, canvasWidth);
  canvasHeight = Math.max(1, canvasHeight);

  if (isContain) {
    // Fit entire image inside canvas, keeping image aspect ratio
    const imgAspect = srcHeight > 0 ? srcWidth / srcHeight : 1;
    let drawWidth: number;
    let drawHeight: number;

    if (imgAspect > frameAspect) {
      drawWidth = canvasWidth;
      drawHeight = Math.round(canvasWidth / imgAspect);
    } else {
      drawHeight = canvasHeight;
      drawWidth = Math.round(canvasHeight * imgAspect);
    }

    const drawX = Math.round((canvasWidth - drawWidth) / 2);
    const drawY = Math.round((canvasHeight - drawHeight) / 2);

    return { canvasWidth, canvasHeight, drawX, drawY, drawWidth, drawHeight };
  } else {
    // Cover: centre-crop image to completely fill canvas
    const imgAspect = srcHeight > 0 ? srcWidth / srcHeight : 1;
    let drawWidth: number;
    let drawHeight: number;

    if (imgAspect > frameAspect) {
      drawHeight = canvasHeight;
      drawWidth = Math.round(canvasHeight * imgAspect);
    } else {
      drawWidth = canvasWidth;
      drawHeight = Math.round(canvasWidth / imgAspect);
    }

    const drawX = Math.round((canvasWidth - drawWidth) / 2);
    const drawY = Math.round((canvasHeight - drawHeight) / 2);

    return { canvasWidth, canvasHeight, drawX, drawY, drawWidth, drawHeight };
  }
}

/**
 * Processes an input Blob for a slide picture slot
 */
export async function processSlotImage(
  imageBlob: Blob,
  frameCx: number,
  frameCy: number,
  isContain: boolean
): Promise<ProcessedSlotImage> {
  const url = URL.createObjectURL(imageBlob);

  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = (e) => reject(new Error('Failed to load image for slot processing.'));
      el.src = url;
    });

    const srcWidth = img.naturalWidth || img.width || 800;
    const srcHeight = img.naturalHeight || img.height || 600;

    const dims = calculateImageDimensions(srcWidth, srcHeight, frameCx, frameCy, isContain, 1920);

    const canvas = document.createElement('canvas');
    canvas.width = dims.canvasWidth;
    canvas.height = dims.canvasHeight;

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Canvas 2D context not available.');
    }

    if (isContain) {
      // Clear with transparent background
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, dims.drawX, dims.drawY, dims.drawWidth, dims.drawHeight);

      const blob: Blob = await new Promise((resolve, reject) => {
        canvas.toBlob(
          (b) => (b ? resolve(b) : reject(new Error('Canvas PNG export failed.'))),
          'image/png'
        );
      });

      return {
        blob,
        extension: 'png',
        contentType: 'image/png',
        width: canvas.width,
        height: canvas.height,
      };
    } else {
      // Cover: draw image to fill
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, dims.drawX, dims.drawY, dims.drawWidth, dims.drawHeight);

      const blob: Blob = await new Promise((resolve, reject) => {
        canvas.toBlob(
          (b) => (b ? resolve(b) : reject(new Error('Canvas JPEG export failed.'))),
          'image/jpeg',
          0.9
        );
      });

      return {
        blob,
        extension: 'jpg',
        contentType: 'image/jpeg',
        width: canvas.width,
        height: canvas.height,
      };
    }
  } finally {
    URL.revokeObjectURL(url);
  }
}
