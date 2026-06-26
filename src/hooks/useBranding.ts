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
import fallbackHeaderLogo from '@/assets/leandassociate.webp';

export interface DashboardContentTip {
  title: string;
  desc: string;
}

export interface DashboardContent {
  hero_badge: string | null;
  hero_title: string | null;
  tips: DashboardContentTip[] | null;
  explore_hero_badge: string | null;
  explore_hero_title: string | null;
}

export interface BrandingImages {
  leftPanelBg: string;
  registerBg: string;
  whiteLogo: string;
  squareIcon: string;
  headerLogo: string;
  headerLogoDark: string;
  person1: string | null;
  person2: string | null;
  person3: string | null;
  person4: string | null;
  carousels: string[];
  adminUrl: string | null;
  tenantName: string | null;
  dashboardContent: DashboardContent | null;
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

interface ApiDashboardContentResponse {
  success: boolean;
  data: {
    tenant_id: string | null;
    hero_badge: string | null;
    hero_title: string | null;
    tips: Array<{ title: string; desc: string }> | null;
    explore_hero_badge: string | null;
    explore_hero_title: string | null;
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
  person1: null,
  person2: null,
  person3: null,
  person4: null,
  carousels: [],
  adminUrl: null,
  tenantName: null,
  dashboardContent: null,
};

// ── Xóa cache cũ nếu còn tồn tại ──
try { localStorage.removeItem('landa-branding-cache'); } catch { /* ignore */ }

// ── Fetch function ──

async function fetchBrandingByDomain(domain: string): Promise<BrandingImages> {
  try {
    const baseUrl = config.apiBaseUrl;

    // Fetch branding + dashboard content in parallel
    const [brandingResponse, dashboardContentResponse] = await Promise.allSettled([
      fetch(`${baseUrl}/api/branding/by-domain/${encodeURIComponent(domain)}`),
      fetch(`${baseUrl}/api/dashboard-content/by-domain/${encodeURIComponent(domain)}`),
    ]);

    // Parse branding
    let brandingData: ApiBrandingResponse['data'] | null = null;
    if (brandingResponse.status === 'fulfilled' && brandingResponse.value.ok) {
      const json: ApiBrandingResponse = await brandingResponse.value.json();
      brandingData = json.data?.tenant_id ? json.data : null;
    }

    // Parse dashboard content
    let dashboardContent: DashboardContent | null = null;
    if (dashboardContentResponse.status === 'fulfilled' && dashboardContentResponse.value.ok) {
      const json: ApiDashboardContentResponse = await dashboardContentResponse.value.json();
      const d = json.data;
      if (d?.tenant_id && (d.hero_badge || d.hero_title || d.tips || d.explore_hero_badge || d.explore_hero_title)) {
        dashboardContent = {
          hero_badge: d.hero_badge,
          hero_title: d.hero_title,
          tips: d.tips,
          explore_hero_badge: d.explore_hero_badge,
          explore_hero_title: d.explore_hero_title,
        };
      }
    }

    if (!brandingData) {
      return { ...DEFAULT_BRANDING, dashboardContent };
    }

    // storageUrl() converts storage path → BE proxy URL
    const resolve = (path: string | null | undefined, fallback: string): string =>
      path ? storageUrl(path) || fallback : fallback;

    const resolveNullable = (path: string | null | undefined): string | null =>
      path ? storageUrl(path) || null : null;

    return {
      leftPanelBg: resolve(brandingData.images.left_panel_bg, DEFAULT_BRANDING.leftPanelBg),
      registerBg: resolve(brandingData.images.register_bg, DEFAULT_BRANDING.registerBg),
      whiteLogo: resolve(brandingData.images.white_logo, DEFAULT_BRANDING.whiteLogo),
      squareIcon: resolve(brandingData.images.square_icon, DEFAULT_BRANDING.squareIcon),
      headerLogo: resolve(brandingData.images.header_logo, DEFAULT_BRANDING.headerLogo),
      headerLogoDark: resolve(brandingData.images.header_logo_dark, DEFAULT_BRANDING.headerLogoDark),
      person1: resolveNullable(brandingData.images.person_1),
      person2: resolveNullable(brandingData.images.person_2),
      person3: resolveNullable(brandingData.images.person_3),
      person4: resolveNullable(brandingData.images.person_4),
      carousels: brandingData.carousels.length > 0
        ? brandingData.carousels.map((p) => storageUrl(p)).filter(Boolean)
        : [],
      adminUrl: brandingData.domain_admin
        ? `${brandingData.domain_admin.replace(/\/+$/, '')}/admin/`
        : null,
      tenantName: brandingData.tenant_name || null,
      dashboardContent,
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
