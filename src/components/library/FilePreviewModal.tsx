import React, { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Download, AlertCircle, FileText, Loader2 } from "lucide-react";
import { renderAsync } from "docx-preview";
import * as XLSX from "xlsx";
import type { LibraryDocument } from "@/api/library";
import { downloadLibraryFileBlob, handleSecureDownload } from "@/api/library";
const formatFileSize = (bytes: number) => {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
};
interface FilePreviewModalProps {
  document: LibraryDocument | null;
  onClose: () => void;
}

export function FilePreviewModal({ document, onClose }: FilePreviewModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [unsupported, setUnsupported] = useState(false);

  // Ref for rendering docx or xlsx html
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!document) {
      // Cleanup
      if (blobUrl) URL.revokeObjectURL(blobUrl);
      setBlobUrl(null);
      setError(null);
      setUnsupported(false);
      return;
    }

    const loadFile = async () => {
      setLoading(true);
      setError(null);
      setUnsupported(false);

      const ext = document.extension.toLowerCase();

      // Check unsupported first
      if (["pptx", "zip", "rar"].includes(ext)) {
        setUnsupported(true);
        setLoading(false);
        return;
      }

      try {
        const blob = await downloadLibraryFileBlob(document.download_url);

        if (["pdf", "png", "jpg", "jpeg", "gif", "webp", "mp4", "webm"].includes(ext)) {
          // Bắt buộc ép kiểu MIME type chuẩn. Backend thường trả về application/octet-stream 
          // do dùng as_attachment=True, khiến iframe tải file thay vì render PDF, hoặc ảnh bị vỡ.
          let mimeType = blob.type;
          if (!mimeType || mimeType.includes("octet-stream") || mimeType.includes("json")) {
            if (ext === "pdf") mimeType = "application/pdf";
            else if (ext === "png") mimeType = "image/png";
            else if (ext === "jpg" || ext === "jpeg") mimeType = "image/jpeg";
            else if (ext === "gif") mimeType = "image/gif";
            else if (ext === "webp") mimeType = "image/webp";
            else if (ext === "mp4") mimeType = "video/mp4";
            else if (ext === "webm") mimeType = "video/webm";
          }

          const typedBlob = new Blob([blob], { type: mimeType });
          const url = URL.createObjectURL(typedBlob);
          setBlobUrl(url);
        } else if (ext === "docx") {
          if (containerRef.current) {
            containerRef.current.innerHTML = "";
            // Cấu hình inWrapper: true để hiển thị giống trang giấy A4
            await renderAsync(blob, containerRef.current, null, {
              className: "docx-viewer",
              inWrapper: true,
              ignoreWidth: false,
              ignoreHeight: false,
              ignoreFonts: false,
              breakPages: true,
              useBase64URL: true,
            });
          }
        } else if (ext === "xlsx" || ext === "xls" || ext === "csv") {
          const arrayBuffer = await blob.arrayBuffer();
          const workbook = XLSX.read(arrayBuffer, { type: "array" });
          const firstSheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheetName];
          const htmlStr = XLSX.utils.sheet_to_html(worksheet);
          if (containerRef.current) {
            containerRef.current.innerHTML = `<div class="xlsx-viewer w-full h-full p-4 sm:p-6 bg-[#f8fafc] text-black">
              <div class="bg-white rounded shadow-sm border border-border inline-block min-w-full">
                ${htmlStr}
              </div>
            </div>`;

            // Tinh chỉnh CSS cho bảng HTML từ Excel
            const table = containerRef.current.querySelector("table");
            if (table) {
              table.style.borderCollapse = "collapse";
              table.style.width = "100%";
              table.style.fontSize = "14px";
              const cells = table.querySelectorAll("td, th");
              cells.forEach((cell: any) => {
                cell.style.border = "1px solid #e2e8f0";
                cell.style.padding = "8px 12px";
                cell.style.whiteSpace = "nowrap"; // Giữ format cột không bị co rúm
              });
            }
          }
        } else {
          setUnsupported(true);
        }
      } catch (err: any) {
        console.error("Preview error:", err);
        setError(`Lỗi: ${err.message || "Không thể tải file"}`);
      } finally {
        setLoading(false);
      }
    };

    loadFile();

    return () => {
      if (blobUrl) URL.revokeObjectURL(blobUrl);
    };
  }, [document]);

  // Disable body scroll when modal is open
  useEffect(() => {
    if (document) {
      window.document.body.style.overflow = "hidden";
    }
    return () => {
      window.document.body.style.overflow = "";
    };
  }, [document]);

  if (!document) return null;

  const ext = document.extension.toLowerCase();
  const isMedia = ["png", "jpg", "jpeg", "gif", "webp"].includes(ext);
  const isVideo = ["mp4", "webm"].includes(ext);
  const isPdf = ext === "pdf";
  const needsContainer = ["docx", "doc", "xlsx", "xls", "csv"].includes(ext);

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-md"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 30 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 30 }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        className="w-full max-w-6xl h-[92vh] bg-background border border-white/10 rounded-3xl shadow-[0_0_50px_-12px_rgba(0,0,0,0.5)] flex flex-col overflow-hidden relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border/40 bg-card/80 backdrop-blur-xl z-20 shadow-sm">
          <div className="flex items-center gap-4 overflow-hidden">
            <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-primary/10 text-primary shrink-0 shadow-sm border border-primary/20">
              <FileText className="w-6 h-6" />
            </div>
            <div className="min-w-0">
              <h3 className="text-base sm:text-lg font-semibold truncate text-foreground tracking-tight" title={document.title}>
                {document.title}
              </h3>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase bg-accent text-accent-foreground">
                  {ext}
                </span>
                <span className="text-xs font-medium text-muted-foreground">
                  {formatFileSize(document.file_size)}
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3 shrink-0 ml-4">
            <button
              onClick={(e) => {
                e.stopPropagation();
                const filename = document.title.toLowerCase().endsWith(`.${ext}`) ? document.title : `${document.title}.${ext}`;
                handleSecureDownload(document.download_url, filename);
              }}
              className="flex items-center gap-2 px-4 py-2 text-sm font-semibold bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 hover:shadow-md hover:-translate-y-0.5 transition-all"
            >
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">Tải về máy</span>
            </button>
            <div className="w-px h-8 bg-border/50 mx-1 hidden sm:block"></div>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              title="Đóng"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 relative bg-accent/5 overflow-hidden">
          {loading && (
            <div className="absolute inset-0 z-10 p-4 sm:p-10 bg-background/95 backdrop-blur-sm flex flex-col items-center overflow-y-auto">
              {/* Premium Document Skeleton Layout */}
              <div className="w-full max-w-4xl flex flex-col gap-8 animate-pulse p-8 bg-card rounded-2xl border border-border/40 shadow-sm mt-8">
                {/* Skeleton Header */}
                <div className="flex items-center justify-between w-full pb-6 border-b border-border/40">
                  <div className="h-10 bg-muted/60 rounded-lg w-1/2"></div>
                  <div className="h-8 bg-muted/60 rounded-lg w-24"></div>
                </div>

                {/* Skeleton Content */}
                <div className="space-y-5 w-full">
                  <div className="h-5 bg-muted/50 rounded w-full"></div>
                  <div className="h-5 bg-muted/50 rounded w-[95%]"></div>
                  <div className="h-5 bg-muted/50 rounded w-[90%]"></div>
                  <div className="h-5 bg-muted/50 rounded w-[85%]"></div>
                </div>

                <div className="space-y-5 w-full mt-4">
                  <div className="h-5 bg-muted/50 rounded w-[92%]"></div>
                  <div className="h-5 bg-muted/50 rounded w-full"></div>
                  <div className="h-5 bg-muted/50 rounded w-[88%]"></div>
                </div>

                {/* Skeleton Graph/Image placeholder */}
                <div className="w-full h-64 bg-muted/40 rounded-xl mt-4 border border-border/30"></div>
              </div>
            </div>
          )}

          {error && (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center p-8 text-center bg-background/95 backdrop-blur-sm">
              <div className="w-24 h-24 mb-6 rounded-full bg-destructive/10 flex items-center justify-center border border-destructive/20 shadow-inner">
                <AlertCircle className="w-12 h-12 text-destructive" />
              </div>
              <h3 className="text-2xl font-bold tracking-tight mb-3">Tệp quá lớn</h3>
              <p className="text-muted-foreground text-base max-w-md mb-8 leading-relaxed">
                Hệ thống không thể tải bản xem trước cho tài liệu này. Vui lòng tải file gốc về máy để xem.
              </p>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  const filename = document.title.toLowerCase().endsWith(`.${ext}`) ? document.title : `${document.title}.${ext}`;
                  handleSecureDownload(document.download_url, filename);
                }}
                className="flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-xl font-medium hover:bg-primary/90 hover:-translate-y-1 hover:shadow-lg transition-all"
              >
                <Download className="w-5 h-5" />
                Tải file trực tiếp
              </button>
            </div>
          )}

          {unsupported && !error && (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center p-8 text-center bg-background/95 backdrop-blur-sm">
              <div className="w-24 h-24 mb-6 rounded-full bg-primary/10 flex items-center justify-center border border-primary/20 shadow-inner">
                <FileText className="w-12 h-12 text-primary/60" />
              </div>
              <h3 className="text-2xl font-bold tracking-tight mb-3">Chưa hỗ trợ xem trước</h3>
              <p className="text-muted-foreground text-base max-w-md mb-8 leading-relaxed">
                Định dạng <strong className="text-foreground font-semibold">.{ext.toUpperCase()}</strong> hiện không thể hiển thị trực tiếp trên trình duyệt. Vui lòng tải về máy để xem tài liệu với chất lượng tốt nhất.
              </p>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  const filename = document.title.toLowerCase().endsWith(`.${ext}`) ? document.title : `${document.title}.${ext}`;
                  handleSecureDownload(document.download_url, filename);
                }}
                className="flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-xl font-medium hover:bg-primary/90 hover:-translate-y-1 hover:shadow-lg transition-all"
              >
                <Download className="w-5 h-5" />
                Tải về ngay
              </button>
            </div>
          )}

          <div 
            className={`absolute inset-0 overflow-auto ${error || unsupported ? 'hidden' : 'block'}`}
            style={{ WebkitOverflowScrolling: 'touch' }}
          >
            {isMedia && blobUrl && (
              <div className="flex items-center justify-center min-w-full min-h-full p-4">
                <img src={blobUrl} alt={document.title} className="max-w-none max-h-[85vh] object-contain rounded shadow-sm" />
              </div>
            )}
            {isVideo && blobUrl && (
              <div className="flex items-center justify-center min-w-full min-h-full p-4 bg-black">
                <video src={blobUrl} controls className="max-w-full max-h-[85vh] rounded shadow-sm" />
              </div>
            )}
            {isPdf && blobUrl && (
              <iframe src={`${blobUrl}#toolbar=0`} className="w-full h-full border-none bg-white block" title={document.title} />
            )}
            {needsContainer && (
              <div
                ref={containerRef}
                className="min-w-max min-h-full bg-white text-black pb-8"
              />
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
