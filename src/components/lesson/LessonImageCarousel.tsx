import React, { useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface LessonImageCarouselProps {
  images: { src: string; alt: string }[];
  onImageClick?: (src: string) => void;
}

export function LessonImageCarousel({ images, onImageClick }: LessonImageCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const swipeRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
  } | null>(null);
  const ignoreClickRef = useRef(false);
  const imageCount = images?.length ?? 0;

  useEffect(() => {
    if (imageCount === 0) {
      setCurrentIndex(0);
      return;
    }
    setCurrentIndex((i) => Math.min(i, imageCount - 1));
  }, [imageCount]);

  if (!images || imageCount === 0) return null;

  const goNext = () => {
    setCurrentIndex((i) => (i + 1) % images.length);
  };

  const goPrev = () => {
    setCurrentIndex((i) => (i - 1 + images.length) % images.length);
  };

  const next = (e: React.MouseEvent) => {
    e.stopPropagation();
    goNext();
  };

  const prev = (e: React.MouseEvent) => {
    e.stopPropagation();
    goPrev();
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (images.length <= 1 || !e.isPrimary || e.button !== 0) return;
    if ((e.target as HTMLElement).closest('button')) return;
    swipeRef.current = {
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
    };
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // Pointer capture is best-effort on older mobile webviews.
    }
  };

  const handlePointerEnd = (e: React.PointerEvent<HTMLDivElement>) => {
    const swipe = swipeRef.current;
    if (!swipe || swipe.pointerId !== e.pointerId) return;

    swipeRef.current = null;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      // No-op if the pointer was already released by the browser.
    }

    const deltaX = e.clientX - swipe.startX;
    const deltaY = e.clientY - swipe.startY;
    const absX = Math.abs(deltaX);
    const absY = Math.abs(deltaY);
    const isHorizontalSwipe = absX >= 45 && absX > absY * 1.2;
    if (!isHorizontalSwipe) return;

    ignoreClickRef.current = true;
    if (deltaX < 0) goNext();
    else goPrev();
    window.setTimeout(() => {
      ignoreClickRef.current = false;
    }, 0);
  };

  const handlePointerCancel = (e: React.PointerEvent<HTMLDivElement>) => {
    if (swipeRef.current?.pointerId === e.pointerId) {
      swipeRef.current = null;
    }
  };

  const handleCarouselClick = () => {
    if (ignoreClickRef.current) return;
    onImageClick?.(images[currentIndex].src);
  };

  return (
    <div
      className="relative w-full h-[350px] md:h-[450px] 2xl:h-[550px] group overflow-hidden cursor-zoom-in flex items-center touch-pan-y select-none"
      onClick={handleCarouselClick}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerEnd}
      onPointerCancel={handlePointerCancel}
    >
      <img
        src={images[currentIndex].src}
        alt={images[currentIndex].alt || `Image ${currentIndex + 1}`}
        className="w-full max-h-full object-contain transition-opacity duration-300"
        draggable={false}
      />

      {/* Nút điều hướng */}
      {images.length > 1 && (
        <>
          <button
            onClick={prev}
            className="absolute left-3 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/40 text-white hover:bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity"
            aria-label="Previous image"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          <button
            onClick={next}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/40 text-white hover:bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity"
            aria-label="Next image"
          >
            <ChevronRight className="w-6 h-6" />
          </button>
        </>
      )}

      {/* Dấu chấm chỉ báo — overlay trên ảnh */}
      {images.length > 1 && (
        <div className="absolute bottom-0 left-0 right-0 flex justify-center gap-2 pb-3 pt-6 bg-gradient-to-t from-black/30 to-transparent">
          {images.map((_, idx) => (
            <button
              key={idx}
              onClick={(e) => {
                e.stopPropagation();
                setCurrentIndex(idx);
              }}
              className={`w-2 h-2 rounded-full transition-colors ${
                idx === currentIndex ? 'bg-white' : 'bg-white/40 hover:bg-white/70'
              }`}
              aria-label={`Go to slide ${idx + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
