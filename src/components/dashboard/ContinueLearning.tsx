import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { mockContinueCourses } from "@/data/mock";

export function ContinueLearning() {
  return (
    <div>
      {/* Section Header */}
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-bold text-foreground">Tiếp tục học</h2>
        <Link
          to="/courses"
          className="flex items-center gap-1 text-sm font-medium text-accent transition-colors hover:text-accent/80"
        >
          Xem tất cả
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      {/* Course Cards Grid */}
      <div className="grid gap-6 sm:grid-cols-2">
        {mockContinueCourses.map((course, index) => (
          <motion.div
            key={course.id}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.15 * index }}
          >
            <Link to="/courses/c1/lessons/l-m2-1">
              <div className="group flex h-[180px] overflow-hidden rounded-2xl border border-border shadow-[0_2px_10px_rgb(0,0,0,0.02)] bg-card transition-all duration-200 hover:shadow-md hover:scale-[1.02]">
                {/* Thumbnail */}
                <div className="w-[35%] shrink-0 bg-muted relative">
                  <img
                    src={index === 0 ? "https://images.unsplash.com/photo-1600880292203-757bb62b4baf?w=500&q=80" : "https://images.unsplash.com/photo-1501139083538-0139583c060f?w=500&q=80"}
                    alt={course.title}
                    className="h-full w-full object-cover"
                  />
                  <div className="absolute inset-0 bg-black/5 group-hover:bg-transparent transition-colors" />
                </div>

                {/* Content */}
                <div className="flex flex-col p-5 w-[65%]">
                  <div className="mb-2 w-full flex items-center gap-1.5 text-[11px] font-bold text-[#1877F2]">
                    <span>{course.moduleLabel}</span>
                    <span className="text-muted-foreground/40">•</span>
                    <span className="truncate">{course.lessonLabel}</span>
                  </div>
                  
                  <h3 className="text-[17px] font-bold text-foreground leading-snug group-hover:text-[#1877F2] transition-colors line-clamp-2">
                    {course.title}
                  </h3>
                  
                  <div className="mt-auto">
                    <div className="h-1 w-8 bg-[#1877F2] rounded-full mb-3" />
                    <span className="flex items-center gap-1 text-[13px] font-bold text-[#1877F2]">
                      Tiếp tục học
                      <ArrowRight className="h-3.5 w-3.5" />
                    </span>
                  </div>
                </div>
              </div>
            </Link>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
