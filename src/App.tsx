import React, { Suspense, useState, useEffect } from "react";
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "@/components/providers/ThemeProvider";
import { MainLayout } from "@/components/layout/MainLayout";
import { CourseLayout } from "@/components/layout/CourseLayout";
import { GlobalBadgeWatcher } from "@/components/badges/GlobalBadgeWatcher";
import { StudyTimeTracker } from "@/components/global/StudyTimeTracker";
import { WelcomeInitModal } from "@/components/global/WelcomeInitModal";
import { createLoginSessionId, useAuthStore } from "@/stores/useAuthStore";
import { ErrorBoundary } from "@/components/ErrorBoundary";

import { config } from "@/config/env";
import ChatWidget from "@/components/chat-widget/chat-widget";
import { exchangeOttApi } from "@/api/auth";
import { avatarUrl } from "@/utils/storageUrl";
import { normalizeRoleLabels } from "@/utils/roleLabels";

// ── OTT Handler: Check trước khi React mount ──
// Nếu URL có ?ott= (từ Admin Dashboard → FE Learner SSO),
// exchange OTT → login ngay, rồi xóa OTT khỏi URL.
let pendingOttExchange: Promise<void> | null = null;

(function checkOttOnLoad() {
  const params = new URLSearchParams(window.location.search);
  const ott = params.get('ott');
  if (!ott) return;

  // Xóa OTT khỏi URL ngay lập tức
  const cleanUrl = window.location.pathname + window.location.hash;
  window.history.replaceState(null, '', cleanUrl);

  pendingOttExchange = exchangeOttApi(ott)
    .then((result) => {
      let activeTenantId = result.user.tenant_id;
      let activeTenantName = result.user.tenant_name;
      if (!activeTenantId && result.managed_tenants?.length > 0) {
        activeTenantId = result.managed_tenants[0].id;
        activeTenantName = result.managed_tenants[0].name;
      }

      useAuthStore.setState({
        isAuthenticated: true,
        accessToken: result.access_token,
        refreshToken: result.refresh_token,
        tokenType: "Bearer",
        tokenExpiresAt: Date.now() + result.expires_in * 1000,
        loginSessionId: createLoginSessionId(),
        user: {
          id: result.user.id,
          username: result.user.username,
          email: result.user.email,
          fullName: result.user.full_name,
          phone: result.user.phone,
          avatar: avatarUrl(result.user.avatar_url),
          role: result.user.role,
          tenantId: activeTenantId,
          tenantName: activeTenantName,
        },
        permissions: result.permissions,
        tenantModules: result.tenant_modules,
        managedTenants: result.managed_tenants,
        roleLabels: normalizeRoleLabels(result.role_labels),
      });

      useAuthStore.getState().scheduleTokenRefresh();
    })
    .catch(() => {
      // OTT invalid/expired → ignore, user sẽ thấy login page
    })
    .finally(() => {
      pendingOttExchange = null;
    });
})();

// ── LoginPage static — entry point, cần load ngay ──
import { LoginPage } from "@/pages/LoginPage";

// ── Lazy load — mỗi page thành chunk riêng, chỉ tải khi navigate ──
const DashboardPage = React.lazy(() =>
  import("@/pages/DashboardPage").then(m => ({ default: m.DashboardPage }))
);
const CoursesPage = React.lazy(() =>
  import("@/pages/CoursesPage").then(m => ({ default: m.CoursesPage }))
);
const ExplorePage = React.lazy(() =>
  import("@/pages/ExplorePage").then(m => ({ default: m.ExplorePage }))
);
const LibraryPage = React.lazy(() =>
  import("@/pages/LibraryPage").then(m => ({ default: m.LibraryPage }))
);
const LessonDetailPage = React.lazy(() =>
  import("@/pages/LessonDetailPage").then(m => ({ default: m.LessonDetailPage }))
);
const BadgesPage = React.lazy(() =>
  import("@/pages/BadgesPage").then(m => ({ default: m.BadgesPage }))
);
const ProfilePage = React.lazy(() =>
  import("@/pages/ProfilePage").then(m => ({ default: m.ProfilePage }))
);
const RegisterPage = React.lazy(() =>
  import("@/pages/RegisterPage").then(m => ({ default: m.RegisterPage }))
);
const DemoQrLoginPage = React.lazy(() =>
  import("@/pages/DemoQrLoginPage").then(m => ({ default: m.DemoQrLoginPage }))
);

// ── React Query config ──
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 phút
      gcTime: 10 * 60 * 1000, // Dọn cache sau 10 phút không sử dụng
      retry: 1,
      refetchOnWindowFocus: false, // Tránh refetch liên tục khi đổi tab
    },
    mutations: {
      retry: false, // Mutation không tự retry
    },
  },
});

// ── Loading fallback cho lazy-load ──
function PageLoader() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary/30 border-t-primary" />
        <p className="text-sm text-muted-foreground">Đang tải...</p>
      </div>
    </div>
  );
}

/**
 * Route bảo vệ — chuyển hướng đến /login nếu chưa đăng nhập.
 * Đồng thời mount GlobalBadgeWatcher để hiển thị badge modal từ mọi route.
 */
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return (
    <>
      <WelcomeInitModal />
      {/* Global badge watcher — hiện modal khi earn badge mới bất kể đang ở route nào */}
      <GlobalBadgeWatcher />
      {/* Global study time tracker — đếm giờ học ngay khi login, mọi route */}
      <StudyTimeTracker />
      {/* AI Chat Widget — hiện FAB chat trên mọi trang */}
      <ChatWidget />
      {children}
    </>
  );
}
/**
 * Gate chặn render routes cho đến khi OTT exchange hoàn tất.
 * Nếu không có OTT pending → render ngay.
 */
function OttGate({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(!pendingOttExchange);

  useEffect(() => {
    if (pendingOttExchange) {
      pendingOttExchange.finally(() => setReady(true));
    }
  }, []);

  if (!ready) return <PageLoader />;
  return <>{children}</>;
}

function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        {/* GoogleOAuthProvider removed — SSO tạm không dùng */}
          <ThemeProvider>
            <OttGate>
            <BrowserRouter>
              <Suspense fallback={<PageLoader />}>
                <Routes>
                {/* Route công khai */}
                <Route path="/login" element={<LoginPage />} />
                <Route path="/register" element={<RegisterPage />} />
                <Route path="/demo-login" element={<DemoQrLoginPage />} />


                {/* Routes bảo vệ — yêu cầu đăng nhập */}
                <Route
                  element={
                    <ProtectedRoute>
                      <MainLayout />
                    </ProtectedRoute>
                  }
                >
                  <Route
                    path="/"
                    element={<Navigate to="/dashboard" replace />}
                  />
                  <Route path="/dashboard" element={<DashboardPage />} />
                  <Route path="/explore" element={<ExplorePage />} />
                  <Route path="/library" element={<LibraryPage />} />
                  <Route path="/badges" element={<BadgesPage />} />
                  <Route path="/profile" element={<ProfilePage />} />
                  <Route path="/courses" element={<CoursesPage />} />

                  <Route path="/courses/:courseId" element={<CourseLayout />}>
                    <Route
                      path="lessons/:lessonId"
                      element={<LessonDetailPage />}
                    />
                  </Route>

                  {/* Fallback — redirect về dashboard */}
                  <Route
                    path="*"
                    element={<Navigate to="/dashboard" replace />}
                  />
                </Route>
              </Routes>
            </Suspense>
          </BrowserRouter>
            </OttGate>
        </ThemeProvider>

      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;

// Export queryClient để logout có thể clear cache
export { queryClient };
