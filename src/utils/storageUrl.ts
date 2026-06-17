import { config } from '@/config/env';

const STORAGE_PROXY_PREFIX = '/api/storage/';
const SUPABASE_PUBLIC_MARKER = '/object/public/landa-storage/';

function isHttpUrl(value: string): boolean {
  return /^https?:\/\//i.test(value);
}

function normalizeProxyPath(path: string): string {
  return path.replace(/^\/+/, '');
}

export function isTransientHtmlImageSrc(src: string | null | undefined): boolean {
  const value = (src || '').trim().toLowerCase();
  return value.startsWith('blob:') || value.startsWith('data:image/');
}

export function extractStoragePathFromProxyUrl(src: string | null | undefined): string | null {
  const value = (src || '').trim();
  if (!value) return null;

  if (value.startsWith(STORAGE_PROXY_PREFIX)) {
    return decodeURIComponent(value.slice(STORAGE_PROXY_PREFIX.length));
  }

  try {
    const url = new URL(value);
    const apiBaseUrl = config.apiBaseUrl;
    const sameApiHost = apiBaseUrl ? url.origin === new URL(apiBaseUrl).origin : false;
    const samePageHost = typeof window !== 'undefined' && url.origin === window.location.origin;

    if ((sameApiHost || samePageHost) && url.pathname.startsWith(STORAGE_PROXY_PREFIX)) {
      return decodeURIComponent(url.pathname.slice(STORAGE_PROXY_PREFIX.length));
    }
  } catch {
    return null;
  }

  return null;
}

export function isStoragePath(src: string | null | undefined): boolean {
  const value = (src || '').trim();
  if (!value || isHttpUrl(value) || value.startsWith('//') || value.startsWith('/') || value.includes('://')) {
    return false;
  }
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\/(courses|library|avatars|branding|help-docs|kb-files|kb-faqs|kb-articles)\//i.test(value);
}

export function htmlImageStoragePath(src: string | null | undefined): string | null {
  const value = (src || '').trim();
  if (!value) return null;

  const proxiedPath = extractStoragePathFromProxyUrl(value);
  if (proxiedPath) return normalizeProxyPath(proxiedPath);
  if (isStoragePath(value)) return normalizeProxyPath(value);
  return null;
}

export function isUploadedStorageImageSrc(src: string | null | undefined): boolean {
  return htmlImageStoragePath(src) !== null;
}

export function htmlImageDisplaySrc(src: string | null | undefined): string {
  const value = (src || '').trim();
  if (!value) return '';

  const proxiedPath = extractStoragePathFromProxyUrl(value);
  if (proxiedPath) return storageUrl(proxiedPath);
  if (isStoragePath(value)) return storageUrl(value);
  return value;
}

export function storageUrl(path: string | null | undefined): string {
  if (!path) return '';

  let cleanPath = path.trim();

  const proxyPath = extractStoragePathFromProxyUrl(cleanPath);
  if (proxyPath) {
    cleanPath = proxyPath;
  } else {
    const markerIndex = cleanPath.indexOf(SUPABASE_PUBLIC_MARKER);
    if (markerIndex !== -1) {
      cleanPath = decodeURIComponent(cleanPath.substring(markerIndex + SUPABASE_PUBLIC_MARKER.length));
    } else if (isHttpUrl(cleanPath)) {
      return cleanPath;
    }
  }

  cleanPath = normalizeProxyPath(cleanPath);
  return `${config.apiBaseUrl}${STORAGE_PROXY_PREFIX}${cleanPath}`;
}

export function avatarUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  const base = storageUrl(path);
  if (!base) return null;
  const url = base.split('?')[0];
  return `${url}?v=${Date.now()}`;
}
