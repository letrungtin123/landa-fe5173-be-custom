import { BookOpen, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { mockCourse } from "@/data/mock";
import { useThemeStore } from "@/stores/useThemeStore";
import { cn } from "@/lib/utils";

export function CoursesPage() {
  const { colorStyle } = useThemeStore();

  return (
    <div className="mx-auto max-w-[1400px] px-4 py-8 md:px-6">
      <h1 className="mb-2 text-3xl font-bold text-foreground">
        Chương trình học
      </h1>
      <p className="mb-8 text-sm text-muted-foreground">
        Khám phá các khóa học và chương trình đào tạo tại L&A
      </p>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Current Course */}
        <Link to="/courses/c1/lessons/l-m2-1">
          <Card className="group overflow-hidden border-border shadow-sm transition-all hover:shadow-md hover:scale-[1.02]">
            <div
              className={cn(
                "flex h-48 items-center justify-center",
                colorStyle === "gradient"
                  ? "accent-surface-gradient"
                  : "bg-accent"
              )}
            >
              <BookOpen className="h-12 w-12 text-white/50" />
            </div>
            <CardContent className="p-5">
              <Badge
                variant="outline"
                className="mb-2 border-success/30 bg-success/10 text-success"
              >
                Đang học
              </Badge>
              <h3 className="text-lg font-bold text-foreground group-hover:text-accent transition-colors">
                {mockCourse.title}
              </h3>
              <p className="mt-1 text-sm text-muted-foreground">
                {mockCourse.modules.length} modules • 12 bài học
              </p>
              <div className="mt-3 flex items-center gap-1 text-sm text-accent">
                Tiếp tục
                <ArrowRight className="h-3.5 w-3.5" />
              </div>
            </CardContent>
          </Card>
        </Link>

        {/* Placeholder future courses */}
        {["Kỹ năng giao tiếp chuyên nghiệp", "An toàn lao động", "Quản lý thời gian hiệu quả"].map(
          (title, i) => (
            <Card key={i} className="overflow-hidden border-border shadow-sm opacity-60">
              <div className="flex h-48 items-center justify-center bg-muted">
                <BookOpen className="h-12 w-12 text-muted-foreground/30" />
              </div>
              <CardContent className="p-5">
                <Badge variant="outline" className="mb-2">
                  Sắp ra mắt
                </Badge>
                <h3 className="text-lg font-bold text-foreground">{title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Coming soon
                </p>
              </CardContent>
            </Card>
          )
        )}
      </div>
    </div>
  );
}
