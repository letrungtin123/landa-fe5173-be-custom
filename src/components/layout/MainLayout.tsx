import { Outlet, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import { Header } from "./Header";
import { BottomNav } from "./BottomNav";
import { PageTransition } from "./PageTransition";
import { useAuthStore } from "@/stores/useAuthStore";
import {
  DEMO_IFRAME_FLOW_LOCK_EVENT,
  type DemoIframeFlowLockDetail,
} from "@/utils/demoIframeDashboardGuide";

export function MainLayout() {
  const location = useLocation();
  const sessionMode = useAuthStore((s) => s.sessionMode);
  const isDemoIframe = sessionMode === "demo_iframe";
  const [demoFlowLockSources, setDemoFlowLockSources] = useState<Set<string>>(new Set());
  const isCourseRoute = location.pathname.startsWith("/courses");
  const routeKey = isCourseRoute ? "courses" : location.pathname;
  const demoFlowLocked = isDemoIframe && demoFlowLockSources.size > 0;

  useEffect(() => {
    const handleDemoFlowLock = (event: Event) => {
      const detail = (event as CustomEvent<DemoIframeFlowLockDetail>).detail;
      if (!detail?.source) return;

      setDemoFlowLockSources((current) => {
        const next = new Set(current);
        if (detail.locked) {
          next.add(detail.source);
        } else {
          next.delete(detail.source);
        }
        return next;
      });
    };

    window.addEventListener(DEMO_IFRAME_FLOW_LOCK_EVENT, handleDemoFlowLock);
    return () => {
      window.removeEventListener(DEMO_IFRAME_FLOW_LOCK_EVENT, handleDemoFlowLock);
    };
  }, []);

  useEffect(() => {
    if (!isDemoIframe) {
      setDemoFlowLockSources(new Set());
    }
  }, [isDemoIframe]);

  return (
    <div className="flex min-h-screen flex-col bg-background pb-16 lg:pb-0">
      <div className={demoFlowLocked ? "pointer-events-none" : undefined}>
        <Header />
      </div>
      <PageTransition animationKey={routeKey}>
        <Outlet />
      </PageTransition>
      <div className={demoFlowLocked ? "pointer-events-none" : undefined}>
        <BottomNav />
      </div>
    </div>
  );
}
