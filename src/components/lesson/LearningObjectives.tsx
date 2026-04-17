import { motion } from "framer-motion";
import { Settings2, CheckCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { mockLessons } from "@/data/mock";
import { useAppStore } from "@/stores/useAppStore";

export function LearningObjectives() {
  const currentLessonId = useAppStore((s) => s.currentLessonId);
  const lesson = mockLessons[currentLessonId] || mockLessons["l-m2-1"];
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.2 }}
    >
      <Card className="border-accent/20 bg-accent/5">
        <CardContent className="p-6">
          <div className="mb-4 flex items-center gap-2">
            <Settings2 className="h-5 w-5 text-accent" />
            <h3 className="text-base font-bold text-accent">
              Kiến thức đạt được
            </h3>
          </div>

          <div className="space-y-3">
            {lesson.objectives.map((objective, index) => (
              <div key={index} className="flex items-start gap-3">
                <CheckCircle className="mt-0.5 h-5 w-5 shrink-0 text-accent" />
                <p className="text-sm font-medium text-foreground">
                  {objective}
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
