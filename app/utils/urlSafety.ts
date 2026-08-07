// app/utils/urlSafety.ts

/**
 * Valida que una URL use un esquema seguro antes de usarla en src de <img>,
 * href, o window.open. Bloquea esquemas peligrosos como javascript:, vbscript:, etc.
 */
export function getSafeImageSrc(url?: string | null): string | undefined {
  if (!url) return undefined;
  try {
    if (url.startsWith('/')) return url; // rutas relativas propias del servidor

    const parsed = new URL(url, window.location.origin);
    const allowedProtocols = ['http:', 'https:'];
    const isSafeDataImage = parsed.protocol === 'data:' && url.startsWith('data:image/');

    return allowedProtocols.includes(parsed.protocol) || isSafeDataImage ? url : undefined;
  } catch {
    return undefined;
  }
}

/**
 * Igual que getSafeImageSrc, pero para enlaces/redirecciones (window.open, href).
 * No permite data: porque no aplica a navegación, solo a imágenes.
 */
export function getSafeLinkUrl(url?: string | null): string | undefined {
  if (!url) return undefined;
  try {
    if (url.startsWith('/')) return url;

    const parsed = new URL(url, window.location.origin);
    const allowedProtocols = ['http:', 'https:'];
    return allowedProtocols.includes(parsed.protocol) ? url : undefined;
  } catch {
    return undefined;
  }
}