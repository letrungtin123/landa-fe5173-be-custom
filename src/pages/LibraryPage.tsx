import { useState } from "react";
import { motion } from "framer-motion";
import { Search, Filter, Download, FileText, FileSpreadsheet, Presentation, LayoutTemplate } from "lucide-react";
import { UserProfileCard } from "@/components/dashboard/UserProfileCard";
import { NotificationList } from "@/components/dashboard/NotificationList";
import { DashboardSkeleton } from "@/components/skeletons/DashboardSkeleton";
import { Card, CardContent } from "@/components/ui/card";
import { usePageLoading } from "@/hooks/usePageLoading";
import { useLibraryCategories, useLibraryDocuments } from "@/hooks/useLibrary";
import type { LibraryDocument } from "@/api/library";

const getDocumentIcon = (type: string) => {
  const t = type?.toLowerCase() || "";
  if (t.includes("pdf") || t.includes("doc")) return FileText;
  if (t.includes("xls") || t.includes("excel")) return FileSpreadsheet;
  if (t.includes("ppt") || t.includes("slide")) return Presentation;
  return LayoutTemplate;
};

const getCategoryColor = (type: string) => {
  const t = type?.toLowerCase() || "";
  if (t.includes("pdf")) return "bg-[#ea4335]"; // Đỏ
  if (t.includes("doc") || t.includes("word") || t.includes("công ty")) return "bg-[#0ea5e9]"; // Xanh dương (Sky)
  if (t.includes("xls") || t.includes("excel") || t.includes("nhân sự")) return "bg-[#10b981]"; // Xanh lá
  if (t.includes("ppt") || t.includes("powerpoint") || t.includes("chiến lược")) return "bg-[#ff6c37]"; // Cam
  return "bg-primary";
};

