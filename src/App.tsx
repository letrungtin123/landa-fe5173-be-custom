// ============================================================
// App — Root Application Component
// Tất cả role (learner, mentor, admin) đều vào FE học tập
// Staff/Admin có thể truy cập Studio/Admin qua link riêng
// ============================================================

import React, { Suspense } from "react";
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
import { useAuthStore } from "@/stores/useAuthStore";
import { ErrorBoundary } from "@/components/ErrorBoundary";

// ── Lazy-load pages — giảm initial bundle size ──
const DashboardPage = React.lazy(() =>
  import("@/pages/DashboardPage").then((m) => ({ default: m.DashboardPage }))
);
const CoursesPage = React.lazy(() =>
  import("@/pages/CoursesPage").then((m) => ({ default: m.CoursesPage }))
);
const ExplorePage = React.lazy(() =>
  import("@/pages/ExplorePage").then((m) => ({ default: m.ExplorePage }))
);
const LibraryPage = React.lazy(() =>
  import("@/pages/LibraryPage").then((m) => ({ default: m.LibraryPage }))
);
const LessonDetailPage = React.lazy(() =>
  import("@/pages/LessonDetailPage").then((m) => ({
    default: m.LessonDetailPage,
  }))
);
const BadgesPage = React.lazy(() =>
  import("@/pages/BadgesPage").then((m) => ({ default: m.BadgesPage }))
);
const ProfilePage = React.lazy(() =>
  import("@/pages/ProfilePage").then((m) => ({ default: m.ProfilePage }))
);
const LoginPage = React.lazy(() =>
  import("@/pages/LoginPage").then((m) => ({ default: m.LoginPage }))
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
      {/* Global badge watcher — hiện modal khi earn badge mới bất kể đang ở route nào */}
      <GlobalBadgeWatcher />
      {children}
    </>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <BrowserRouter>
            <Suspense fallback={<PageLoader />}>
              <Routes>
                {/* Route công khai */}
                <Route path="/login" element={<LoginPage />} />

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
        </ThemeProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;

// Export queryClient để logout có thể clear cache
export { queryClient };
