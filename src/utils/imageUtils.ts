/**
 * Image utilities for member photo cropping and card aspect verification.
 */

export interface Area {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Creates an image element from a source URL
 */
export const createImage = (url: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener('load', () => resolve(image));
    image.addEventListener('error', (error) => reject(error));
    image.setAttribute('crossOrigin', 'anonymous');
    image.src = url;
  });

/**
 * Crops and resizes image on canvas:
 * Rule: Aspect 4.31:5 (round frame on feature slide); resize to max 900 px; return Blob.
 */
export async function getCroppedImg(
  imageSrc: string,
  pixelCrop: Area,
  maxDimension: number = 900
): Promise<Blob> {
  const image = await createImage(imageSrc);
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    throw new Error('Canvas 2D context not available.');
  }

  // Calculate target dimensions keeping pixelCrop aspect ratio, max 900px
  let targetWidth = pixelCrop.width;
  let targetHeight = pixelCrop.height;

  if (targetWidth > maxDimension || targetHeight > maxDimension) {
    const scale = Math.min(maxDimension / targetWidth, maxDimension / targetHeight);
    targetWidth = Math.round(targetWidth * scale);
    targetHeight = Math.round(targetHeight * scale);
  }

  canvas.width = targetWidth;
  canvas.height = targetHeight;

  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    targetWidth,
    targetHeight
  );

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error('Canvas could not produce blob.'));
          return;
        }
        resolve(blob);
      },
      'image/png',
      0.95
    );
  });
}

/**
 * Validates whether an image has approximately 16:9 aspect ratio (1.777)
 * Returns { is16x9: boolean, ratio: number, width: number, height: number }
 */
export async function checkCardAspect(
  fileOrBlob: Blob
): Promise<{ is16x9: boolean; ratio: number; width: number; height: number }> {
  const url = URL.createObjectURL(fileOrBlob);
  try {
    const img = await createImage(url);
    const width = img.naturalWidth || img.width;
    const height = img.naturalHeight || img.height;
    const ratio = height > 0 ? width / height : 0;
    const target16x9 = 16 / 9; // ~1.7778
    // Accept within 5% tolerance
    const diff = Math.abs(ratio - target16x9);
    const is16x9 = diff <= 0.08;

    return {
      is16x9,
      ratio: Number(ratio.toFixed(2)),
      width,
      height,
    };
  } finally {
    URL.revokeObjectURL(url);
  }
}