export function LibraryPage() {
  const { isLoading: pageLoading } = usePageLoading(1000);
  const [searchTerm, setSearchTerm] = useState("");

  const { data: categoriesData, isLoading: catLoading } = useLibraryCategories();
  const { data: documentsData, isLoading: docLoading } = useLibraryDocuments(searchTerm);

  if (pageLoading) {
    return <DashboardSkeleton />;
  }

  const categories = categoriesData?.categories || [];
  const documents = documentsData?.documents || [];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="w-full px-4 py-8 md:px-8"
    >
      <div className="flex flex-col-reverse lg:flex-row w-full">
        {/* Left Sidebar */}
        <div className="w-full lg:w-1/4 shrink-0 lg:border-r lg:border-border lg:pr-8 mt-8 lg:mt-0">
          <div className="sticky top-24 space-y-10">
            <UserProfileCard />
            <NotificationList />
          </div>
        </div>

        {/* Main Content */}
        <div className="w-full lg:w-3/4 lg:pl-8 space-y-10">
          {/* Banner */}
          <div className="space-y-4">
            <div>
              <span className="inline-block bg-[#00f2fe] text-[#0066cc] font-bold text-xs px-3 py-1 rounded-full mb-3 uppercase tracking-wider">
                Library
              </span>
              <h1 className="text-3xl font-bold text-foreground mb-6">
                Kiến tạo tri thức, vững bước tương lai
              </h1>
            </div>

            <div className="w-full h-[240px] md:h-[320px] rounded-2xl overflow-hidden relative border border-border shadow-sm">
              <img
                src="/images/library_banner.png"
                alt="Library Banner"
                className="w-full h-full object-cover object-center"
              />
            </div>
          </div>

          {/* Search & Filter */}
          <div className="flex items-center gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-card border border-border rounded-full outline-none focus:border-primary transition-colors text-sm"
              />
            </div>
            <button className="flex items-center gap-2 px-6 py-3 bg-card border border-border rounded-full hover:bg-accent/10 transition-colors text-sm font-medium">
              <Filter className="h-5 w-5" />
              Filter
            </button>
          </div>

          {/* Categories Grid */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-foreground">
                Tài liệu cho người mới bắt đầu
              </h2>
              <button className="text-sm text-primary hover:underline font-medium">
                Xem tất cả
              </button>
            </div>

            {catLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {[1, 2, 3, 4].map(k => (
                  <div key={k} className="h-32 rounded-xl bg-accent/10 animate-pulse" />
                ))}
              </div>
            ) : categories.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {categories.map((cat) => {
                  const Icon = getDocumentIcon(cat.type);
                  const bgColorClass = getCategoryColor(cat.type);

                  return (
                    <Card
                      key={cat.id}
                      className={`group cursor-pointer overflow-hidden border-0 ${bgColorClass}`}
                    >
                      <CardContent className="flex flex-col justify-between h-full p-5 min-h-[160px] text-white">
                        <div className="flex justify-between items-start">
                          <div className="h-10 w-10 bg-white rounded-lg flex items-center justify-center shadow-sm">
                            <Icon className={`h-6 w-6 ${bgColorClass.replace('bg-', 'text-')}`} />
                          </div>
                          <Download className="h-5 w-5 opacity-70 hover:opacity-100 transition-opacity" />
                        </div>
                        <div>
                          <h3 className="font-bold text-sm uppercase tracking-wide leading-tight mb-2">
                            {cat.name}
                          </h3>
                          <div className="text-xs opacity-90 font-medium">
                            {cat.count} files
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            ) : (
              <div className="p-8 text-center text-muted-foreground border border-dashed rounded-xl">
                Không tìm thấy danh mục.
              </div>
            )}
          </div>

          {/* General Documents List */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-foreground">
                Tài liệu tổng hợp
              </h2>
              <button className="text-sm text-primary hover:underline font-medium">
                Xem tất cả
              </button>
            </div>

            {docLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map(k => (
                  <div key={k} className="h-16 rounded-xl bg-accent/10 animate-pulse" />
                ))}
              </div>
            ) : documents.length > 0 ? (
              <div className="border border-border/50 rounded-2xl overflow-x-auto w-full bg-card">
                <table className="w-full min-w-[600px]">
                  <thead className="bg-[#f8fafc]/80 dark:bg-accent/5 backdrop-blur-sm border-b border-border/50">
                    <tr className="text-left text-xs font-semibold text-muted-foreground">
                      <th className="px-6 py-4 font-medium uppercase tracking-wider">Tên tài liệu</th>
                      <th className="px-6 py-4 font-medium uppercase tracking-wider">Mã tài liệu</th>
                      <th className="px-6 py-4 font-medium uppercase tracking-wider">Người đăng</th>
                      <th className="px-6 py-4 font-medium uppercase tracking-wider w-16"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/30">
                    {documents.map((doc: LibraryDocument) => {
                      const Icon = getDocumentIcon(doc.type);
                      const iconColor = getCategoryColor(doc.type).replace('bg-', 'text-');

                      return (
                        <tr key={doc.id} className="group hover:bg-accent/5 transition-colors">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-4">
                              <div className="h-10 w-10 shrink-0 rounded-lg bg-background shadow-xs flex items-center justify-center border border-border/50">
                                <Icon className={`h-5 w-5 ${iconColor}`} />
                              </div>
                              <span className="font-semibold text-sm text-foreground group-hover:text-primary transition-colors">
                                {doc.title}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-sm text-muted-foreground whitespace-nowrap">
                            {doc.code}
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              {doc.uploader_avatar ? (
                                <img src={doc.uploader_avatar} alt={doc.uploader_name} className="h-8 w-8 rounded-full border border-border/50 shadow-sm" />
                              ) : (
                                <div className="h-8 w-8 rounded-full bg-accent text-accent-foreground flex items-center justify-center text-xs font-bold shadow-sm">
                                  {doc.uploader_name.charAt(0)}
                                </div>
                              )}
                              <span className="text-sm font-medium text-muted-foreground">
                                {doc.uploader_email}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <a
                              href={doc.url}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex h-8 w-8 items-center justify-center rounded-lg hover:bg-card border border-transparent hover:border-border hover:shadow-sm text-muted-foreground hover:text-foreground transition-all"
                            >
                              <Download className="h-4 w-4" />
                            </a>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-12 text-center text-muted-foreground border border-dashed rounded-2xl bg-card/50">
                Chưa có tài liệu nào.
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
