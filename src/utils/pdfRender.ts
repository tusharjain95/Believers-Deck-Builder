import * as pdfjsLib from 'pdfjs-dist';

// Point worker to CDN matching current pdfjs-dist version
if (typeof window !== 'undefined') {
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;
}

export interface RenderedPdfPage {
  pageNumber: number;
  blob: Blob;
  width: number;
  height: number;
  thumbnailUrl: string;
}

/**
 * Renders all pages of a PDF file to 1920px wide JPEG Blobs (quality 0.85)
 * per requirement: "Render each PDF page with pdf.js to a JPEG 1920 px wide (quality 0.85)"
 */
export async function renderPdfToJpegs(
  fileOrBuffer: Blob | ArrayBuffer,
  onProgress?: (current: number, total: number) => void
): Promise<RenderedPdfPage[]> {
  const data =
    fileOrBuffer instanceof Blob
      ? await fileOrBuffer.arrayBuffer()
      : fileOrBuffer;

  const loadingTask = pdfjsLib.getDocument({ data });
  const pdfDoc = await loadingTask.promise;
  const totalPages = pdfDoc.numPages;
  const pages: RenderedPdfPage[] = [];

  const targetWidth = 1920;
  const quality = 0.85;

  for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
    onProgress?.(pageNum, totalPages);
    const page = await pdfDoc.getPage(pageNum);

    const unscaledViewport = page.getViewport({ scale: 1 });
    const scale = targetWidth / unscaledViewport.width;
    const viewport = page.getViewport({ scale });

    const canvas = document.createElement('canvas');
    canvas.width = Math.round(viewport.width);
    canvas.height = Math.round(viewport.height);

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Canvas 2D context is not available for PDF rendering.');
    }

    await page.render({
      canvasContext: ctx,
      viewport,
      canvas: canvas,
    } as any).promise;

    const blob: Blob = await new Promise((resolve, reject) => {
      canvas.toBlob(
        (b) => {
          if (b) resolve(b);
          else reject(new Error(`Failed to render page ${pageNum} to JPEG.`));
        },
        'image/jpeg',
        quality
      );
    });

    const thumbnailUrl = URL.createObjectURL(blob);

    pages.push({
      pageNumber: pageNum,
      blob,
      width: canvas.width,
      height: canvas.height,
      thumbnailUrl,
    });
  }

  return pages;
}
