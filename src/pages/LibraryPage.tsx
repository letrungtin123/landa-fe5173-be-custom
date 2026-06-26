import { useState, useCallback, useRef } from "react";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { motion, AnimatePresence } from "framer-motion";
import { FilePreviewModal } from "@/components/library/FilePreviewModal";
import {
  Search,
  Download,
  FileText,
  LayoutTemplate,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  FolderOpen,
} from "lucide-react";
import IconExcel from "@/assets/LibraryIcon/Excel.png";
import IconJPG from "@/assets/LibraryIcon/JPG.png";
import IconMP4 from "@/assets/LibraryIcon/MP4.png";
import IconPDF from "@/assets/LibraryIcon/PDF.png";
import IconPNG from "@/assets/LibraryIcon/PNG.png";
import IconPP from "@/assets/LibraryIcon/PP.png";
import IconWord from "@/assets/LibraryIcon/Word.png";
import { UserProfileCard } from "@/components/dashboard/UserProfileCard";
import { BadgeShowcase } from "@/components/badges/BadgeShowcase";
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

const getDocumentIconSrc = (ext: string) => {
  const t = ext?.toLowerCase() || "";
  if (t === "pdf") return IconPDF;
  if (t.includes("doc")) return IconWord;
  if (t.includes("xls")) return IconExcel;
  if (t.includes("ppt")) return IconPP;
  if (t === "mp4" || t === "mov") return IconMP4;
  if (t === "jpeg" || t === "jpg") return IconJPG;
  if (t === "png") return IconPNG;
  return IconPDF;
};

