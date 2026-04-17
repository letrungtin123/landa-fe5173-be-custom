import { useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { mockUser, mockCourse } from "@/data/mock";

export function ProgressRing() {
  const svgRef = useRef<SVGCircleElement>(null);
  const progress = mockUser.overallProgress;
  const circumference = 2 * Math.PI * 45; // radius = 45
  const offset = circumference - (progress / 100) * circumference;

  useEffect(() => {
    if (svgRef.current) {
      svgRef.current.style.setProperty(
        "--progress-offset",
        offset.toString()
      );
    }
  }, [offset]);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4, delay: 0.2 }}
    >
      <div className="rounded-3xl border border-border/50 bg-card shadow-[0_2px_20px_rgb(0,0,0,0.04)] h-full">
        <div className="flex flex-col items-center justify-center p-8 h-full">
          {/* SVG Ring */}
          <div className="relative mb-6 h-36 w-36">
            <svg className="h-full w-full -rotate-90" viewBox="0 0 100 100">
              {/* Track */}
              <circle
                cx="50"
                cy="50"
                r="42"
                fill="none"
                strokeWidth="8"
                className="stroke-muted/40"
              />
              {/* Progress */}
              <circle
                ref={svgRef}
                cx="50"
                cy="50"
                r="42"
                fill="none"
                strokeWidth="8"
                strokeLinecap="round"
                className="stroke-[#10b981] animate-draw-circle"
                strokeDasharray={circumference}
                strokeDashoffset={circumference}
                style={
                  {
                    "--progress-offset": offset,
                    animation: "drawCircle 1.5s ease-out forwards",
                  } as React.CSSProperties
                }
              />
            </svg>
            {/* Center text */}
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-3xl font-bold text-foreground">
                {progress}%
              </span>
            </div>
          </div>

          <p className="text-sm font-bold text-foreground mb-1">Đã hoàn thành</p>
          <p className="text-sm text-foreground italic mb-6">
            {mockCourse.title}
          </p>

          <Link
            to="/courses/c1/lessons/l-m2-1"
            className="flex items-center gap-1.5 text-sm font-medium text-[#1877F2] transition-colors hover:text-[#1877F2]/80 mt-auto"
          >
            Tiếp tục học
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </motion.div>
  );
}
