import { useState, useMemo, type ReactNode } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, CheckCircle2, X, BookOpen, FileText, File, FileSpreadsheet, Download, User, Mail, Phone, Shield, ClipboardList, Lock } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/stores/useAppStore";
import { useCourseStructure, useCourse } from "@/hooks/useCourses";
import { useCourseFiles, type CourseFile } from "@/hooks/useCourseFiles";
import { useCourseAssignments } from "@/hooks/useAssignments";
import { storageUrl } from "@/utils/storageUrl";
import type { Mentor } from "@/data/types";
import { useThemeStore } from "@/stores/useThemeStore";
import { MentorSidebar } from "@/components/lesson/MentorSidebar";

function getDocIcon(ext: string) {
  if (ext === 'pdf') return FileText;
  if (['doc', 'docx'].includes(ext)) return File;
  if (['xls', 'xlsx', 'csv'].includes(ext)) return FileSpreadsheet;
  return File;
}

function getMentorRoleLabel(role?: string | null) {
  if (role === 'instructor') return 'Giảng viên';
  if (role === 'staff') return 'Trợ giảng';
  return role || 'Trợ giảng';
}

function SidebarTooltip({
  text,
  children,
  side = "right",
}: {
  text: string;
  children: ReactNode;
  side?: "top" | "right" | "bottom" | "left";
}) {
  if (!text.trim()) return <>{children}</>;

  return (
    <Tooltip delayDuration={180}>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent
        side={side}
        align="center"
        sideOffset={10}
        className="max-w-[280px] rounded-xl border border-border/80 bg-popover px-3.5 py-2.5 text-popover-foreground shadow-[0_16px_36px_rgba(15,23,42,0.18)] dark:shadow-[0_16px_36px_rgba(0,0,0,0.42)]"
      >
        <div className="flex items-start gap-2">
          <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
          <p className="text-[12px] font-semibold leading-snug tracking-normal">
            {text}
          </p>
        </div>
      </TooltipContent>
    </Tooltip>
  );
}


