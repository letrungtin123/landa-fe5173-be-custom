import { Search, Compass, TrendingUp } from "lucide-react";
import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useThemeStore } from "@/stores/useThemeStore";
import { cn } from "@/lib/utils";

const FEATURED = [
  {
    title: "L&A Onboarding 2026",
    description: "Chương trình đào tạo nhân viên mới toàn diện",
    modules: 3,
    lessons: 12,
    tag: "Phổ biến",
  },
  {
    title: "Kỹ năng giao tiếp",
    description: "Nâng cao kỹ năng giao tiếp trong môi trường chuyên nghiệp",
    modules: 5,
    lessons: 20,
    tag: "Mới",
  },
  {
    title: "Leadership Essentials",
    description: "Kiến thức nền tảng cho nhà quản lý tương lai",
    modules: 4,
    lessons: 16,
    tag: "Sắp ra mắt",
  },
];

export function ExplorePage() {
  const { colorStyle } = useThemeStore();

  return (
    <div className="mx-auto max-w-[1400px] px-4 py-8 md:px-6">
      {/* Hero Section */}
      <div
        className={cn(
          "mb-8 rounded-2xl p-8 text-white md:p-12",
          colorStyle === "gradient" ? "accent-surface-gradient" : "bg-accent"
        )}
      >
        <div className="flex items-center gap-2 mb-4">
          <Compass className="h-6 w-6" />
          <span className="text-sm font-semibold uppercase tracking-wider text-white/80">
            Khám phá
          </span>
        </div>
        <h1 className="mb-3 text-3xl font-bold md:text-4xl">
          Khám phá hành trình học tập
        </h1>
        <p className="max-w-xl text-sm leading-relaxed text-white/80">
          Tìm kiếm khóa học phù hợp với nhu cầu phát triển của bạn. Từ kỹ năng
          mềm đến kiến thức chuyên môn, chúng tôi có tất cả.
        </p>

        {/* Search Bar */}
        <div className="mt-6 flex max-w-md items-center gap-2 rounded-lg bg-white/20 px-4 py-2.5 backdrop-blur-sm">
          <Search className="h-4 w-4 text-white/60" />
          <input
            type="text"
            placeholder="Tìm kiếm khóa học..."
            className="flex-1 bg-transparent text-sm text-white placeholder-white/50 outline-none"
          />
        </div>
      </div>

      {/* Trending courses */}
      <div className="mb-6 flex items-center gap-2">
        <TrendingUp className="h-5 w-5 text-accent" />
        <h2 className="text-xl font-bold text-foreground">Nổi bật</h2>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {FEATURED.map((course, index) => (
          <Link key={index} to="/courses/c1/lessons/l-m2-1">
            <Card className="group h-full border-border shadow-sm transition-all hover:shadow-md hover:scale-[1.02]">
              <CardContent className="flex h-full flex-col p-6">
                <Badge
                  variant="outline"
                  className={cn(
                    "mb-3 w-fit text-xs",
                    course.tag === "Phổ biến" &&
                      "border-accent/30 bg-accent/10 text-accent",
                    course.tag === "Mới" &&
                      "border-success/30 bg-success/10 text-success",
                    course.tag === "Sắp ra mắt" &&
                      "border-warning/30 bg-warning/10 text-warning"
                  )}
                >
                  {course.tag}
                </Badge>
                <h3 className="mb-2 text-lg font-bold text-foreground group-hover:text-accent transition-colors">
                  {course.title}
                </h3>
                <p className="mb-4 flex-1 text-sm text-muted-foreground">
                  {course.description}
                </p>
                <p className="text-xs text-muted-foreground">
                  {course.modules} modules • {course.lessons} bài học
                </p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
