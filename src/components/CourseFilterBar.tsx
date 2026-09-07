// ============================================================
// CourseFilterBar — Filter badges cho courses (Tất cả | Đã đạt | Chưa đạt | Danh mục...)
// ============================================================

import { cn } from "@/lib/utils";
import type { CourseCategoryInfo } from "@/api/types";
import { useTranslation } from "react-i18next";

export type CourseFilter = 'all' | 'completed' | 'in_progress' | number;

interface Props {
  activeFilter: CourseFilter;
  onFilterChange: (f: CourseFilter) => void;
  totalCount: number;
  completedCount: number;
  inProgressCount: number;
  categories: CourseCategoryInfo[];
  /** Course count per category */
  categoryCounts: Map<number, number>;
  showOnlyStatus?: boolean;
  className?: string;
}

export function CourseFilterBar({
  activeFilter,
  onFilterChange,
  totalCount,
  completedCount,
  inProgressCount,
  categories,
  categoryCounts,
  showOnlyStatus = false,
  className,
}: Props) {
  const { t } = useTranslation();
  const pills: Array<{ key: CourseFilter; label: string; count: number }> = showOnlyStatus
    ? [
        { key: 'all', label: t("filters.all"), count: totalCount },
        { key: 'in_progress', label: t("filters.inProgress"), count: inProgressCount },
        { key: 'completed', label: t("filters.completedLearning"), count: completedCount },
      ]
    : [
        { key: 'all', label: t("filters.all"), count: totalCount },
        { key: 'completed', label: t("filters.earned"), count: completedCount },
        { key: 'in_progress', label: t("filters.locked"), count: inProgressCount },
        ...categories.map(cat => ({
          key: cat.id as CourseFilter,
          label: cat.name,
          count: categoryCounts.get(cat.id) || 0,
        })),
      ];

  return (
    <div className={cn("flex flex-wrap gap-2 mb-6", className)}>
      {pills.map(p => (
        <button
          key={String(p.key)}
          onClick={() => onFilterChange(p.key)}
          className={cn(
            "inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-sm font-medium transition-all border",
            activeFilter === p.key
              ? "bg-primary text-primary-foreground border-primary shadow-sm"
              : "bg-card text-muted-foreground border-border hover:text-foreground hover:border-foreground/30"
          )}
        >
          {p.label} ({p.count})
        </button>
      ))}
    </div>
  );
}
