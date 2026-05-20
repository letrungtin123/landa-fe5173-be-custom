import React from "react";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

interface ProgressRingProps {
  progress?: number;
  courseTitle?: string;
  courseLink?: string;
}

export function ProgressRing({
  progress = 0,
  courseTitle = "L&A Onboarding 2026",
  courseLink = "/courses",
}: ProgressRingProps) {
  const circumference = 2 * Math.PI * 42; // radius = 42
  const offset = circumference - (progress / 100) * circumference;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4, delay: 0.2 }}
      className="h-[297px]"
    >
      <div className="rounded-[32px] border border-border/50 bg-card h-full">
        <div className="flex flex-col items-center pt-5 pb-5 px-8 h-full">
          {/* SVG Ring */}
          <div className="relative -mb-1 h-36 w-36 shrink-0">
            <svg className="h-full w-full -rotate-90" viewBox="0 0 100 100">
              {/* Track */}
              <circle
                cx="50"
                cy="50"
                r="42"
                fill="none"
                strokeWidth="5"
                className="stroke-muted/40"
              />
              {/* Progress */}
              <motion.circle
                cx="50"
                cy="50"
                r="42"
                fill="none"
                strokeWidth="5"
                strokeLinecap="round"
                className="stroke-success"
                strokeDasharray={`${circumference} ${circumference}`}
                initial={{ strokeDashoffset: circumference }}
                animate={{ strokeDashoffset: offset }}
                transition={{ duration: 1.5, ease: "easeOut" }}
              />
            </svg>
            {/* Center text */}
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-[24px] font-medium text-foreground">
                {progress.toLocaleString('vi-VN', { maximumFractionDigits: 1 })}%
              </span>
            </div>
          </div>

          <p className="text-[17px] font-bold text-foreground mb-1">Đã hoàn thành</p>
          <p
            className="w-full text-center text-[14px] text-foreground italic mb-6 truncate"
            title={courseTitle}
          >
            {courseTitle}
          </p>

          {/* Tạm ẩn nút Tiếp tục học
          <Link
            to={courseLink}
            className="flex items-center gap-1.5 text-[15px] font-medium text-primary transition-colors hover:text-primary/80 mt-auto"
          >
            Tiếp tục học
            <ArrowRight className="h-4 w-4" />
          </Link>
          */}
          <div className="mt-auto" />
        </div>
      </div>
    </motion.div>
  );
}
