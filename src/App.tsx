import React, { Suspense, useState, useEffect } from "react";
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useLocation,
} from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "@/components/providers/ThemeProvider";
import { LocaleProvider } from "@/components/providers/LocaleProvider";
import { MainLayout } from "@/components/layout/MainLayout";
import { CourseLayout } from "@/components/layout/CourseLayout";
import { GlobalBadgeWatcher } from "@/components/badges/GlobalBadgeWatcher";
import { StudyTimeTracker } from "@/components/global/StudyTimeTracker";
import { WelcomeInitModal } from "@/components/global/WelcomeInitModal";
import { useAuthStore } from "@/stores/useAuthStore";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { useTranslation } from "react-i18next";

import ChatWidget from "@/components/chat-widget/chat-widget";
import { exchangeOttApi } from "@/api/auth";

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
    .then((result) => useAuthStore.getState().setSession(result))
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
const AssignmentDetailPage = React.lazy(() =>
  import("@/pages/AssignmentDetailPage").then(m => ({ default: m.AssignmentDetailPage }))
);
const BadgesPage = React.lazy(() =>
  import("@/pages/BadgesPage").then(m => ({ default: m.BadgesPage }))
);
const NewsPage = React.lazy(() =>
  import("@/pages/NewsPage").then(m => ({ default: m.NewsPage }))
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
const DemoIframeEmbedPage = React.lazy(() =>
  import("@/pages/DemoIframeEmbedPage").then(m => ({ default: m.DemoIframeEmbedPage }))
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
  const { t } = useTranslation();
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary/30 border-t-primary" />
        <p className="text-sm text-muted-foreground">{t("common.loading")}</p>
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
  const sessionMode = useAuthStore((s) => s.sessionMode);
  const tenantModules = useAuthStore((s) => s.tenantModules);
  const badgesEnabled = tenantModules.includes("badge_management") && sessionMode !== "demo_iframe";
  const location = useLocation();
  if (!isAuthenticated) {
    const next = `${location.pathname}${location.search}${location.hash}`;
    return <Navigate to={`/login?next=${encodeURIComponent(next)}`} replace />;
  }
  return (
    <>
      <WelcomeInitModal />
      {/* Global badge watcher — hiện modal khi earn badge mới bất kể đang ở route nào */}
      {badgesEnabled ? <GlobalBadgeWatcher /> : null}
      {/* Global study time tracker — đếm giờ học ngay khi login, mọi route */}
      {sessionMode !== "demo_iframe" ? <StudyTimeTracker /> : null}
      {/* AI Chat Widget — hiện FAB chat trên mọi trang */}
      <ChatWidget />
      {children}
    </>
  );
}
function BadgeRoute() {
  const enabled = useAuthStore((state) => state.tenantModules.includes("badge_management"));
  const ready = useAuthStore((state) => state.tenantContextReady);
  const sessionMode = useAuthStore((state) => state.sessionMode);
  if (!ready) return <PageLoader />;
  return enabled && sessionMode !== "demo_iframe"
    ? <BadgesPage />
    : <Navigate to="/dashboard" replace />;
}

function NewsRouteSkeleton() {
  return (
    <main
      aria-busy="true"
      className="min-h-[calc(100vh-4rem)] bg-gradient-to-b from-primary/[0.045] via-background to-background"
    >
      <section className="border-b border-border/60">
        <div className="mx-auto max-w-[1240px] px-4 py-10 sm:px-6 sm:py-14 lg:px-8">
          <div className="h-10 w-48 animate-pulse rounded-xl bg-muted sm:w-56" />
          <div className="mt-3 h-5 w-full max-w-2xl animate-pulse rounded-lg bg-muted" />
          <div className="mt-7 h-12 w-full max-w-xl animate-pulse rounded-2xl bg-muted" />
        </div>
      </section>
      <section className="mx-auto grid max-w-[1240px] gap-6 px-4 py-8 sm:px-6 sm:py-10 md:grid-cols-2 lg:px-8 xl:grid-cols-3">
        {Array.from({ length: 6 }, (_, index) => (
          <div key={index} className="overflow-hidden rounded-3xl border border-border/70 bg-card shadow-sm">
            <div className="aspect-[16/8] animate-pulse bg-muted" />
            <div className="space-y-3 p-5 sm:p-6">
              <div className="h-4 w-28 animate-pulse rounded bg-muted" />
              <div className="h-7 w-4/5 animate-pulse rounded bg-muted" />
              <div className="h-4 w-full animate-pulse rounded bg-muted" />
              <div className="h-4 w-3/4 animate-pulse rounded bg-muted" />
            </div>
          </div>
        ))}
      </section>
    </main>
  );
}

function NewsRoute() {
  const enabled = useAuthStore((state) => state.tenantModules.includes("news"));
  const ready = useAuthStore((state) => state.tenantContextReady);
  if (!ready) return <NewsRouteSkeleton />;
  return enabled
    ? <Suspense fallback={<NewsRouteSkeleton />}><NewsPage /></Suspense>
    : <Navigate to="/dashboard" replace />;
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
          <LocaleProvider>
          <ThemeProvider>
            <OttGate>
            <BrowserRouter>
              <Suspense fallback={<PageLoader />}>
                <Routes>
                {/* Route công khai */}
                <Route path="/login" element={<LoginPage />} />
                <Route path="/register" element={<RegisterPage />} />
                <Route path="/demo-login" element={<DemoQrLoginPage />} />
                <Route path="/demo-embed" element={<DemoIframeEmbedPage />} />


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
                  <Route path="/news" element={<NewsRoute />} />
                  <Route path="/news/:postId" element={<NewsRoute />} />
                  <Route path="/badges" element={<BadgeRoute />} />
                  <Route path="/profile" element={<ProfilePage />} />
                  <Route path="/courses" element={<CoursesPage />} />

                  <Route path="/courses/:courseId" element={<CourseLayout />}>
                    <Route
                      path="lessons/:lessonId"
                      element={<LessonDetailPage />}
                    />
                    <Route
                      path="assignments/:assignmentId"
                      element={<AssignmentDetailPage />}
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
          </LocaleProvider>

      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;

// Export queryClient để logout có thể clear cache
export { queryClient };
