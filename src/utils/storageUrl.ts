// ═══════════════════════════════════════════════════════════════
// Storage URL — Convert storage path → BE proxy URL
// Ảnh/file được stream qua BE, không lộ Supabase URL
// ═══════════════════════════════════════════════════════════════

import { config } from '@/config/env';

/**
 * Convert storage path thành URL qua BE proxy.
 * 
 * @example
 * // Dev (apiBaseUrl = ""):
 * storageUrl("tenant123/avatars/abc.jpg")
 * → "/api/storage/tenant123/avatars/abc.jpg"
 * 
 * // Prod (apiBaseUrl = "https://api.example.com"):
 * storageUrl("tenant123/avatars/abc.jpg")
 * → "https://api.example.com/api/storage/tenant123/avatars/abc.jpg"
 * 
 * storageUrl(null)  → ""
 * storageUrl("")    → ""
 * storageUrl("http://...") → "http://..." (backward compat)
 */
export function storageUrl(path: string | null | undefined): string {
  if (!path) return '';
  // Backward compat: nếu đã là full URL (data cũ) → trả nguyên
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  // Loại bỏ leading slash nếu có
  const cleanPath = path.startsWith('/') ? path.slice(1) : path;
  return `${config.apiBaseUrl}/api/storage/${cleanPath}`;
}

/**
 * Convert avatar storage path → URL với cache-busting.
 * Avatar dùng same filename khi re-upload (userId.jpg) nên browser cache ảnh cũ.
 * Thêm ?v=timestamp để force browser fetch ảnh mới.
 */
export function avatarUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  const base = storageUrl(path);
  if (!base) return null;
  // Nếu đã có query param (từ lần trước) → thay thế
  const url = base.split('?')[0];
  return `${url}?v=${Date.now()}`;
}
