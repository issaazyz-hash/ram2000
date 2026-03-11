export function getApiBaseUrl() {
  const base = import.meta.env.VITE_API_BASE_URL || "/api";
  return base.endsWith("/api") ? base : `${base}/api`;
}

export function getBackendBaseUrl() {
  const apiBase = getApiBaseUrl();
  return apiBase.endsWith("/api") ? apiBase.slice(0, -4) : apiBase;
}

/**
 * Resolve image URL to full path (used by components).
 */
export function resolveImageUrl(path: string | undefined | null): string {
  if (!path) return '/pp.jpg';
  if (path.startsWith('http://') || path.startsWith('https://') || path.startsWith('data:')) return path;
  const normalized = path.replace(/^\.?\/*/, '');
  if (normalized.startsWith('uploads/') || normalized.startsWith('brands/') || normalized.startsWith('hero/')) {
    return `${getBackendBaseUrl()}/${normalized}`;
  }
  if (path.startsWith('/') && (path.startsWith('/brands/') || path.startsWith('/hero/') || path.startsWith('/uploads/'))) {
    return `${getBackendBaseUrl()}${path}`;
  }
  if (path.startsWith('/')) return path;
  const lower = path.toLowerCase().trim();
  const prefix = /\.(png|jpe?g|gif|webp|bmp|svg)$/.test(lower) ? '/uploads/' : '/brands/';
  return `${getBackendBaseUrl()}${prefix}${path}`;
}
