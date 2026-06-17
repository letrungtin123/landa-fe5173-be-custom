import React, { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface LessonImageCarouselProps {
  images: { src: string; alt: string }[];
  onImageClick?: (src: string) => void;
}

export function LessonImageCarousel({ images, onImageClick }: LessonImageCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);

  if (!images || images.length === 0) return null;

  const next = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentIndex((i) => (i + 1) % images.length);
  };

  const prev = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentIndex((i) => (i - 1 + images.length) % images.length);
  };

  return (
    <div
      className="relative w-full h-[350px] md:h-[450px] 2xl:h-[550px] group overflow-hidden cursor-zoom-in flex items-center"
      onClick={() => onImageClick?.(images[currentIndex].src)}
    >
      <img
        src={images[currentIndex].src}
        alt={images[currentIndex].alt || `Image ${currentIndex + 1}`}
        className="w-full max-h-full object-contain transition-opacity duration-300"
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
