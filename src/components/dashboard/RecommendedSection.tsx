import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, Lightbulb } from "lucide-react";
import { createPortal } from "react-dom";
import { Link } from "react-router-dom";
import { useBranding } from "@/hooks/useBranding";
import { cn } from "@/lib/utils";
import {
  DEMO_IFRAME_GUIDE_SCROLL_LONG_MS,
  scrollDemoIframeElementToCenter,
} from "@/utils/demoIframeSmoothScroll";

import heroImg from "@/assets/DasboardPage/hero-card-dashboard.png";

const DEFAULT_TIPS = [
  {
    quote: "“Hãy là sự thay đổi mà bạn muốn thấy ở thế giới này”",
    author: "Mahatma Gandhi"
  },
  {
    quote: "“Cách tốt nhất để dự đoán tương lai là tự mình tạo ra nó”",
    author: "Abraham Lincoln"
  }
];

const DEFAULT_BADGE = "SKILLS";
const DEMO_IFRAME_DASHBOARD_CTA_MOBILE_SCROLL_MS = 980;
const DEFAULT_TITLE = "Khai phá tiềm năng từ kho tri thức đặc biệt";

interface RecommendedSectionProps {
  demoCtaGuideActive?: boolean;
  onDemoCtaGuideClick?: () => void;
}