const removeVietnameseTones = (str: string) => {
  if (!str) return "";
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D");
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

// Palette 16 màu phân biệt rõ ràng, gán theo index → không trùng
const CATEGORY_COLORS = [
  "#ea4335", // đỏ
  "#0ea5e9", // xanh dương
  "#10b981", // xanh lá
  "#ff6c37", // cam
  "#8b5cf6", // tím
  "#ec4899", // hồng
  "#f59e0b", // vàng amber
  "#06b6d4", // cyan
  "#6366f1", // indigo
  "#14b8a6", // teal
  "#e11d48", // rose đậm
  "#84cc16", // lime
  "#d946ef", // fuchsia
  "#0284c7", // sky đậm
  "#dc2626", // red đậm
  "#7c3aed", // violet
];

const getCategoryColor = (index: number) => {
  return CATEGORY_COLORS[index % CATEGORY_COLORS.length];
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
  const [showAllCategories, setShowAllCategories] = useState(false);
  const [mobileCatSearch, setMobileCatSearch] = useState("");
  const categoryCarouselRef = useRef<HTMLDivElement>(null);

  // Debounce search 300ms — tránh spam API mỗi keystroke
  const debouncedSearch = useDebouncedValue(searchTerm, 300);

  const handleSearch = useCallback((value: string) => {
    setSearchTerm(value);
    setCurrentPage(1);
  }, []);

  const handleCategoryClick = useCallback((catId: string) => {
    setActiveCategory((prev) => (prev === catId ? "" : catId));
    setSearchTerm("");
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
    return removeVietnameseTones(cat.name.toLowerCase()).includes(removeVietnameseTones(debouncedSearch.toLowerCase()));
  });
  const totalDocuments = (categoriesData?.categories || []).reduce((sum, c) => sum + (c.count || 0), 0);
  const documents = documentsData?.results || [];
  const totalCount = documentsData?.count || 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  const renderPagination = () => (
    <div className={`flex flex-col sm:flex-row sm:items-center justify-between pt-4 gap-3 sm:gap-0 transition-opacity duration-300 ${docLoading ? 'opacity-50 pointer-events-none' : ''}`}>
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="text-[14px] font-normal leading-[18px] text-muted-foreground">
          Trang {currentPage} / {totalPages} ({totalCount} tài liệu)
        </div>
        <div className="flex items-center gap-2 text-[14px] font-normal leading-[18px] text-muted-foreground">
          <span>Hiển thị:</span>
          <DropdownMenu modal={false}>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="outline" 
                size="sm" 
                className="h-8 w-[110px] justify-between text-[14px] font-semibold leading-[18px]"
              >
                {pageSize} / trang
                <ChevronDown className="h-4 w-4 opacity-50" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-[110px] min-w-0">
              {[5, 10, 20, 50].map((size) => (
                <DropdownMenuItem
                  key={size}
                  onClick={() => {
                    setPageSize(size);
                    setCurrentPage(1);
                  }}
                  className={`text-[14px] font-normal leading-[18px] cursor-pointer justify-between ${pageSize === size ? 'bg-primary/10 text-primary font-semibold' : ''}`}
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
                className={`inline-flex h-9 w-9 items-center justify-center rounded-lg text-[14px] font-semibold leading-[18px] transition-colors ${
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
  );

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="mx-auto w-full max-w-[1440px] px-4 pb-8 md:px-8 xl:px-10"
    >
      {/* Mobile "View All Categories" Modal */}
      <AnimatePresence>
        {showAllCategories && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed inset-0 z-50 bg-background flex flex-col lg:hidden"
          >
            <div className="flex items-center gap-3 p-4 border-b border-border bg-card shrink-0">
              <button onClick={() => { setShowAllCategories(false); setMobileCatSearch(""); }} className="h-10 w-10 flex items-center justify-center rounded-full bg-accent/10 text-foreground">
                <ChevronLeft className="h-6 w-6" />
              </button>
              <h2 className="text-[18px] font-bold text-foreground">Tất cả danh mục</h2>
            </div>
            <div className="p-4 border-b border-border bg-card shadow-sm shrink-0">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Tìm kiếm danh mục..."
                  value={mobileCatSearch}
                  onChange={(e) => setMobileCatSearch(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 bg-accent/5 border border-border rounded-xl outline-none focus:border-primary transition-colors text-[14px]"
                />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-4 pb-24">
              {categories
                .filter(c => 
                  removeVietnameseTones(c.name.toLowerCase()).includes(removeVietnameseTones(mobileCatSearch.toLowerCase()))
                )
                .map((cat: DocumentCategory, catIndex: number) => {
                  const bgColor = getCategoryColor(catIndex);
                  const isActive = activeCategory === cat.id;
                  return (
                    <Card
                      key={cat.id}
                      onClick={() => {
                        handleCategoryClick(cat.id);
                        setShowAllCategories(false);
                        setMobileCatSearch("");
                      }}
                      className={`group/card cursor-pointer overflow-hidden border-2 transition-all duration-300 w-full h-[200px] rounded-[28px] flex-col ${
                        isActive
                          ? "ring-2 ring-offset-2 ring-primary border-primary shadow-md"
                          : "border-transparent hover:shadow-md hover:-translate-y-1"
                      }`}
                      style={{ backgroundColor: bgColor }}
                    >
                      <CardContent className="flex flex-col justify-between h-full p-6 text-white w-full">
                        <div className="flex justify-between items-start">
                          <div className="h-10 w-10 bg-white/90 rounded-lg flex items-center justify-center shadow-sm">
                            <FolderOpen className="h-6 w-6" style={{ color: bgColor }} />
                          </div>
                        </div>
                        <div>
                          <h3 className="text-[14px] font-bold leading-[18px] uppercase tracking-wide mb-2">
                            {cat.name}
                          </h3>
                          <div className="text-[10px] font-semibold leading-[14px] opacity-90">
                            {cat.count} tài liệu
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex flex-col lg:flex-row w-full">
        {/* Left Sidebar */}
        <div className="hidden lg:block w-full lg:w-[280px] shrink-0 lg:border-r lg:border-border lg:pr-8 pt-4 lg:pt-8 mb-6 lg:mb-0">
          <div className="sticky top-24 space-y-10 max-h-[calc(100vh-120px)] overflow-y-auto hide-scrollbar pb-8">
            <UserProfileCard />
            <BadgeShowcase />
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 min-w-0 lg:pl-8 mt-8 lg:mt-0 pt-8">
          {activeCategory ? (
            <div className="space-y-6">
              <div>
                <button
                  onClick={() => handleCategoryClick("")}
                  className="flex items-center gap-1.5 text-[14px] font-medium text-muted-foreground hover:text-foreground transition-colors mb-4"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Quay lại
                </button>
              </div>

              <h1 className="text-[36px] font-semibold leading-[40px] text-foreground uppercase tracking-tight">
                {categoriesData?.categories?.find(c => c.id === activeCategory)?.name || "Danh mục"}
              </h1>

              <div className="flex flex-col sm:flex-row gap-4 sm:items-center pt-2 pb-4">
                <div className="relative flex-1 sm:max-w-md">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Search"
                    value={searchTerm}
                    onChange={(e) => handleSearch(e.target.value)}
                    className="w-full pl-12 pr-4 py-2.5 bg-card border border-border rounded-full outline-none focus:border-primary transition-colors text-[14px] font-normal leading-[18px] shadow-sm"
                  />
                </div>
                
                <DropdownMenu modal={false}>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="rounded-full bg-card h-10 px-6 border-border shadow-sm text-[14px] font-semibold leading-[18px]">
                      <LayoutTemplate className="h-4 w-4 mr-2 text-muted-foreground" /> 
                      {activeExtension ? activeExtension.toUpperCase() : "Filter"}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-40 rounded-xl">
                    <DropdownMenuItem onClick={() => handleExtensionClick("")} className={!activeExtension ? "font-bold text-primary" : ""}>
                      Tất cả định dạng
                    </DropdownMenuItem>
                    {Object.keys(EXTENSION_COLORS).filter(k => !['jpeg', 'jpg'].includes(k)).map(ext => (
                      <DropdownMenuItem key={ext} onClick={() => handleExtensionClick(ext)} className={activeExtension === ext ? "font-bold text-primary" : ""}>
                        {ext.toUpperCase()}
                      </DropdownMenuItem>
                    ))}
                    <DropdownMenuItem onClick={() => handleExtensionClick("png")} className={["png", "jpg", "jpeg"].includes(activeExtension) ? "font-bold text-primary" : ""}>
                      Hình ảnh
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              {/* Grid of Documents */}
              <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 transition-opacity duration-300 ${docFetching ? 'opacity-50 pointer-events-none' : ''}`}>
                {docLoading ? (
                  Array.from({ length: pageSize }).map((_, i) => (
                    <div key={`m-skeleton-${i}`} className="h-[200px] animate-pulse rounded-2xl border border-border/50 bg-card p-5" />
                  ))
                ) : documents.length > 0 ? (
                  documents.map((doc: LibraryDocument) => {
                    const iconSrc = getDocumentIconSrc(doc.extension);
                    const extColor = EXTENSION_COLORS[doc.extension] || "#666";
                    return (
                      <Card key={doc.id} className="rounded-2xl border-border bg-card hover:shadow-md hover:-translate-y-1 transition-all duration-300 flex flex-col h-[200px] p-5 shadow-sm group">
                        <div className="flex justify-between items-start mb-4">
                          <div className="h-12 w-12 shrink-0 rounded-xl bg-background border flex items-center justify-center shadow-xs overflow-hidden p-2">
                            <img src={iconSrc} alt={doc.extension} className={`h-full w-full object-contain transition-transform ${doc.extension?.toLowerCase() === 'pdf' ? 'scale-[1.3]' : ''}`} />
                          </div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              const ext = doc.extension.toLowerCase();
                              const filename = doc.title.toLowerCase().endsWith(`.${ext}`) ? doc.title : `${doc.title}.${ext}`;
                              handleSecureDownload(doc.download_url, filename);
                            }}
                            className="shrink-0 h-10 w-10 flex items-center justify-center rounded-full hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
                          >
                            <Download className="h-5 w-5" />
                          </button>
                        </div>
                        
                        <h3 className="font-semibold text-[14px] leading-[18px] text-foreground line-clamp-2 flex-1 mt-1 group-hover:text-primary transition-colors break-words">
                          {doc.title}
                        </h3>

                        <div className="flex justify-between items-end mt-4">
                          <span className="text-[10px] font-semibold leading-[14px] text-muted-foreground">
                            Kích thước: {formatFileSize(doc.file_size)}
                          </span>
                          <button 
                            className="text-[14px] font-semibold leading-[18px] text-primary hover:text-primary/80"
                            onClick={() => setPreviewDoc(doc)}
                          >
                            Xem trước
                          </button>
                        </div>
                      </Card>
                    );
                  })
                ) : (
                  <div className="col-span-full p-12 text-center text-muted-foreground border border-dashed rounded-2xl bg-card/50">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <FileText className="h-8 w-8 opacity-20" />
                      <p className="text-[14px] font-normal leading-[18px]">
                        {searchTerm
                          ? `Không tìm thấy tài liệu "${searchTerm}"`
                          : "Chưa có tài liệu nào."}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {renderPagination()}
            </div>
          ) : (
            <div className="space-y-10">
          {/* Banner */}
          <div className="space-y-4">
            <div>
              <div 
                className="mb-3 inline-flex w-fit whitespace-nowrap items-center justify-center h-[23px] rounded-[41px] px-3 py-1 text-[10px] font-bold uppercase tracking-widest font-['SF_Pro',_sans-serif]"
                style={{ backgroundColor: "#43FDD7", color: "#000" }}
              >
                Library
              </div>
              <h1 className="text-[36px] font-semibold leading-[40px] text-foreground mb-4 md:mb-6">
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
                  className="w-full pl-12 pr-4 py-3 bg-card border border-border rounded-full outline-none focus:border-primary transition-colors text-[14px] font-normal leading-[18px]"
                />
              </div>
              <div className="text-[14px] font-normal leading-[18px] text-muted-foreground shrink-0">
                {totalDocuments} tài liệu
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {Object.entries(EXTENSION_COLORS).filter(([k]) => !["jpeg","jpg"].includes(k) || k === "jpg").map(([ext, color]) => (
                <button
                  key={ext}
                  onClick={() => handleExtensionClick(ext)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-bold leading-[14px] transition-all ${
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
                  className="px-3 py-1.5 rounded-full text-[10px] font-semibold leading-[14px] border border-border bg-card hover:bg-accent/10 transition-colors"
                >
                  ✕ Bỏ lọc
                </button>
              )}
            </div>
          </div>

          {/* Categories */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-[20px] font-bold leading-[24px] text-foreground">
                Danh mục tài liệu
              </h2>
              {categories.length > 4 && (
                <button
                  onClick={() => setShowAllCategories(true)}
                  className="text-[14px] font-semibold leading-[18px] text-primary hover:underline lg:hidden"
                >
                  Xem tất cả
                </button>
              )}
            </div>

            {catLoading ? (
              <div className="flex gap-4 overflow-hidden">
                {[1, 2, 3, 4].map((k) => (
                  <div key={k} className="h-[200px] w-[220px] sm:w-[calc(50%-8px)] lg:w-[calc(25%-12px)] rounded-[28px] bg-accent/10 animate-pulse shrink-0" />
                ))}
              </div>
            ) : categories.length > 0 ? (
              <div className="relative group">
                <div
                  ref={categoryCarouselRef}
                  className="flex gap-4 overflow-x-auto scroll-smooth snap-x snap-mandatory pb-4 -mb-4 hide-scrollbar"
                >
                  {categories.map((cat: DocumentCategory, catIndex: number) => {
                    const bgColor = getCategoryColor(catIndex);
                    const isActive = activeCategory === cat.id;
                    const displayClass = catIndex >= 4 ? "hidden lg:flex" : "flex";

                    return (
                      <Card
                        key={cat.id}
                        onClick={() => handleCategoryClick(cat.id)}
                        className={`group/card cursor-pointer overflow-hidden border-2 transition-all duration-300 shrink-0 snap-start w-[220px] sm:w-[calc(50%-8px)] lg:w-[calc(25%-12px)] h-[200px] rounded-[28px] ${displayClass} flex-col ${
                          isActive
                            ? "ring-2 ring-offset-2 ring-primary border-primary shadow-md"
                            : "border-transparent hover:shadow-md hover:-translate-y-1"
                        }`}
                        style={{ backgroundColor: bgColor }}
                      >
                        <CardContent className="flex flex-col justify-between h-full p-6 text-white w-full">
                          <div className="flex justify-between items-start">
                            <div className="h-10 w-10 bg-white/90 rounded-lg flex items-center justify-center shadow-sm">
                              <FolderOpen className="h-6 w-6" style={{ color: bgColor }} />
                            </div>
                          </div>
                          <div>
                            <h3 className="text-[14px] font-bold leading-[18px] uppercase tracking-wide mb-2">
                              {cat.name}
                            </h3>
                            <div className="text-[10px] font-semibold leading-[14px] opacity-90">
                              {cat.count} tài liệu
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>

                {/* Left Arrow (PC only) */}
                <button
                  onClick={() => {
                    if (categoryCarouselRef.current) {
                      const scrollAmount = categoryCarouselRef.current.clientWidth + 16;
                      categoryCarouselRef.current.scrollBy({ left: -scrollAmount, behavior: 'smooth' });
                    }
                  }}
                  className="hidden absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1/2 z-10 lg:flex h-10 w-10 items-center justify-center rounded-full bg-background border shadow-md hover:scale-105 text-foreground opacity-0 group-hover:opacity-100 transition-all duration-200"
                  aria-label="Trước"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>

                {/* Right Arrow (PC only) */}
                <button
                  onClick={() => {
                    if (categoryCarouselRef.current) {
                      const scrollAmount = categoryCarouselRef.current.clientWidth + 16;
                      categoryCarouselRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
                    }
                  }}
                  className="hidden absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 z-10 lg:flex h-10 w-10 items-center justify-center rounded-full bg-background border shadow-md hover:scale-105 text-foreground opacity-0 group-hover:opacity-100 transition-all duration-200"
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
              <h2 className="text-[20px] font-bold leading-[24px] text-foreground">
                {activeCategory
                  ? `Tài liệu: ${categories.find((c: DocumentCategory) => c.id === activeCategory)?.name || ""}`
                  : "Tất cả tài liệu"}
              </h2>
              {activeCategory && (
                <button
                  onClick={() => handleCategoryClick("")}
                  className="text-[14px] font-semibold leading-[18px] text-primary hover:underline"
                >
                  Xem tất cả
                </button>
              )}
            </div>

            <>
              {/* Desktop table */}
              <div className="hidden md:block border border-border/50 rounded-2xl overflow-hidden w-full bg-card">
                <table className="w-full table-fixed">
                  <thead className="bg-[#f8fafc]/80 dark:bg-accent/5 backdrop-blur-sm border-b border-border/50">
                      <tr className="text-left text-[10px] font-bold leading-[14px] text-muted-foreground uppercase tracking-wider">
                        <th className="px-4 xl:px-6 py-4 w-[32%]">
                          Tên tài liệu
                        </th>
                        <th className="px-4 xl:px-6 py-4 w-[18%]">
                          Danh mục
                        </th>
                        <th className="hidden md:table-cell px-4 xl:px-6 py-4 w-[10%]">
                          Loại
                        </th>
                        <th className="px-4 xl:px-6 py-4 w-[12%]">
                          Dung lượng
                        </th>
                        <th className="px-4 xl:px-6 py-4 w-[18%]">
                          Người đăng
                        </th>
                        <th className="pl-4 pr-8 xl:pl-6 xl:pr-10 py-4 w-[10%]"></th>
                      </tr>
                    </thead>
                    <tbody className={`divide-y divide-border/30 transition-opacity duration-300 ${docFetching ? 'opacity-50 pointer-events-none' : ''}`}>
                      {docLoading ? (
                        Array.from({ length: pageSize }).map((_, i) => (
                          <tr key={`skeleton-${i}`} className="animate-pulse">
                            <td className="px-4 xl:px-6 py-4">
                              <div className="flex items-center gap-4">
                                <div className="h-10 w-10 shrink-0 rounded-lg bg-accent/30"></div>
                                <div className="h-4 w-32 sm:w-48 bg-accent/30 rounded"></div>
                              </div>
                            </td>
                            <td className="px-4 xl:px-6 py-4">
                              <div className="h-4 w-20 bg-accent/30 rounded"></div>
                            </td>
                            <td className="hidden md:table-cell px-4 xl:px-6 py-4">
                              <div className="h-5 w-12 bg-accent/30 rounded"></div>
                            </td>
                            <td className="px-4 xl:px-6 py-4">
                              <div className="h-4 w-16 bg-accent/30 rounded"></div>
                            </td>
                            <td className="px-4 xl:px-6 py-4">
                              <div className="flex items-center gap-3">
                                <div className="h-8 w-8 rounded-full bg-accent/30 shrink-0"></div>
                                <div className="h-4 w-24 bg-accent/30 rounded flex-1"></div>
                              </div>
                            </td>
                            <td className="pl-4 pr-8 xl:pl-6 xl:pr-10 py-4 text-right">
                              <div className="h-8 w-8 bg-accent/30 rounded-lg inline-block"></div>
                            </td>
                          </tr>
                        ))
                      ) : documents.length > 0 ? (
                        documents.map((doc: LibraryDocument) => {
                          const iconSrc = getDocumentIconSrc(doc.extension);
                        const extColor = EXTENSION_COLORS[doc.extension] || "#666";

                        return (
                          <tr
                            key={doc.id}
                            onClick={() => setPreviewDoc(doc)}
                            className="group hover:bg-accent/5 transition-colors cursor-pointer"
                          >
                            <td className="px-4 xl:px-6 py-4">
                              <div className="flex items-center gap-3 xl:gap-4 min-w-0">
                                <div className="h-10 w-10 shrink-0 rounded-lg bg-background shadow-xs flex items-center justify-center border border-border/50 group-hover:shadow-sm transition-shadow overflow-hidden p-1.5">
                                  <img src={iconSrc} alt={doc.extension} className={`h-full w-full object-contain transition-transform ${doc.extension?.toLowerCase() === 'pdf' ? 'scale-[1.3]' : ''}`} />
                                </div>
                                <span className="font-semibold text-[14px] leading-[18px] text-foreground group-hover:text-primary transition-colors line-clamp-2 break-words flex-1 min-w-0">
                                  {doc.title}
                                </span>
                              </div>
                            </td>
                            <td className="px-4 xl:px-6 py-4">
                              <span
                                className="text-[13px] font-medium leading-[18px] text-muted-foreground truncate block max-w-full"
                                title={doc.category_name}
                              >
                                {doc.category_name || "—"}
                              </span>
                            </td>
                            <td className="hidden md:table-cell px-4 xl:px-6 py-4">
                              <span
                                className="inline-block text-white text-[10px] font-bold leading-[14px] px-2 py-0.5 rounded uppercase truncate max-w-full"
                                style={{ backgroundColor: extColor }}
                                title={doc.extension}
                              >
                                {doc.extension}
                              </span>
                            </td>
                            <td className="px-4 xl:px-6 py-4 text-[14px] font-normal leading-[18px] text-muted-foreground truncate">
                              {formatFileSize(doc.file_size)}
                            </td>
                            <td className="px-4 xl:px-6 py-4 min-w-0">
                              <div className="flex items-center gap-2 xl:gap-3 min-w-0">
                                <div className="h-8 w-8 shrink-0 rounded-full bg-accent text-accent-foreground flex items-center justify-center text-[10px] font-bold leading-[14px] shadow-sm">
                                  {doc.uploaded_by_name.charAt(0)}
                                </div>
                                <span className="text-[14px] font-semibold leading-[18px] text-muted-foreground truncate flex-1 min-w-0" title={doc.uploaded_by_name}>
                                  {doc.uploaded_by_name}
                                </span>
                              </div>
                            </td>
                            <td className="pl-4 pr-8 xl:pl-6 xl:pr-10 py-4 text-right">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const ext = doc.extension.toLowerCase();
                                  const filename = doc.title.toLowerCase().endsWith(`.${ext}`) ? doc.title : `${doc.title}.${ext}`;
                                  handleSecureDownload(doc.download_url, filename);
                                }}
                                className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg hover:bg-card border border-transparent hover:border-border hover:shadow-sm text-muted-foreground hover:text-foreground transition-all"
                              >
                                <Download className="h-4 w-4" />
                              </button>
                            </td>
                          </tr>
                        );
                        })
                      ) : (
                        <tr>
                          <td colSpan={6} className="p-16 text-center text-muted-foreground bg-card/50">
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
                    const iconSrc = getDocumentIconSrc(doc.extension);
                    const extColor = EXTENSION_COLORS[doc.extension] || "#666";
                    return (
                      <div
                        key={doc.id}
                        onClick={() => setPreviewDoc(doc)}
                        className="group rounded-xl border border-border/50 bg-card p-4 active:bg-accent/5 transition-colors cursor-pointer"
                      >
                        <div className="flex items-start gap-3">
                          <div
                            className="h-10 w-10 shrink-0 rounded-lg bg-background shadow-xs flex items-center justify-center border border-border/50 overflow-hidden p-1.5"
                          >
                            <img src={iconSrc} alt={doc.extension} className={`h-full w-full object-contain transition-transform ${doc.extension?.toLowerCase() === 'pdf' ? 'scale-[1.3]' : ''}`} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-[14px] leading-[18px] text-foreground line-clamp-2 mb-1.5 break-words">
                              {doc.title}
                            </p>
                            <div className="flex flex-wrap items-center gap-2 text-[10px] font-semibold leading-[14px] text-muted-foreground">
                              <span
                                className="hidden text-white text-[10px] font-bold leading-[14px] px-2 py-0.5 rounded uppercase"
                                style={{ backgroundColor: extColor }}
                              >
                                {doc.extension}
                              </span>
                              <span className="text-[10px] font-semibold leading-[14px]">{formatFileSize(doc.file_size)}</span>
                              <span className="hidden sm:inline text-[10px] font-semibold leading-[14px]">•</span>
                              <span className="hidden sm:inline text-[14px] font-normal leading-[18px]">{doc.uploaded_by_name}</span>
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
                      <p className="text-[14px] font-normal leading-[18px]">
                        {searchTerm
                          ? `Không tìm thấy tài liệu "${searchTerm}"`
                          : "Chưa có tài liệu nào."}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              </>
            </div>
            
            {renderPagination()}
          </div>
          )}
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
