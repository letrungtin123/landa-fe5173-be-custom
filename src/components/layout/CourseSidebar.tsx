import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, X } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/stores/useAppStore";
import { mockCourse } from "@/data/mock";

export function CourseSidebar() {
  const navigate = useNavigate();
  const {
    currentModuleId,
    currentLessonId,
    setCurrentLesson,
    sidebarOpen,
    setSidebarOpen,
  } = useAppStore();



  const handleLessonClick = (moduleId: string, lessonId: string) => {
    setCurrentLesson(moduleId, lessonId);
    navigate(`/courses/c1/lessons/${lessonId}`);
    setSidebarOpen(false);
  };

  const sidebarContent = (
    <ScrollArea className="h-full">
      <div className="py-5">
        {/* Course Title */}
        <div className="px-5 mb-6">
          <h2 className="mb-4 text-[19px] font-bold text-foreground">
            {mockCourse.title}
          </h2>
          <p className="text-[13px] font-bold text-[#1877F2]">
            Nội dung khoá học
          </p>
        </div>

        {/* Modules */}
        <div className="flex flex-col">
          {mockCourse.modules.map((module) => {
            const isActiveModule = module.id === currentModuleId;
            
            return (
              <div key={module.id} className="mb-4">
                {/* Module Header */}
                <div className={cn(
                  "px-5 py-3 mb-2 flex items-center justify-between",
                  isActiveModule && "bg-[#F5F9FF] border-l-4 border-[#1877F2]"
                )}>
                  <p className={cn(
                    "text-[14px] font-bold",
                    isActiveModule ? "text-[#1877F2]" : "text-[#A3A3A3]"
                  )}>
                    {module.title}
                  </p>
                  {module.completed && (
                    <CheckCircle2 className="h-4 w-4 text-[#10B981]" fill="currentColor" opacity={0.2} stroke="white" strokeWidth={2} />
                  )}
                </div>

                {/* Lessons List */}
                <div className="flex flex-col">
                  {module.lessons.map((lesson) => {
                    const isActive = lesson.id === currentLessonId;
                    return (
                      <button
                        key={lesson.id}
                        onClick={() => handleLessonClick(module.id, lesson.id)}
                        className={cn(
                          "flex w-full text-left transition-colors py-2.5 pl-[38px] pr-5",
                          isActive
                            ? "text-[#1877F2] font-semibold"
                            : "text-[#A3A3A3] font-medium hover:text-foreground"
                        )}
                      >
                        <span className="text-[14px] leading-snug">
                          {lesson.title}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </ScrollArea>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden w-[320px] shrink-0 border-r border-border bg-sidebar lg:block">
        {sidebarContent}
      </aside>

      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {sidebarOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-black lg:hidden"
              onClick={() => setSidebarOpen(false)}
            />
            <motion.aside
              initial={{ x: -320 }}
              animate={{ x: 0 }}
              exit={{ x: -320 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="fixed inset-y-0 left-0 z-50 w-[320px] border-r border-border bg-background shadow-xl lg:hidden"
            >
              <div className="flex items-center justify-between border-b border-border px-4 py-3">
                <span className="text-sm font-semibold">Menu</span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setSidebarOpen(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              {sidebarContent}
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