export function RecommendedSection({
  demoCtaGuideActive = false,
  onDemoCtaGuideClick,
}: RecommendedSectionProps) {
  const [currentTip, setCurrentTip] = useState(0);
  const [floatingCtaRect, setFloatingCtaRect] = useState<{
    top: number;
    left: number;
    width: number;
    height: number;
  } | null>(null);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const demoCtaRef = useRef<HTMLAnchorElement | null>(null);
  const { branding } = useBranding();
  const dc = branding.dashboardContent;

  // Dynamic data with fallbacks
  const badge = dc?.hero_badge || DEFAULT_BADGE;
  const title = dc?.hero_title || DEFAULT_TITLE;
  const tips = dc?.tips?.length
    ? dc.tips.map(t => ({ quote: t.title, author: t.desc }))
    : DEFAULT_TIPS;

  const goToTip = (direction: 1 | -1) => {
    if (tips.length <= 1) return;
    setCurrentTip((current) => (current + direction + tips.length) % tips.length);
  };

  const handleTipTouchStart = (event: React.TouchEvent<HTMLDivElement>) => {
    const touch = event.touches[0];
    touchStartRef.current = { x: touch.clientX, y: touch.clientY };
  };

  const handleTipTouchEnd = (event: React.TouchEvent<HTMLDivElement>) => {
    const start = touchStartRef.current;
    const touch = event.changedTouches[0];
    touchStartRef.current = null;

    if (!start || !touch) return;

    const deltaX = touch.clientX - start.x;
    const deltaY = touch.clientY - start.y;

    if (Math.abs(deltaX) < 40 || Math.abs(deltaX) <= Math.abs(deltaY)) return;

    goToTip(deltaX < 0 ? 1 : -1);
  };

  useEffect(() => {
    if (!demoCtaGuideActive) {
      setFloatingCtaRect(null);
      return;
    }

    let rafId = 0;
    let cancelGuideScroll: (() => void) | null = null;
    const timers: number[] = [];
    const updateFloatingRect = () => {
      const rect = demoCtaRef.current?.getBoundingClientRect();
      if (!rect) return;
      setFloatingCtaRect({
        top: rect.top,
        left: rect.left,
        width: rect.width,
        height: rect.height,
      });
    };
    const scheduleFloatingRectUpdate = () => {
      if (rafId) window.cancelAnimationFrame(rafId);
      rafId = window.requestAnimationFrame(updateFloatingRect);
    };

    const isMobileViewport = window.matchMedia("(max-width: 767px)").matches;
    const scrollDurationMs = isMobileViewport
      ? DEMO_IFRAME_DASHBOARD_CTA_MOBILE_SCROLL_MS
      : DEMO_IFRAME_GUIDE_SCROLL_LONG_MS;

    if (isMobileViewport) {
      setFloatingCtaRect(null);
    }

    if (demoCtaRef.current) {
      cancelGuideScroll = scrollDemoIframeElementToCenter(demoCtaRef.current, {
        durationMs: scrollDurationMs,
        easing: isMobileViewport ? "sine" : "cubic",
        onUpdate: isMobileViewport ? undefined : updateFloatingRect,
        onComplete: updateFloatingRect,
      });
    }
    if (isMobileViewport) {
      timers.push(
        window.setTimeout(updateFloatingRect, scrollDurationMs + 80),
        window.setTimeout(updateFloatingRect, scrollDurationMs + 260)
      );
    } else {
      updateFloatingRect();
      timers.push(
        window.setTimeout(updateFloatingRect, 120),
        window.setTimeout(updateFloatingRect, 420),
        window.setTimeout(updateFloatingRect, 760),
        window.setTimeout(updateFloatingRect, 1220),
        window.setTimeout(updateFloatingRect, 1820)
      );
    }

    const focusTimer = window.setTimeout(() => {
      demoCtaRef.current?.focus({ preventScroll: true });
    }, scrollDurationMs + 120);
    timers.push(focusTimer);

    window.addEventListener("resize", scheduleFloatingRectUpdate);
    window.addEventListener("scroll", scheduleFloatingRectUpdate, true);

    return () => {
      cancelGuideScroll?.();
      timers.forEach((timer) => window.clearTimeout(timer));
      if (rafId) window.cancelAnimationFrame(rafId);
      window.removeEventListener("resize", scheduleFloatingRectUpdate);
      window.removeEventListener("scroll", scheduleFloatingRectUpdate, true);
    };
  }, [demoCtaGuideActive]);

  const floatingCtaSize = floatingCtaRect
    ? {
      width: Math.max(floatingCtaRect.width, 188),
      height: Math.max(floatingCtaRect.height, 48),
    }
    : null;
  const floatingCtaPosition = floatingCtaRect && floatingCtaSize && typeof window !== "undefined"
    ? {
      left: Math.min(
        Math.max(floatingCtaRect.left, 16),
        Math.max(16, window.innerWidth - floatingCtaSize.width - 16)
      ),
      top: Math.min(
        Math.max(
          floatingCtaRect.top + floatingCtaRect.height / 2 - floatingCtaSize.height / 2,
          16
        ),
        Math.max(16, window.innerHeight - floatingCtaSize.height - 16)
      ),
    }
    : null;

  return (
    <>
    <div className="w-full mt-10">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl md:text-2xl font-bold tracking-tight text-foreground">
          Đề xuất dành cho bạn
        </h2>
        <Link onClick={() => window.scrollTo(0, 0)} to="/explore" className="text-sm font-medium text-primary hover:underline">
          Xem tất cả
        </Link>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Hero Card */}
        <div
          className="relative flex-1 overflow-hidden rounded-[20px] md:rounded-[32px] min-h-[220px] lg:h-[310px] shadow-sm flex flex-col justify-between p-6 md:p-8"
          style={{
            border: '1.5px solid hsl(var(--primary))',
            backgroundColor: 'hsl(var(--primary) / 0.04)',
          }}
        >
          <div className="relative z-10 w-[55%] md:w-[50%] lg:w-[60%]">
            <div
              className="mb-4 inline-flex w-fit whitespace-nowrap items-center justify-center h-[23px] rounded-[41px] px-3 py-1 text-[10px] font-bold uppercase tracking-widest"
              style={{ backgroundColor: "#43FDD7", color: "#000" }}
            >
              {badge}
            </div>
            <h3 className="mb-4 text-[17px] md:text-[24px] lg:text-[26px] font-bold leading-[1.4] text-foreground md:leading-tight">
              {title}
            </h3>
          </div>

          <Link
            ref={demoCtaRef}
            to="/explore"
            onClick={demoCtaGuideActive ? onDemoCtaGuideClick : undefined}
            aria-label="Bắt đầu ngay"
            className={cn(
              "relative z-10 mt-auto inline-flex w-fit items-center gap-1 text-sm font-semibold text-primary outline-none transition hover:underline focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
              demoCtaGuideActive && "pointer-events-none opacity-0"
            )}
          >
            Bắt đầu ngay <ArrowRight className="w-4 h-4" />
          </Link>

          {/* Image */}
          <div className="absolute right-2 md:right-0 top-0 bottom-0 md:top-auto h-full w-[50%] md:w-[45%] lg:w-[40%] flex items-center md:items-end justify-end md:pr-8 md:py-6 pointer-events-none select-none z-0">
            <img
              src={heroImg}
              alt="Illustration"
              className="max-h-[85%] md:max-h-full h-[75%] md:h-full w-auto object-contain object-right md:object-right-bottom"
            />
          </div>
        </div>

        {/* Tips Card */}
        <div
          className="relative w-full lg:w-[240px] shrink-0 rounded-[20px] md:rounded-[32px] p-6 flex flex-col shadow-sm touch-pan-y"
          onTouchStart={handleTipTouchStart}
          onTouchEnd={handleTipTouchEnd}
          style={{ backgroundColor: 'hsl(var(--primary) / 0.04)' }}
        >
          {/* Header */}
          <div className="flex items-center gap-2 mb-4 lg:mb-6 text-foreground">
            <Lightbulb className="w-6 h-6" strokeWidth={2.2} />
            <h3 className="text-xl font-bold">Tips</h3>
          </div>

          {/* Content (Quote + Author) */}
          <div className="relative min-h-[80px] lg:min-h-[140px] flex-1">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentTip}
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.2 }}
                className="absolute inset-0 flex flex-col justify-between lg:justify-start lg:gap-4"
              >
                <p className="text-[15px] lg:text-[17px] font-bold leading-[1.6] text-foreground pr-4 lg:pr-0">
                  {tips[currentTip].quote}
                </p>
                <footer className="text-[13px] lg:text-[15px] text-muted-foreground italic mt-auto lg:mt-0">
                  {tips[currentTip].author}
                </footer>
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Footer (Dots) */}
          <div className="absolute lg:static bottom-[26px] lg:bottom-auto right-6 lg:right-auto flex items-center gap-1.5 lg:mt-auto lg:pt-6 lg:ml-1">
            {tips.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentTip(idx)}
                className={`w-1.5 h-1.5 rounded-full transition-colors ${currentTip === idx ? "bg-primary" : "bg-primary/20 hover:bg-primary/40"}`}
                aria-label={`Go to tip ${idx + 1}`}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
    {demoCtaGuideActive && floatingCtaPosition && floatingCtaSize && typeof document !== "undefined"
      ? createPortal(
        <Link
          to="/explore"
          onClick={onDemoCtaGuideClick}
          aria-label="Bắt đầu ngay"
          className="demo-iframe-hero-cta-guide fixed z-[99990] inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full px-6 text-sm font-semibold leading-none text-[#075985] outline-none focus-visible:ring-2 focus-visible:ring-[#38bdf8] focus-visible:ring-offset-2"
          style={{
            left: `${floatingCtaPosition.left}px`,
            top: `${floatingCtaPosition.top}px`,
            width: `${floatingCtaSize.width}px`,
            height: `${floatingCtaSize.height}px`,
          }}
        >
          <span className="demo-iframe-hero-cta-echo" aria-hidden="true" />
          <span className="relative z-10">Bắt đầu ngay</span>
          <ArrowRight className="relative z-10 h-4 w-4" />
        </Link>,
        document.body
      )
      : null}
    </>
  );
}
