/**
 * Triggers a browser file download from a Blob
 * Works reliably across regular windows and sandboxed iframes.
 */
export function triggerFileDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.style.display = 'none';
  a.href = url;
  a.download = filename;
  a.rel = 'noopener';
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    try {
      if (a.parentNode) {
        document.body.removeChild(a);
      }
    } catch {
      // ignore
    }
    URL.revokeObjectURL(url);
  }, 2000);
}
