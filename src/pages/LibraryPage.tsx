import { FileText, Video, Download } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const LIBRARY_ITEMS = [
  {
    title: "Handbook nhân viên mới 2026",
    type: "PDF",
    icon: FileText,
    size: "2.4 MB",
    category: "Tài liệu",
  },
  {
    title: "Video giới thiệu công ty",
    type: "Video",
    icon: Video,
    size: "124 MB",
    category: "Video",
  },
  {
    title: "Template báo cáo công việc",
    type: "DOCX",
    icon: FileText,
    size: "856 KB",
    category: "Template",
  },
  {
    title: "Quy trình onboarding chi tiết",
    type: "PDF",
    icon: FileText,
    size: "1.8 MB",
    category: "Tài liệu",
  },
  {
    title: "Workshop: Kỹ năng thuyết trình",
    type: "Video",
    icon: Video,
    size: "89 MB",
    category: "Video",
  },
  {
    title: "Brand Guidelines L&A 2026",
    type: "PDF",
    icon: FileText,
    size: "5.1 MB",
    category: "Tài liệu",
  },
];

export function LibraryPage() {
  return (
    <div className="mx-auto max-w-[1400px] px-4 py-8 md:px-6">
      <h1 className="mb-2 text-3xl font-bold text-foreground">Thư viện</h1>
      <p className="mb-8 text-sm text-muted-foreground">
        Tài liệu tham khảo và nguồn học liệu bổ sung
      </p>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {LIBRARY_ITEMS.map((item, index) => {
          const Icon = item.icon;
          return (
            <Card
              key={index}
              className="group cursor-pointer border-border shadow-sm transition-all hover:shadow-md hover:scale-[1.02]"
            >
              <CardContent className="flex items-start gap-4 p-5">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-accent/10">
                  <Icon className="h-6 w-6 text-accent" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-semibold text-foreground group-hover:text-accent transition-colors truncate">
                    {item.title}
                  </h3>
                  <div className="mt-1 flex items-center gap-2">
                    <Badge
                      variant="outline"
                      className="text-[10px] px-1.5 py-0"
                    >
                      {item.type}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {item.size}
                    </span>
                  </div>
                </div>
                <Download className="h-4 w-4 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
