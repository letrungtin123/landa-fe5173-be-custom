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
      className="h-[300px]"
    >
      <div className="rounded-[32px] border border-border/50 bg-card shadow-[0_2px_20px_rgb(0,0,0,0.04)] h-full">
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
              <motion.circle
                cx="50"
                cy="50"
                r="42"
                fill="none"
                strokeWidth="8"
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
              <span className="text-3xl font-bold text-foreground">
                {progress}%
              </span>
            </div>
          </div>

          <p className="text-sm font-bold text-foreground mb-1">Đã hoàn thành</p>
          <p className="text-sm text-foreground italic mb-6">
            {courseTitle}
          </p>

          <Link
            to={courseLink}
            className="flex items-center gap-1.5 text-sm font-medium text-primary transition-colors hover:text-primary/80 mt-auto"
          >
            Tiếp tục học
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </motion.div>
  );
}
