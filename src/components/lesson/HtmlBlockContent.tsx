// ============================================================
// HtmlBlockContent — Render HTML content block
// ============================================================

import { useMemo } from "react";
import DOMPurify from "dompurify";
import { LessonImageCarousel } from "./LessonImageCarousel";
import { htmlMediaCarouselImages, type HtmlMediaImage } from "@/lib/htmlMedia";
import { htmlImageDisplaySrc, isUploadedStorageImageSrc, isTransientHtmlImageSrc } from "@/utils/storageUrl";

function BadgeCyan({ children }: { children: React.ReactNode }) {
  return (
    <span
      className="rounded-full px-3 py-1 text-[10px] font-semibold uppercase tracking-widest"
      style={{ backgroundColor: "#43FDD7", color: "#000" }}
    >
      {children}
    </span>
  );
}

interface HtmlBlockContentProps {
  htmlContent: string;
  uploadedImages?: HtmlMediaImage[];
  displayName?: string;
  onImageClick?: (src: string) => void;
}

export function HtmlBlockContent({ htmlContent, uploadedImages = [], displayName, onImageClick }: HtmlBlockContentProps) {
  const { finalHtml, images, hasImage } = useMemo(() => {
    const mediaImages = htmlMediaCarouselImages(uploadedImages);
    if (!htmlContent && mediaImages.length === 0) return { finalHtml: "", images: [], hasImage: false };

    const cleanHtml = DOMPurify.sanitize(htmlContent, {
      FORBID_TAGS: ["script", "style"],
      FORBID_ATTR: ["onerror", "onload", "onclick"],
    });

    let imgs: { src: string; alt: string }[] = mediaImages;
    let html = cleanHtml;
    let hasImg = mediaImages.length > 0;

    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(cleanHtml, "text/html");
      const imgEls = Array.from(doc.querySelectorAll("img"));
      imgEls.forEach((img) => {
        const src = img.getAttribute("src") || "";
        if (isTransientHtmlImageSrc(src)) {
          img.remove();
          return;
        }
        img.setAttribute("src", htmlImageDisplaySrc(src));
      });

      const validImgEls = Array.from(doc.querySelectorAll("img"));
      hasImg = hasImg || validImgEls.length > 0;
      const uploadedImgEls = validImgEls.filter((img) => isUploadedStorageImageSrc(img.getAttribute("src")));

      if (uploadedImgEls.length >= 2) {
        imgs = [
          ...mediaImages,
          ...uploadedImgEls.map((img) => ({
          src: img.getAttribute("src") || "",
          alt: img.getAttribute("alt") || "",
          })),
        ];
        uploadedImgEls.forEach((img) => img.remove());
        doc.querySelectorAll("p").forEach((p) => {
          if (!p.textContent?.trim() && p.children.length === 0) {
            p.remove();
          }
        });
      }

      html = doc.body.innerHTML;
    } catch (e) {
      console.error("Failed to parse HTML for carousel", e);
    }

    // Filter out non-HTML artefacts: khi block data rỗng, backend có thể trả "{}" hoặc "\"\""
    const isEmptyContent = (s: string) => {
      const t = s.trim();
      return !t || t === '{}' || t === '""' || t === '&lt;p&gt;&lt;/p&gt;' || t === '<p></p>';
    };

    return { finalHtml: isEmptyContent(html) ? '' : html, images: imgs, hasImage: hasImg };
  }, [htmlContent, uploadedImages]);

  const hasTextContent = !!finalHtml.trim();
  const imageOnly = images.length > 0 && !hasTextContent;

  return (
    <div className={`rounded-3xl border border-border shadow-sm bg-card ${imageOnly ? 'overflow-hidden' : 'px-8 py-7'}`}>
      {displayName && !hasImage && (
        <div className="mb-4 inline-block">
          <BadgeCyan>
            <span className="uppercase">{displayName}</span>
          </BadgeCyan>
        </div>
      )}
      {images.length >= 2 && (
        <div className={hasTextContent ? '-mx-8 -mt-7 mb-6 overflow-hidden rounded-t-3xl' : ''}>
          <LessonImageCarousel
            images={images}
            onImageClick={(src) => onImageClick?.(src)}
          />
        </div>
      )}
      {images.length === 1 && (
        <div className={hasTextContent ? '-mx-8 -mt-7 mb-6 cursor-zoom-in overflow-hidden rounded-t-3xl' : 'cursor-zoom-in'}>
          <img
            src={images[0].src}
            alt={images[0].alt || "Uploaded image"}
            className="w-full object-cover"
            onClick={() => onImageClick?.(images[0].src)}
          />
        </div>
      )}
      {finalHtml.trim() && (
        <div
          className="prose max-w-none text-[14px] 2xl:text-[16px] font-normal leading-[18px] 2xl:leading-[24px] text-foreground/80 dark:prose-invert dark:text-foreground [&>*:first-child]:!mt-0 [&>*:last-child]:!mb-0 [&_p]:!text-[14px] 2xl:[&_p]:!text-[16px] [&_p]:!font-normal [&_p]:!leading-[18px] 2xl:[&_p]:!leading-[24px] [&_span]:!text-[14px] 2xl:[&_span]:!text-[16px] [&_span]:!font-normal [&_span]:!leading-[18px] 2xl:[&_span]:!leading-[24px] [&_li]:!text-[14px] 2xl:[&_li]:!text-[16px] [&_li]:!font-normal [&_li]:!leading-[18px] 2xl:[&_li]:!leading-[24px] [&_div]:!text-[14px] 2xl:[&_div]:!text-[16px] [&_div]:!font-normal [&_div]:!leading-[18px] 2xl:[&_div]:!leading-[24px] [&_h1]:!text-[28px] 2xl:[&_h1]:!text-[34px] [&_h1]:!font-semibold [&_h1]:!leading-[36px] 2xl:[&_h1]:!leading-[42px] [&_h1]:!mt-6 [&_h1]:!mb-3 [&_h1]:!text-foreground [&_h2]:!text-[22px] 2xl:[&_h2]:!text-[26px] [&_h2]:!font-bold [&_h2]:!leading-[28px] 2xl:[&_h2]:!leading-[34px] [&_h2]:!mt-5 [&_h2]:!mb-2 [&_h2]:!text-foreground [&_h3]:!text-[18px] 2xl:[&_h3]:!text-[20px] [&_h3]:!font-semibold [&_h3]:!leading-[24px] 2xl:[&_h3]:!leading-[28px] [&_h3]:!mt-4 [&_h3]:!mb-1 [&_h3]:!text-foreground [&_img]:!cursor-zoom-in"
          dangerouslySetInnerHTML={{ __html: finalHtml }}
          onClick={(e) => {
            const target = e.target as HTMLElement;
            if (target.tagName === "IMG") {
              onImageClick?.((target as HTMLImageElement).src);
            }
          }}
        />
      )}
    </div>
  );
}
