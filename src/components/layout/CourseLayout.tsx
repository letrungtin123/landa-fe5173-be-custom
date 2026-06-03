import { useEffect, useRef } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { CourseSidebar } from "./CourseSidebar";
import { PageTransition } from "./PageTransition";
import { useBlockSubmitStore } from "@/stores/useBlockSubmitStore";

const RELOAD_FLAG = "la-page-reloading";

export function CourseLayout() {
  const location = useLocation();
  const processedRef = useRef(false);

  useEffect(() => {
    // Guard: chỉ xử lý 1 lần (tránh StrictMode double-mount xóa flag sai)
    if (!processedRef.current) {
      processedRef.current = true;

      const isReload = sessionStorage.getItem(RELOAD_FLAG);
      if (isReload) {
        // F5 reload → giữ nguyên store, chỉ xóa flag
        sessionStorage.removeItem(RELOAD_FLAG);
        // Reset scroll position để tránh browser restore scroll cũ → ẩn unit đầu tiên
        requestAnimationFrame(() => {
          const el = document.getElementById("course-main-scroll");
          if (el) el.scrollTop = 0;
        });
      } else {
        // Navigate vào từ route khác → clear store, learner làm lại
        useBlockSubmitStore.getState().clearAll();
      }
    }

    // beforeunload CHỈ fire khi full page reload (F5, close tab)
    // KHÔNG fire khi SPA navigate → dùng để phân biệt 2 trường hợp
    const handleBeforeUnload = () => {
      sessionStorage.setItem(RELOAD_FLAG, "1");
    };
    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, []);

  return (
    <div className="flex h-[calc(100vh-8rem)] lg:h-[calc(100vh-4rem)] overflow-hidden">
      {/* Sidebar with sticky/independent scroll */}
      <CourseSidebar />

      {/* Main Content Area */}
      <div id="course-main-scroll" className="flex-1 overflow-y-auto relative bg-background">
        <PageTransition animationKey={location.pathname}>
          <Outlet />
        </PageTransition>
      </div>
    </div>
  );
}
