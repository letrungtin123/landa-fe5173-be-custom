// ═══════════════════════════════════════════════════════════════
// useBranding — Fetch branding images by domain
// FE 5173 gọi public API trước khi user login
// ═══════════════════════════════════════════════════════════════

import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { config } from '@/config/env';
import { storageUrl } from '@/utils/storageUrl';

// ── Static fallback imports ──
import fallbackLeftPanelBg from '@/assets/LoginPage/LeftPanelLogin.jpg';
import fallbackRegisterBg from '@/assets/LoginPage/Register.png';
import fallbackWhiteLogo from '@/assets/LoginPage/WhiteLogoLeftPanel.png';
import fallbackSquareIcon from '@/assets/LoginPage/SquareIcon.png';
import fallbackPerson1 from '@/assets/LoginPage/Person1.jpg';
import fallbackPerson2 from '@/assets/LoginPage/Person2.jpg';
import fallbackPerson3 from '@/assets/LoginPage/Person3.jpg';
import fallbackPerson4 from '@/assets/LoginPage/Person4.jpg';
import fallbackCarousel1 from '@/assets/LoginPage/Carousel1.png';
import fallbackCarousel2 from '@/assets/LoginPage/Carousel2.png';
import fallbackCarousel3 from '@/assets/LoginPage/Carousel3.png';
import fallbackCarousel4 from '@/assets/LoginPage/Carousel4.png';
import fallbackCarousel5 from '@/assets/LoginPage/Carousel5.png';
import fallbackCarousel6 from '@/assets/LoginPage/Carousel6.png';
import fallbackHeaderLogo from '@/assets/leandassociate.webp';

// ── Types ──

export interface BrandingImages {
  leftPanelBg: string;
  registerBg: string;
  whiteLogo: string;
  squareIcon: string;
  headerLogo: string;
  headerLogoDark: string;
  person1: string;
  person2: string;
  person3: string;
  person4: string;
  carousels: string[];
  adminUrl: string | null;
  tenantName: string | null;
}

interface ApiBrandingResponse {
  success: boolean;
  data: {
    tenant_id: string | null;
    tenant_name: string | null;
    domain_admin: string | null;
    images: Record<string, string | null>;
    carousels: string[];
    size_hints: Record<string, string>;
  };
}

// ── Default branding (static fallbacks) ──

const DEFAULT_BRANDING: BrandingImages = {
  leftPanelBg: fallbackLeftPanelBg,
  registerBg: fallbackRegisterBg,
  whiteLogo: fallbackWhiteLogo,
  squareIcon: fallbackSquareIcon,
  headerLogo: fallbackHeaderLogo,
  headerLogoDark: fallbackHeaderLogo,
  person1: fallbackPerson1,
  person2: fallbackPerson2,
  person3: fallbackPerson3,
  person4: fallbackPerson4,
  carousels: [
    fallbackCarousel1, fallbackCarousel2, fallbackCarousel3,
    fallbackCarousel4, fallbackCarousel5, fallbackCarousel6,
  ],
  adminUrl: null,
  tenantName: null,
};

// ── Xóa cache cũ nếu còn tồn tại ──
try { localStorage.removeItem('landa-branding-cache'); } catch { /* ignore */ }

// ── Fetch function ──

async function fetchBrandingByDomain(domain: string): Promise<BrandingImages> {
  try {
    const baseUrl = config.apiBaseUrl;
    const response = await fetch(`${baseUrl}/api/branding/by-domain/${encodeURIComponent(domain)}`);
    if (!response.ok) return DEFAULT_BRANDING;

    const json: ApiBrandingResponse = await response.json();
    const data = json.data;

    if (!data?.tenant_id) return DEFAULT_BRANDING;

    // storageUrl() converts storage path → BE proxy URL (e.g., /api/storage/tenant/branding/key.png)
    // Backend đã thêm timestamp vào path khi upload nên path luôn unique, không cần bustCache ở đây nữa
    const resolve = (path: string | null | undefined, fallback: string): string =>
      path ? storageUrl(path) || fallback : fallback;

    return {
      leftPanelBg: resolve(data.images.left_panel_bg, DEFAULT_BRANDING.leftPanelBg),
      registerBg: resolve(data.images.register_bg, DEFAULT_BRANDING.registerBg),
      whiteLogo: resolve(data.images.white_logo, DEFAULT_BRANDING.whiteLogo),
      squareIcon: resolve(data.images.square_icon, DEFAULT_BRANDING.squareIcon),
      headerLogo: resolve(data.images.header_logo, DEFAULT_BRANDING.headerLogo),
      headerLogoDark: resolve(data.images.header_logo_dark, DEFAULT_BRANDING.headerLogoDark),
      person1: resolve(data.images.person_1, DEFAULT_BRANDING.person1),
      person2: resolve(data.images.person_2, DEFAULT_BRANDING.person2),
      person3: resolve(data.images.person_3, DEFAULT_BRANDING.person3),
      person4: resolve(data.images.person_4, DEFAULT_BRANDING.person4),
      carousels: data.carousels.length > 0
        ? data.carousels.map((p) => storageUrl(p)).filter(Boolean)
        : DEFAULT_BRANDING.carousels,
      adminUrl: data.domain_admin
        ? `${data.domain_admin}/admin`
        : null,
      tenantName: data.tenant_name || null,
    };
  } catch {
    return DEFAULT_BRANDING;
  }
}

// ── Hook ──

/**
 * Hook lấy branding images dựa trên hostname hiện tại.
 * - Gọi public API `GET /api/branding/by-domain/{hostname}`
 * - React-query in-memory cache (không dùng localStorage)
 * - Fallback về ảnh static nếu API fail hoặc domain không match
 */
/** Default title from index.html — dùng làm fallback */
const DEFAULT_TITLE = 'L&A Onboarding 2026';

export function useBranding() {
  const domain = window.location.hostname;

  const { data: branding, isLoading } = useQuery({
    queryKey: ['branding', domain],
    queryFn: () => fetchBrandingByDomain(domain),
    staleTime: 5 * 60 * 1000, // 5 phút
    gcTime: 10 * 60 * 1000,
    retry: 1,
    refetchOnWindowFocus: false,
  });

  // Cập nhật document.title + favicon theo tenant từ API + cache vào sessionStorage
  useEffect(() => {
    // Title
    const title = branding?.tenantName || '';
    if (title) document.title = title;

    // Favicon — dùng square_icon của tenant
    const faviconUrl = branding?.squareIcon && branding.squareIcon !== fallbackSquareIcon
      ? branding.squareIcon : '';
    const link = document.querySelector<HTMLLinkElement>("link[rel*='icon']");
    if (link && faviconUrl) {
      link.type = 'image/png';
      link.href = faviconUrl;
    }

    // Cache vào sessionStorage để index.html restore ngay khi F5
    if (title || faviconUrl) {
      try { sessionStorage.setItem('__branding', JSON.stringify({ t: title, f: faviconUrl })); } catch {}
    }
  }, [branding?.tenantName, branding?.squareIcon]);

  return {
    branding: branding || DEFAULT_BRANDING,
    isLoading,
  };
}

/** Export default branding for direct import */
export { DEFAULT_BRANDING };
