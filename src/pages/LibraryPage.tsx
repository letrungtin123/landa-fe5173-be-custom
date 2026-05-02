import { useState, useCallback, useRef } from "react";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { motion, AnimatePresence } from "framer-motion";
import { FilePreviewModal } from "@/components/library/FilePreviewModal";
import {
  Search,
  Download,
  FileText,
  FileSpreadsheet,
  Presentation,
  LayoutTemplate,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  FolderOpen,
  Video,
  ImageIcon,
} from "lucide-react";
import { UserProfileCard } from "@/components/dashboard/UserProfileCard";
import { NotificationList } from "@/components/dashboard/NotificationList";
import { DashboardSkeleton } from "@/components/skeletons/DashboardSkeleton";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { usePageLoading } from "@/hooks/usePageLoading";
import { useLibraryCategories, useLibraryDocuments } from "@/hooks/useLibrary";
import { type LibraryDocument, type DocumentCategory, handleSecureDownload } from "@/api/library";

// ── Icon helpers ──

const getDocumentIcon = (ext: string) => {
  const t = ext?.toLowerCase() || "";
  if (t === "pdf") return FileText;
  if (t === "docx") return FileText;
  if (t === "xlsx") return FileSpreadsheet;
  if (t === "pptx") return Presentation;
  if (t === "mp4") return Video;
  if (t === "jpeg" || t === "jpg" || t === "png") return ImageIcon;
  return LayoutTemplate;
};

const EXTENSION_COLORS: Record<string, string> = {
  pdf: "#ea4335",
  docx: "#2b579a",
  xlsx: "#217346",
  pptx: "#d24726",
  mp4: "#9333ea",
  jpeg: "#0891b2",
  jpg: "#0891b2",
  png: "#0d9488",
};

