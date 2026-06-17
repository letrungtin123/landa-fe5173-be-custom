import { htmlImageDisplaySrc, htmlImageStoragePath } from "@/utils/storageUrl";

export interface HtmlMediaImage {
  src: string;
  alt: string;
}

export function normalizeHtmlMediaImages(raw: unknown): HtmlMediaImage[] {
  if (!Array.isArray(raw)) return [];

  const seen = new Set<string>();
  const images: HtmlMediaImage[] = [];

  raw.forEach((item: any) => {
    const src = htmlImageStoragePath(typeof item?.src === "string" ? item.src : "");
    if (!src || seen.has(src)) return;
    seen.add(src);

    images.push({
      src,
      alt: typeof item?.alt === "string" ? item.alt : "",
    });
  });

  return images;
}

export function htmlMediaCarouselImages(images: HtmlMediaImage[]): HtmlMediaImage[] {
  return normalizeHtmlMediaImages(images).map((image) => ({
    src: htmlImageDisplaySrc(image.src),
    alt: image.alt || "",
  }));
}
