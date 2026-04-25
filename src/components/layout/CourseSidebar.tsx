import { useNavigate, useParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, X, BookOpen } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/stores/useAppStore";
import { useCourseStructure } from "@/hooks/useCourses";


export function CourseSidebar() {
  const navigate = useNavigate();
  const { courseId } = useParams();
  const {
    currentModuleId,
    currentLessonId,
    setCurrentLesson,
    sidebarOpen,
    setSidebarOpen,
  } = useAppStore();

  // Use real course structure from API
  const { data: course, isLoading } = useCourseStructure(courseId || "");

  const handleLessonClick = (moduleId: string, lessonId: string) => {
    setCurrentLesson(moduleId, lessonId);
    navigate(`/courses/${encodeURIComponent(courseId || "c1")}/lessons/${lessonId}`);
    setSidebarOpen(false);
  };

  const sidebarContent = (
    <ScrollArea className="h-full">
      <div className="py-5">
        {/* Loading */}
        {isLoading && (
          <div className="flex flex-col gap-5 px-5 py-4">
            <div className="space-y-3">
              <Skeleton className="h-6 w-3/4 rounded-md" />
              <Skeleton className="h-3 w-1/2 rounded-md" />
            </div>
            
            <div className="space-y-6 mt-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="space-y-3">
                  <div className="flex gap-3 items-center">
                    <Skeleton className="h-4 w-4 rounded-full" />
                    <Skeleton className="h-4 w-full rounded-md" />
                  </div>
                  <div className="flex flex-col gap-2 pl-7 mt-2">
                    <Skeleton className="h-3 w-5/6 rounded-md" />
                    <Skeleton className="h-3 w-4/5 rounded-md" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {!isLoading && !course && (
          <div className="flex flex-col items-center px-5 py-8 text-center">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
              <BookOpen className="h-6 w-6 text-muted-foreground/50" />
            </div>
            <p className="text-sm text-muted-foreground">Không tìm thấy nội dung khóa học</p>
          </div>
        )}

        {/* Course Content */}
        {course && (
          <>
            {/* Course Title */}
            <div className="px-5 mb-5 mt-3">
              <h2 className="mb-2 text-[18px] font-extrabold text-foreground tracking-tight leading-tight">
                {course.title || "L&A Onboarding 2026"}
              </h2>
              <p className="text-[13px] font-bold text-primary">
                Nội dung khoá học
              </p>
            </div>

            {/* Modules */}
            <div className="flex flex-col gap-1">
              {course.modules.map((module) => {
                const isActiveModule = module.id === currentModuleId;
                const completedLessons = module.lessons.filter(l => l.completed).length;
                const totalLessons = module.lessons.length;
                
                return (
                  <div key={module.id} className="mb-3">
                    {/* Module Header */}
                    <div className={cn(
                      "py-2 mb-1 border-l-4",
                      isActiveModule ? "border-primary bg-primary/5" : "border-transparent"
                    )}>
                      <div className="flex-1 min-w-0 pl-[16px] pr-5">
                        <div className="flex items-start gap-1.5">
                          <p className={cn(
                            "text-[14px] font-bold leading-snug flex-1",
                            isActiveModule ? "text-primary" : "text-muted-foreground"
                          )}>
                            {module.title}
                          </p>
                          {module.completed && (
                            <CheckCircle2 className="h-4 w-4 text-success shrink-0 mt-0.5" fill="currentColor" stroke="white" strokeWidth={2} />
                          )}
                        </div>
                        {/* Subtext: progress count + duration nếu có */}
                        <p className="text-[10px] font-semibold text-muted-foreground mt-1 tracking-wider uppercase">
                          {completedLessons}/{totalLessons}{module.duration ? ` | ${module.duration}` : ""}
                        </p>
                      </div>
                    </div>

                    {/* Lessons List */}
                    <div className="flex flex-col gap-0.5">
                      {module.lessons.map((lesson) => {
                        const isActive = lesson.id === currentLessonId;
                        return (
                          <button
                            key={lesson.id}
                            onClick={() => handleLessonClick(module.id, lesson.id)}
                            className={cn(
                              "flex w-full items-center gap-2 text-left py-1.5 pl-[20px] pr-5 transition-all",
                              isActive
                                ? "text-primary font-bold bg-primary/5"
                                : "text-muted-foreground hover:text-foreground hover:bg-muted/50 font-medium"
                            )}
                          >
                            {/* Completion indicator */}
                            <span className="ml-[12px] shrink-0">
                              {lesson.completed ? (
                                <CheckCircle2 className="h-3.5 w-3.5 text-success" fill="currentColor" stroke="white" strokeWidth={2} />
                              ) : (
                                <span className="inline-block h-3.5 w-3.5 rounded-full border-2 border-muted-foreground/30" />
                              )}
                            </span>
                            <span className="text-[13px] leading-snug">
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
          </>
        )}
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
