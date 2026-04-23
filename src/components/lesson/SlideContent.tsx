// ============================================================
// SlideContent — Hiển thị nội dung HTML từ Open edX
// Lấy HTML qua Courseware Sequence API (hoặc trực tiếp từ blocks)
// ============================================================

import { useEffect, useState } from "react";
import DOMPurify from "dompurify";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";
import { getSequenceContent } from "@/api/blocks";
import type { LessonDetail } from "@/data/types";

interface SlideContentProps {
  lesson: LessonDetail;
}

/**
 * Trích xuất nội dung text/html từ rendered content.
 * Courseware API trả full rendered HTML → parse lấy phần cần thiết.
 */
function extractTextContent(html: string): string {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");

  // Tìm nội dung trong các wrapper phổ biến
  const content =
    doc.querySelector(".xblock-student_view") ||
    doc.querySelector(".xblock") ||
    doc.querySelector(".xmodule_display") ||
    doc.querySelector("body");

  return content?.innerHTML || html;
}

export function SlideContent({ lesson }: SlideContentProps) {
  const [htmlContent, setHtmlContent] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Ưu tiên: _htmlContent từ blocks API (nếu feature flag bật)
  // Fallback: lấy qua Courseware Sequence API
  useEffect(() => {
    // Nếu đã có HTML content từ blocks API → dùng luôn
    if (lesson._htmlContent) {
      setHtmlContent(
        DOMPurify.sanitize(lesson._htmlContent, {
          FORBID_TAGS: ["script", "style"],
          FORBID_ATTR: ["onerror", "onload", "onclick"],
        })
      );
      return;
    }

    // Fallback: lấy qua Courseware Sequence API
    if (!lesson.id) return;

    setIsLoading(true);
    setError(null);

    getSequenceContent(lesson.id)
      .then((res) => {
        // Gộp content từ tất cả items
        const allHtml = res.items
          ?.map((item) => extractTextContent(item.content || ""))
          .join("\n") || "";

        const clean = DOMPurify.sanitize(allHtml, {
          ALLOWED_TAGS: [
            "h1", "h2", "h3", "h4", "h5", "h6",
            "p", "span", "div", "br", "hr",
            "strong", "em", "b", "i", "u", "s",
            "ul", "ol", "li",
            "a", "img", "figure", "figcaption",
            "table", "thead", "tbody", "tr", "th", "td",
            "blockquote", "pre", "code",
            "iframe",
          ],
          ALLOWED_ATTR: [
            "href", "target", "rel", "src", "alt", "title",
            "width", "height", "class", "style",
            "colspan", "rowspan",
            "allowfullscreen", "frameborder",
          ],
          FORBID_TAGS: ["script", "style", "form", "input", "textarea", "select"],
          FORBID_ATTR: ["onerror", "onload", "onclick", "onmouseover"],
          ADD_ATTR: ["target"],
        });
        setHtmlContent(clean);
      })
      .catch(() => {
        setError("Không thể tải nội dung bài học.");
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [lesson.id, lesson._htmlContent]);

  // Vệ sinh nội dung cho trường hợp direct render
  const cleanHtml = htmlContent;

  return (
    <div className="flex min-h-full w-full flex-col">
      {/* Header */}
      <div className="border-b border-border px-6 py-4 md:px-8">
        <div className="flex flex-wrap items-center gap-2 mb-2">
          <Badge className="bg-accent text-accent-foreground font-semibold text-xs uppercase tracking-wider px-3 py-1">
            {lesson.moduleTag}
          </Badge>
          <span className="text-sm text-muted-foreground">
            {lesson.lessonNumber}
          </span>
        </div>
        <h1 className="text-xl font-bold text-foreground md:text-2xl">
          {lesson.title}
        </h1>
      </div>

      {/* Nội dung */}
      <div className="flex flex-1 items-start justify-center p-6 md:p-12">
        {isLoading && (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary/50" />
          </div>
        )}

        {error && !isLoading && (
          <div className="w-full max-w-4xl rounded-2xl border border-destructive/20 bg-destructive/5 p-8 text-center">
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}

        {cleanHtml && !isLoading ? (
          <div
            className="prose prose-slate dark:prose-invert max-w-4xl w-full"
            dangerouslySetInnerHTML={{ __html: cleanHtml }}
          />
        ) : !isLoading && !error ? (
          <div className="flex w-full max-w-4xl flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-muted/20 aspect-[16/9] p-8 text-center">
            <div className="mb-4 text-4xl">📄</div>
            <h3 className="mb-2 text-base font-bold text-foreground">
              {lesson.title}
            </h3>
            <p className="text-sm text-muted-foreground max-w-md">
              Nội dung chưa được cập nhật.
            </p>
          </div>
        ) : null}
      </div>
    </div>
  );
}