const getCategoryColor = (slug: string) => {
  // Use a hash-based color for custom categories
  const colors = ["#ea4335", "#0ea5e9", "#10b981", "#ff6c37", "#8b5cf6", "#ec4899"];
  let hash = 0;
  for (let i = 0; i < slug.length; i++) {
    hash = slug.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
};

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`;
};

export function LibraryPage() {
  const { isLoading: pageLoading } = usePageLoading(1000);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeCategory, setActiveCategory] = useState<string>("");
  const [activeExtension, setActiveExtension] = useState<string>("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);
  const [previewDoc, setPreviewDoc] = useState<LibraryDocument | null>(null);
  const categoryCarouselRef = useRef<HTMLDivElement>(null);

  // Debounce search 300ms — tránh spam API mỗi keystroke
  const debouncedSearch = useDebouncedValue(searchTerm, 300);

  const handleSearch = useCallback((value: string) => {
    setSearchTerm(value);
    setCurrentPage(1);
  }, []);

  const handleCategoryClick = useCallback((slug: string) => {
    setActiveCategory((prev) => (prev === slug ? "" : slug));
    setCurrentPage(1);
  }, []);

  const handleExtensionClick = useCallback((ext: string) => {
    setActiveExtension((prev) => (prev === ext ? "" : ext));
    setCurrentPage(1);
  }, []);

  const { data: categoriesData, isLoading: catLoading } = useLibraryCategories();
  const { data: documentsData, isLoading: docLoading, isFetching: docFetching } = useLibraryDocuments({
    page: currentPage,
    page_size: pageSize,
    category: activeCategory || undefined,
    extension: activeExtension || undefined,
    search: debouncedSearch || undefined,
  });

  if (pageLoading) {
    return <DashboardSkeleton />;
  }

  const categories = (categoriesData?.categories || []).filter(cat => {
    if (!debouncedSearch) return true;
    return cat.name.toLowerCase().includes(debouncedSearch.toLowerCase());
  });
  const totalDocuments = categoriesData?.total || 0;
  const documents = documentsData?.results || [];
  const totalCount = documentsData?.count || 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="w-full px-4 py-6 md:px-8 md:py-8"
    >
      <div className="flex flex-col-reverse lg:flex-row w-full">
        {/* Left Sidebar */}
        <div className="hidden lg:block w-full lg:w-1/4 shrink-0 lg:border-r lg:border-border lg:pr-8 mt-8 lg:mt-0">
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
              <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-foreground mb-4 md:mb-6">
                Kiến tạo tri thức, vững bước tương lai
              </h1>
            </div>

            <div className="w-full h-[160px] sm:h-[240px] md:h-[320px] rounded-2xl overflow-hidden relative border border-border shadow-sm">
              <img
                src="/images/library_banner.png"
                alt="Library Banner"
                className="w-full h-full object-cover object-center"
              />
            </div>
          </div>

          {/* Search + Extension Filter */}
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Tìm kiếm tài liệu..."
                  value={searchTerm}
                  onChange={(e) => handleSearch(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 bg-card border border-border rounded-full outline-none focus:border-primary transition-colors text-sm"
                />
              </div>
              <div className="text-sm text-muted-foreground shrink-0">
                {totalDocuments} tài liệu
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {Object.entries(EXTENSION_COLORS).filter(([k]) => !["jpeg","jpg"].includes(k) || k === "jpg").map(([ext, color]) => (
                <button
                  key={ext}
                  onClick={() => handleExtensionClick(ext)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
                    activeExtension === ext
                      ? "ring-2 ring-offset-1 ring-primary text-white shadow-sm"
                      : "text-white/90 hover:scale-105"
                  }`}
                  style={{ backgroundColor: color }}
                >
                  {ext.toUpperCase()}
                </button>
              ))}
              {activeExtension && (
                <button
                  onClick={() => handleExtensionClick("")}
                  className="px-3 py-1.5 rounded-full text-xs font-medium border border-border bg-card hover:bg-accent/10 transition-colors"
                >
                  ✕ Bỏ lọc
                </button>
              )}
            </div>
          </div>

          {/* Categories Carousel */}
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-foreground">
              Danh mục tài liệu
            </h2>

            {catLoading ? (
              <div className="flex gap-4 overflow-hidden">
                {[1, 2, 3, 4].map((k) => (
                  <div key={k} className="h-[160px] w-[85vw] sm:w-[calc(50%-8px)] lg:w-[calc(25%-12px)] rounded-xl bg-accent/10 animate-pulse shrink-0" />
                ))}
              </div>
            ) : categories.length > 0 ? (
              <div className="relative group">
                <div
                  ref={categoryCarouselRef}
                  className="flex gap-4 overflow-x-auto scroll-smooth snap-x snap-mandatory pb-4 -mb-4 hide-scrollbar"
                >
                  {categories.map((cat: DocumentCategory) => {
                    const bgColor = getCategoryColor(cat.slug);
                    const isActive = activeCategory === cat.slug;

                    return (
                      <Card
                        key={cat.id}
                        onClick={() => handleCategoryClick(cat.slug)}
                        className={`group/card cursor-pointer overflow-hidden border-2 transition-all duration-300 shrink-0 snap-start w-[85vw] sm:w-[calc(50%-8px)] lg:w-[calc(25%-12px)] ${
                          isActive
                            ? "ring-2 ring-offset-2 ring-primary border-primary shadow-md"
                            : "border-transparent hover:shadow-md hover:-translate-y-1"
                        }`}
                        style={{ backgroundColor: bgColor }}
                      >
                        <CardContent className="flex flex-col justify-between h-full p-5 min-h-[160px] text-white">
                          <div className="flex justify-between items-start">
                            <div className="h-10 w-10 bg-white/90 rounded-lg flex items-center justify-center shadow-sm">
                              <FolderOpen className="h-6 w-6" style={{ color: bgColor }} />
                            </div>
                          </div>
                          <div>
                            <h3 className="font-bold text-sm uppercase tracking-wide leading-tight mb-2">
                              {cat.name}
                            </h3>
                            <div className="text-xs opacity-90 font-medium">
                              {cat.count} tài liệu
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>

                {/* Left Arrow */}
                <button
                  onClick={() => {
                    if (categoryCarouselRef.current) {
                      const scrollAmount = categoryCarouselRef.current.clientWidth;
                      categoryCarouselRef.current.scrollBy({ left: -scrollAmount, behavior: 'smooth' });
                    }
                  }}
                  className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1/2 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-background border shadow-md hover:scale-105 text-foreground opacity-0 group-hover:opacity-100 transition-all duration-200"
                  aria-label="Trước"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>

                {/* Right Arrow */}
                <button
                  onClick={() => {
                    if (categoryCarouselRef.current) {
                      const scrollAmount = categoryCarouselRef.current.clientWidth;
                      categoryCarouselRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
                    }
                  }}
                  className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-background border shadow-md hover:scale-105 text-foreground opacity-0 group-hover:opacity-100 transition-all duration-200"
                  aria-label="Sau"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
              </div>
            ) : (
              <div className="p-8 text-center text-muted-foreground border border-dashed rounded-xl">
                Admin chưa tạo danh mục nào.
              </div>
            )}
          </div>

          {/* Documents Table */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-foreground">
                {activeCategory
                  ? `Tài liệu: ${categories.find((c: DocumentCategory) => c.slug === activeCategory)?.name || ""}`
                  : "Tất cả tài liệu"}
              </h2>
              {activeCategory && (
                <button
                  onClick={() => handleCategoryClick("")}
                  className="text-sm text-primary hover:underline font-medium"
                >
                  Xem tất cả
                </button>
              )}
            </div>

            <>
              {/* Desktop table */}
              <div className="hidden md:block border border-border/50 rounded-2xl overflow-x-auto w-full bg-card">
                <table className="w-full min-w-[600px]">
                  <thead className="bg-[#f8fafc]/80 dark:bg-accent/5 backdrop-blur-sm border-b border-border/50">
                      <tr className="text-left text-xs font-semibold text-muted-foreground">
                        <th className="px-6 py-4 font-medium uppercase tracking-wider">
                          Tên tài liệu
                        </th>
                        <th className="px-6 py-4 font-medium uppercase tracking-wider">
                          Loại
                        </th>
                        <th className="px-6 py-4 font-medium uppercase tracking-wider">
                          Dung lượng
                        </th>
                        <th className="px-6 py-4 font-medium uppercase tracking-wider">
                          Người đăng
                        </th>
                        <th className="px-6 py-4 font-medium uppercase tracking-wider w-16"></th>
                      </tr>
                    </thead>
                    <tbody className={`divide-y divide-border/30 transition-opacity duration-300 ${docFetching ? 'opacity-50 pointer-events-none' : ''}`}>
                      {docLoading ? (
                        Array.from({ length: pageSize }).map((_, i) => (
                          <tr key={`skeleton-${i}`} className="animate-pulse">
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-4">
                                <div className="h-10 w-10 shrink-0 rounded-lg bg-accent/30"></div>
                                <div className="h-4 w-32 sm:w-48 bg-accent/30 rounded"></div>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="h-5 w-12 bg-accent/30 rounded"></div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="h-4 w-16 bg-accent/30 rounded"></div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-3">
                                <div className="h-8 w-8 rounded-full bg-accent/30"></div>
                                <div className="h-4 w-24 bg-accent/30 rounded"></div>
                              </div>
                            </td>
                            <td className="px-6 py-4 text-right">
                              <div className="h-8 w-8 bg-accent/30 rounded-lg inline-block"></div>
                            </td>
                          </tr>
                        ))
                      ) : documents.length > 0 ? (
                        documents.map((doc: LibraryDocument) => {
                          const Icon = getDocumentIcon(doc.extension);
                        const extColor = EXTENSION_COLORS[doc.extension] || "#666";

                        return (
                          <tr
                            key={doc.id}
                            onClick={() => setPreviewDoc(doc)}
                            className="group hover:bg-accent/5 transition-colors cursor-pointer"
                          >
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-4">
                                <div className="h-10 w-10 shrink-0 rounded-lg bg-background shadow-xs flex items-center justify-center border border-border/50 group-hover:shadow-sm transition-shadow">
                                  <Icon className="h-5 w-5" style={{ color: extColor }} />
                                </div>
                                <span className="font-semibold text-sm text-foreground group-hover:text-primary transition-colors line-clamp-2">
                                  {doc.title}
                                </span>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <span
                                className="inline-block text-white text-[10px] font-bold px-2 py-0.5 rounded uppercase"
                                style={{ backgroundColor: extColor }}
                              >
                                {doc.extension}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-sm text-muted-foreground whitespace-nowrap">
                              {formatFileSize(doc.file_size)}
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-3">
                                <div className="h-8 w-8 rounded-full bg-accent text-accent-foreground flex items-center justify-center text-xs font-bold shadow-sm">
                                  {doc.uploaded_by_name.charAt(0)}
                                </div>
                                <span className="text-sm font-medium text-muted-foreground">
                                  {doc.uploaded_by_name}
                                </span>
                              </div>
                            </td>
                            <td className="px-6 py-4 text-right">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const ext = doc.extension.toLowerCase();
                                  const filename = doc.title.toLowerCase().endsWith(`.${ext}`) ? doc.title : `${doc.title}.${ext}`;
                                  handleSecureDownload(doc.download_url, filename);
                                }}
                                className="inline-flex h-8 w-8 items-center justify-center rounded-lg hover:bg-card border border-transparent hover:border-border hover:shadow-sm text-muted-foreground hover:text-foreground transition-all"
                              >
                                <Download className="h-4 w-4" />
                              </button>
                            </td>
                          </tr>
                        );
                        })
                      ) : (
                        <tr>
                          <td colSpan={5} className="p-16 text-center text-muted-foreground bg-card/50">
                            <div className="flex flex-col items-center justify-center gap-2">
                              <FileText className="h-8 w-8 opacity-20" />
                              <p>
                                {searchTerm
                                  ? `Không tìm thấy tài liệu "${searchTerm}"`
                                  : "Chưa có tài liệu nào."}
                              </p>
                            </div>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

              {/* Mobile card list */}
              <div className={`md:hidden space-y-3 transition-opacity duration-300 ${docFetching ? 'opacity-50 pointer-events-none' : ''}`}>
                {docLoading ? (
                  Array.from({ length: pageSize }).map((_, i) => (
                    <div key={`m-skeleton-${i}`} className="animate-pulse rounded-xl border border-border/50 bg-card p-4">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 shrink-0 rounded-lg bg-accent/30" />
                        <div className="flex-1 space-y-2">
                          <div className="h-4 w-3/4 bg-accent/30 rounded" />
                          <div className="h-3 w-1/2 bg-accent/30 rounded" />
                        </div>
                      </div>
                    </div>
                  ))
                ) : documents.length > 0 ? (
                  documents.map((doc: LibraryDocument) => {
                    const Icon = getDocumentIcon(doc.extension);
                    const extColor = EXTENSION_COLORS[doc.extension] || "#666";
                    return (
                      <div
                        key={doc.id}
                        onClick={() => setPreviewDoc(doc)}
                        className="group rounded-xl border border-border/50 bg-card p-4 active:bg-accent/5 transition-colors cursor-pointer"
                      >
                        <div className="flex items-start gap-3">
                          <div
                            className="h-10 w-10 shrink-0 rounded-lg bg-background shadow-xs flex items-center justify-center border border-border/50"
                          >
                            <Icon className="h-5 w-5" style={{ color: extColor }} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-sm text-foreground line-clamp-2 mb-1.5">
                              {doc.title}
                            </p>
                            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                              <span
                                className="inline-block text-white text-[10px] font-bold px-2 py-0.5 rounded uppercase"
                                style={{ backgroundColor: extColor }}
                              >
                                {doc.extension}
                              </span>
                              <span>{formatFileSize(doc.file_size)}</span>
                              <span className="hidden sm:inline">•</span>
                              <span className="hidden sm:inline">{doc.uploaded_by_name}</span>
                            </div>
                          </div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              const ext = doc.extension.toLowerCase();
                              const filename = doc.title.toLowerCase().endsWith(`.${ext}`) ? doc.title : `${doc.title}.${ext}`;
                              handleSecureDownload(doc.download_url, filename);
                            }}
                            className="shrink-0 h-9 w-9 flex items-center justify-center rounded-lg border border-border/50 text-muted-foreground hover:text-foreground transition-all"
                          >
                            <Download className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="p-12 text-center text-muted-foreground border border-dashed rounded-xl bg-card/50">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <FileText className="h-8 w-8 opacity-20" />
                      <p className="text-sm">
                        {searchTerm
                          ? `Không tìm thấy tài liệu "${searchTerm}"`
                          : "Chưa có tài liệu nào."}
                      </p>
                    </div>
                  </div>
                )}
              </div>

                {/* Pagination */}
                <div className={`flex flex-col sm:flex-row sm:items-center justify-between pt-4 gap-3 sm:gap-0 transition-opacity duration-300 ${docLoading ? 'opacity-50 pointer-events-none' : ''}`}>
                  <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                    <div className="text-sm text-muted-foreground">
                      Trang {currentPage} / {totalPages} ({totalCount} tài liệu)
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <span>Hiển thị:</span>
                      <DropdownMenu modal={false}>
                        <DropdownMenuTrigger asChild>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="h-8 w-[110px] justify-between text-xs font-medium"
                          >
                            {pageSize} / trang
                            <ChevronDown className="h-4 w-4 opacity-50" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-[110px] min-w-0">
                          {[5, 10, 20].map((size) => (
                            <DropdownMenuItem
                              key={size}
                              onClick={() => {
                                setPageSize(size);
                                setCurrentPage(1);
                              }}
                              className={`text-xs cursor-pointer justify-between ${pageSize === size ? 'bg-primary/10 text-primary font-medium' : ''}`}
                            >
                              {size} / trang
                            </DropdownMenuItem>
                          ))}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                  
                  {totalPages > 1 && (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                        disabled={currentPage <= 1}
                        className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-card hover:bg-accent/10 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </button>
                      {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                        let pageNum: number;
                        if (totalPages <= 5) {
                          pageNum = i + 1;
                        } else if (currentPage <= 3) {
                          pageNum = i + 1;
                        } else if (currentPage >= totalPages - 2) {
                          pageNum = totalPages - 4 + i;
                        } else {
                          pageNum = currentPage - 2 + i;
                        }
                        return (
                          <button
                            key={pageNum}
                            onClick={() => setCurrentPage(pageNum)}
                            className={`inline-flex h-9 w-9 items-center justify-center rounded-lg text-sm font-medium transition-colors ${
                              currentPage === pageNum
                                ? "bg-primary text-primary-foreground shadow-sm"
                                : "border border-border bg-card hover:bg-accent/10"
                            }`}
                          >
                            {pageNum}
                          </button>
                        );
                      })}
                      <button
                        onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                        disabled={currentPage >= totalPages}
                        className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-card hover:bg-accent/10 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                      >
                        <ChevronRight className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                </div>
            </>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {previewDoc && (
          <FilePreviewModal
            document={previewDoc}
            onClose={() => setPreviewDoc(null)}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
}
