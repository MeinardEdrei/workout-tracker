// Render a DOM node to PNG and hand it to the system share sheet.

export async function renderPng(node, { transparent = false, scale = 3 } = {}) {
  if (document.fonts?.ready) await document.fonts.ready;
  const html2canvas = (await import('html2canvas')).default;
  const canvas = await html2canvas(node, { backgroundColor: transparent ? null : undefined, scale, useCORS: true, logging: false });
  return new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Could not create image'))), 'image/png'));
}

export function canShareFiles() {
  try {
    const probe = new File([new Blob()], 'x.png', { type: 'image/png' });
    return !!(navigator.share && navigator.canShare && navigator.canShare({ files: [probe] }));
  } catch { return false; }
}

export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// Must be called straight from a tap (iOS needs the user activation), so
// the blob has to be ready beforehand. Returns 'shared' | 'cancelled' | 'downloaded'.
export async function shareBlob(blob, filename, title) {
  const file = new File([blob], filename, { type: 'image/png' });
  if (navigator.share && navigator.canShare?.({ files: [file] })) {
    try { await navigator.share({ files: [file], title }); return 'shared'; }
    catch (e) { if (e?.name === 'AbortError') return 'cancelled'; throw e; }
  }
  downloadBlob(blob, filename);
  return 'downloaded';
}

export const canCopyImage = () => typeof window !== 'undefined' && !!(navigator.clipboard?.write && window.ClipboardItem);
export async function copyBlob(blob) {
  await navigator.clipboard.write([new window.ClipboardItem({ 'image/png': blob })]);
}
