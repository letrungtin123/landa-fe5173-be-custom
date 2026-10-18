import type { ImgHTMLAttributes } from "react";

/**
 * An <img> whose WebP version (a fraction of the PNG size) is used by every
 * browser that supports WebP; others load `src`. The <picture> wrapper takes
 * no box of its own (display: contents), so the image lays out exactly as a
 * bare <img> with the same classes.
 */
export function WebpImage({ webp, ...img }: ImgHTMLAttributes<HTMLImageElement> & { webp: string }) {
  return (
    <picture className="contents">
      <source type="image/webp" srcSet={webp} />
      <img {...img} />
    </picture>
  );
}
