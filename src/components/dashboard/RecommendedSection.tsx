import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, Lightbulb } from "lucide-react";
import { Link } from "react-router-dom";
import { useBranding } from "@/hooks/useBranding";

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
const DEFAULT_TITLE = "Khai phá tiềm năng từ kho tri thức đặc biệt";

export function RecommendedSection() {
  const [currentTip, setCurrentTip] = useState(0);
  const { branding } = useBranding();
  const dc = branding.dashboardContent;

  // Dynamic data with fallbacks
  const badge = dc?.hero_badge || DEFAULT_BADGE;
  const title = dc?.hero_title || DEFAULT_TITLE;
  const tips = dc?.tips?.length
    ? dc.tips.map(t => ({ quote: t.title, author: t.desc }))
    : DEFAULT_TIPS;

  return (
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
          className="relative flex-1 overflow-hidden rounded-[32px] min-h-[220px] lg:h-[310px] shadow-sm flex flex-col justify-between p-6 md:p-8"
          style={{
            border: '1.5px solid hsl(var(--primary))',
            backgroundColor: 'hsl(var(--primary) / 0.04)',
          }}
        >
          <div className="relative z-10 w-[55%] md:w-[50%] lg:w-[60%]">
            <div
              className="mb-4 inline-flex w-fit whitespace-nowrap items-center justify-center h-[23px] rounded-[41px] px-3 py-1 text-[10px] font-bold uppercase tracking-widest font-['SF_Pro',_sans-serif]"
              style={{ backgroundColor: "#43FDD7", color: "#000" }}
            >
              {badge}
            </div>
            <h3 className="mb-4 text-[17px] md:text-[24px] lg:text-[26px] font-bold leading-[1.4] text-foreground md:leading-tight">
              {title}
            </h3>
          </div>

          <Link
            to="/explore"
            className="relative z-10 mt-auto inline-flex items-center text-sm font-semibold text-primary hover:underline gap-1 w-fit"
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
          className="relative w-full lg:w-[240px] shrink-0 rounded-[32px] p-6 flex flex-col shadow-sm"
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
  );
}
