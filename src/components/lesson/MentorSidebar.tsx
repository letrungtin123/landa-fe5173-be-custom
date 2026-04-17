import { motion } from "framer-motion";
import { User } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { mockLessons } from "@/data/mock";
import { useAppStore } from "@/stores/useAppStore";
import logoImg from "@/assets/leandassociate.webp";

export function MentorSidebar() {
  const currentLessonId = useAppStore((s) => s.currentLessonId);
  const lesson = mockLessons[currentLessonId] || mockLessons["l-m2-1"];
  return (
    <aside className="hidden w-[300px] shrink-0 border-l border-border xl:block">
      <div className="sticky top-20 p-6">
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4, delay: 0.3 }}
        >
          {/* Mentor Badge */}
          <Badge className="mb-3 bg-accent text-accent-foreground font-semibold text-xs uppercase tracking-wider px-3 py-1">
            Mentor
          </Badge>

          <h3 className="mb-5 text-xl font-bold text-foreground">
            Người hướng dẫn
          </h3>

          {/* Mentor Cards */}
          <div className="space-y-4">
            {lesson.mentors.map((mentor, index) => (
              <div key={index}>
                <div className="flex items-start gap-3">
                  {/* Avatar */}
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-muted">
                    <User className="h-6 w-6 text-muted-foreground" />
                  </div>

                  <div>
                    {/* Company Logo */}
                    <img
                      src={logoImg}
                      alt={mentor.company}
                      className="mb-1 h-4 w-auto object-contain opacity-70"
                    />
                    <p className="text-sm font-bold text-foreground">
                      {mentor.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {mentor.role}
                    </p>
                  </div>
                </div>
                {index < lesson.mentors.length - 1 && (
                  <Separator className="mt-4" />
                )}
              </div>
            ))}
          </div>

          {/* About Company */}
          <div className="mt-6 rounded-lg bg-muted/50 p-4">
            <div className="mb-2 flex items-center gap-2">
              <img
                src={logoImg}
                alt="Le & Associates"
                className="h-5 w-auto object-contain"
              />
            </div>
            <p className="text-xs leading-relaxed text-muted-foreground">
              Le & Associates (L&A), thành viên của L&A Holdings, hiện là một
              trong những công ty hàng đầu tại Việt Nam trong dịch vụ nhân lực
              và thuê ngoài.
            </p>
          </div>
        </motion.div>
      </div>
    </aside>
  );
}
