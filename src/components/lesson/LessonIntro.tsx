import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";
import { mockLessons } from "@/data/mock";
import { useAppStore } from "@/stores/useAppStore";

export function LessonIntro() {
  const currentLessonId = useAppStore((s) => s.currentLessonId);
  const lesson = mockLessons[currentLessonId] || mockLessons["l-m2-1"];
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.3 }}
    >
      <Badge className="mb-3 bg-accent/10 text-accent font-semibold text-xs uppercase tracking-wider px-3 py-1 hover:bg-accent/20">
        Tổng quan
      </Badge>

      <h2 className="mb-4 text-2xl font-bold text-foreground">
        Giới thiệu bài học
      </h2>

      <p className="mb-4 text-sm leading-relaxed text-muted-foreground">
        {lesson.description}
      </p>

      <ul className="space-y-3">
        {lesson.bulletPoints.map((point, index) => (
          <li key={index} className="flex items-start gap-2 text-sm">
            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
            <span className="text-muted-foreground">
              <strong className="text-foreground">{point.label}</strong>{" "}
              {point.text}
            </span>
          </li>
        ))}
      </ul>
    </motion.div>
  );
}