export function CourseSidebar() {
  const navigate = useNavigate();
  const location = useLocation();
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
  const { data: courseDetail } = useCourse(courseId || "");
  const { data: refDocs = [] } = useCourseFiles(courseId || "");
  const { data: assignments = [] } = useCourseAssignments(courseId || "");
  const colorMode = useThemeStore((s) => s.colorMode);

  const mentors = useMemo(() => {
    const courseMentors = courseDetail?.mentors ?? [];
    if (courseMentors.length > 0) {
      return courseMentors.map((mentor): Mentor => {
        const avatar = storageUrl(mentor.avatar || mentor.profile_image_url) || null;
        return {
          id: mentor.id,
          username: mentor.username,
          name: mentor.name || mentor.full_name || mentor.email || "Mentor",
          full_name: mentor.full_name || undefined,
          role: mentor.role || "staff",
          company: mentor.company || "",
          avatar,
          email: mentor.email,
          phone_number: mentor.phone_number || mentor.phone || undefined,
          bio: mentor.bio || undefined,
          profile_image_url: avatar,
          profile_image_url_full: avatar,
        };
      });
    }
    return [];
  }, [courseDetail?.mentors]);

  const mentorSectionDescription = courseDetail?.mentor_section?.description?.trim() || "";
  const mentorSectionLogo = useMemo(() => {
    const section = courseDetail?.mentor_section;
    if (!section) return null;
    const path = colorMode === "dark"
      ? section.logo_dark || section.logo_light
      : section.logo_light || section.logo_dark;
    return storageUrl(path || "") || null;
  }, [
    colorMode,
    courseDetail?.mentor_section?.logo_dark,
    courseDetail?.mentor_section?.logo_light,
  ]);
  const hasMentorSectionInfo = Boolean(mentorSectionDescription || mentorSectionLogo);

  const [activeTab, setActiveTab] = useState<'content' | 'info'>('content');

  const handleLessonClick = (moduleId: string, lessonId: string) => {
    setCurrentLesson(moduleId, lessonId);
    navigate(`/courses/${encodeURIComponent(courseId || "c1")}/lessons/${lessonId}`);
    setSidebarOpen(false);
  };

  const handleAssignmentClick = (assignmentId: string) => {
    navigate(`/courses/${encodeURIComponent(courseId || "c1")}/assignments/${assignmentId}`);
    setSidebarOpen(false);
  };

  const sidebarContent = (
    <TooltipProvider delayDuration={180} skipDelayDuration={80}>
      <div className="h-full overflow-y-auto overflow-x-hidden">
      <div className="w-full max-w-[320px] py-5 overflow-x-hidden">
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
            <div className="px-5 mb-5 mt-3 min-w-0 max-w-full overflow-hidden">
              <SidebarTooltip text={course.title || "L&A Onboarding 2026"}>
                <h2 className="mb-2 block max-w-[280px] truncate text-[18px] font-extrabold text-foreground tracking-tight leading-tight">
                  {course.title || "L&A Onboarding 2026"}
                </h2>
              </SidebarTooltip>
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
                      "py-2 mb-1 border-l-4 overflow-hidden",
                      isActiveModule ? "border-primary bg-primary/5" : "border-transparent"
                    )}>
                      <div className="flex-1 min-w-0 max-w-full overflow-hidden pl-[16px] pr-5">
                        <div className="flex max-w-[280px] items-start gap-1.5 overflow-hidden">
                          <SidebarTooltip text={module.title}>
                            <p className={cn(
                              "block max-w-[256px] flex-1 text-[14px] font-bold leading-snug line-clamp-2 break-words",
                              isActiveModule ? "text-primary" : "text-muted-foreground"
                            )}>
                              {module.title}
                            </p>
                          </SidebarTooltip>
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
                              "flex w-full min-w-0 items-center gap-2 overflow-hidden text-left py-1.5 pl-[20px] pr-5 transition-all",
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
                            <SidebarTooltip text={lesson.title}>
                              <span className="block max-w-[232px] flex-1 truncate text-[13px] leading-snug">
                                {lesson.title}
                              </span>
                            </SidebarTooltip>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>

            {assignments.length > 0 && (
              <div className="mt-5 border-t border-border/70 pt-4">
                <div className="px-5 mb-2">
                  <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
                    <ClipboardList className="h-3.5 w-3.5" />
                    Bài tập
                  </div>
                </div>
                <div className="flex flex-col gap-0.5">
                  {assignments.map((assignment) => {
                    const isActive = location.pathname.includes(`/assignments/${assignment.id}`);
                    const done = assignment.status === "submitted" || assignment.status === "feedback_given";
                    const locked = !assignment.can_submit && !done;
                    const contentLocked = assignment.locked_reason === "content" && !done;
                    const deadlineLocked = assignment.locked_reason === "deadline" && !done;
                    return (
                      <button
                        key={assignment.id}
                        disabled={contentLocked}
                        onClick={() => handleAssignmentClick(assignment.id)}
                        className={cn(
                          "flex w-full items-center gap-2 text-left py-2 pl-[32px] pr-5 transition-all disabled:cursor-not-allowed disabled:opacity-60",
                          isActive
                            ? "text-primary font-bold bg-primary/5"
                          : contentLocked
                              ? "text-muted-foreground/70"
                          : locked && !deadlineLocked
                              ? "text-muted-foreground/70 hover:bg-muted/40"
                              : deadlineLocked
                                ? "text-destructive hover:bg-destructive/10"
                              : "text-muted-foreground hover:text-foreground hover:bg-muted/50 font-medium"
                        )}
                      >
                        <span className="shrink-0">
                          {done ? (
                            <CheckCircle2 className="h-3.5 w-3.5 text-success" fill="currentColor" stroke="white" strokeWidth={2} />
                          ) : deadlineLocked ? (
                            <AlertTriangle className="h-3.5 w-3.5 text-destructive" />
                          ) : locked ? (
                            <Lock className="h-3.5 w-3.5" />
                          ) : (
                            <span className="inline-block h-3.5 w-3.5 rounded-full border-2 border-muted-foreground/30" />
                          )}
                        </span>
                        <span className="min-w-0 max-w-[232px] flex-1 text-[13px] leading-snug">
                          <SidebarTooltip text={assignment.title}>
                            <span className="block truncate">{assignment.title}</span>
                          </SidebarTooltip>
                          <span className="block truncate text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/80">
                            {assignment.status === "feedback_given" ? "Đã phản hồi" : assignment.status === "submitted" ? "Đã nộp" : deadlineLocked ? "Hết hạn nộp" : locked ? "Học xong nội dung để nộp" : "Chưa nộp"}
                          </span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        )}
      </div>
      </div>
    </TooltipProvider>
  );

  const infoContent = (
    <ScrollArea className="h-full">
      <div className="p-4 space-y-4 pb-20">
        {/* MENTORS */}
        {mentors.length > 0 ? (
          mentors.map((mentor) => {
            const avatarUrl = mentor.profile_image_url_full || mentor.profile_image_url || mentor.avatar;
            const role = getMentorRoleLabel(mentor.role);
            const intro = mentor.bio || mentorSectionDescription || "Chưa có thông tin chi tiết.";
            return (
              <div
                key={mentor.id}
                className="rounded-xl border border-border bg-card p-6 flex flex-col items-center text-center shadow-sm"
              >
                <div className="relative mb-3">
                  {avatarUrl ? (
                    <img 
                      src={avatarUrl} 
                      alt={mentor.name} 
                      className="h-[76px] w-[76px] rounded-full bg-background p-0.5 border border-border shadow-sm object-cover"
                    />
                  ) : (
                    <div className="h-[76px] w-[76px] rounded-full bg-primary/10 border border-border shadow-sm flex items-center justify-center">
                      <User className="h-8 w-8 text-primary/60" />
                    </div>
                  )}
                </div>
                <div className="bg-primary/10 text-primary text-[11px] font-bold px-3 py-1 rounded-full uppercase tracking-widest mb-3">
                  Mentor
                </div>
                <h3 className="text-[18px] font-bold text-foreground">{mentor.name}</h3>
                <div className="mt-1.5 mb-4 inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-[10px] font-semibold leading-[14px] text-primary">
                  <Shield className="h-3 w-3" />
                  {role}
                </div>
                
                <div className="w-full h-px bg-border/50 mb-4" />
                
                <div className="w-full space-y-3 text-left">
                  {mentorSectionLogo && (
                    <img
                      src={mentorSectionLogo}
                      alt=""
                      className="h-6 w-auto object-contain object-left"
                    />
                  )}
                  {mentor.email && (
                    <InfoRow icon={Mail} label="Email" value={mentor.email} />
                  )}
                  {mentor.phone_number && (
                    <InfoRow icon={Phone} label="Điện thoại" value={mentor.phone_number} />
                  )}
                  <div className="rounded-2xl bg-muted/50 border border-border/50 p-4">
                    <div className="flex items-center gap-1.5 text-[14px] font-semibold leading-[18px] text-muted-foreground mb-2">
                      <FileText className="h-3.5 w-3.5" />
                      Giới thiệu
                    </div>
                    <p className="text-[14px] font-normal leading-[18px] text-foreground whitespace-pre-line">
                      {intro}
                    </p>
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div className="rounded-xl border border-border bg-card p-6 flex flex-col items-center text-center shadow-sm">
            <p className="text-[13px] text-muted-foreground italic">Chưa có thông tin người hướng dẫn</p>
          </div>
        )}

        {/* Tài liệu tham khảo */}
        <div className="rounded-xl bg-[#0F62FE] p-6 flex flex-col items-center text-center text-white shadow-sm">
          <h3 className="text-[18px] font-bold mb-2">Tài liệu tham khảo</h3>
          {refDocs.length > 0 ? (
            <div className="flex flex-col gap-2 w-full mt-2">
              {refDocs.slice(0, 8).map((doc: CourseFile) => {
                const DocIcon = getDocIcon(doc.extension);
                return (
                  <a
                    key={doc.id}
                    href={doc.fullUrl.includes('?') ? `${doc.fullUrl}&download=1` : `${doc.fullUrl}?download=1`}
                    download={doc.display_name}
                    className="flex items-center justify-between rounded-lg bg-white/10 px-3 py-2.5 text-[13px] font-normal leading-[18px] transition-colors hover:bg-white/20 gap-2 w-full"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <DocIcon className="h-4 w-4 shrink-0 opacity-80" />
                      <span className="truncate">{doc.display_name}</span>
                    </div>
                    <Download className="h-4 w-4 shrink-0 opacity-70" />
                  </a>
                );
              })}
            </div>
          ) : (
            <p className="text-[13px] text-white/80">Chưa có tài liệu...</p>
          )}
        </div>
      </div>
    </ScrollArea>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden w-[320px] min-w-[320px] max-w-[320px] shrink-0 overflow-hidden border-r border-border bg-sidebar lg:block">
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
              className="fixed inset-y-0 left-0 z-50 flex w-[320px] sm:w-[380px] flex-col border-r border-border bg-background shadow-xl lg:hidden"
            >
              <div className="flex shrink-0 items-center justify-between border-b border-border px-4 py-3">
                <div className="flex gap-4">
                  <button 
                    onClick={() => setActiveTab('content')}
                    className={cn("text-[15px] transition-colors", activeTab === 'content' ? "font-bold text-foreground" : "text-muted-foreground")}
                  >
                    Nội dung
                  </button>
                  <button 
                    onClick={() => setActiveTab('info')}
                    className={cn("text-[15px] transition-colors", activeTab === 'info' ? "font-bold text-foreground" : "text-muted-foreground")}
                  >
                    Thông tin và tài liệu
                  </button>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 ml-2 shrink-0"
                  onClick={() => setSidebarOpen(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex-1 overflow-hidden">
                {activeTab === 'content' ? sidebarContent : infoContent}
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}

function InfoRow({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3 rounded-xl bg-muted/40 border border-border/40 px-4 py-3">
      <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
      <div className="min-w-0 flex-1">
        <div className="text-[10px] font-semibold leading-[14px] text-muted-foreground">{label}</div>
        <div className="text-[14px] font-semibold leading-[18px] text-foreground break-words">{value}</div>
      </div>
    </div>
  );
}
