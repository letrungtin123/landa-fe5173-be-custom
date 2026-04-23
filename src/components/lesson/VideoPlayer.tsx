// ============================================================
// VideoPlayer — Phát video từ Open edX
// Hỗ trợ: YouTube embed, MP4/WebM direct, HLS
// Tự động đánh dấu hoàn thành khi xem ≥90%
// ============================================================

import { useRef, useState, useCallback, useEffect } from "react";
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize,
  Loader2,
} from "lucide-react";
import type { LessonDetail } from "@/data/types";
import { markBlockComplete } from "@/api/progress";

interface VideoPlayerProps {
  lesson: LessonDetail;
}

/**
 * Kiểm tra URL có phải YouTube không và trích xuất video ID.
 */
function getYouTubeId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
    /^([a-zA-Z0-9_-]{11})$/, // ID trực tiếp
  ];
  for (const re of patterns) {
    const match = url.match(re);
    if (match) return match[1];
  }
  return null;
}

export function VideoPlayer({ lesson }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [hasMarkedComplete, setHasMarkedComplete] = useState(false);

  const videoUrl = lesson._videoUrl;
  const youtubeId = videoUrl ? getYouTubeId(videoUrl) : null;
  const isYoutube = !!youtubeId;
  // Nếu URL là xblock render URL từ LMS → dùng iframe embed
  const isXblockEmbed = videoUrl ? videoUrl.includes("/xblock/") : false;

  // Đánh dấu hoàn thành khi xem ≥90% (chỉ cho video trực tiếp)
  const checkCompletion = useCallback(() => {
    if (
      !hasMarkedComplete &&
      duration > 0 &&
      currentTime / duration >= 0.9 &&
      lesson.id
    ) {
      setHasMarkedComplete(true);
      markBlockComplete(lesson.id).catch(() => {
        // Bỏ qua lỗi — không ảnh hưởng trải nghiệm xem
      });
    }
  }, [currentTime, duration, hasMarkedComplete, lesson.id]);

  useEffect(() => {
    checkCompletion();
  }, [checkCompletion]);

  // Format thời gian mm:ss
  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  const togglePlay = () => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) {
      v.play();
      setIsPlaying(true);
    } else {
      v.pause();
      setIsPlaying(false);
    }
  };

  const toggleMute = () => {
    const v = videoRef.current;
    if (!v) return;
    v.muted = !v.muted;
    setIsMuted(v.muted);
  };

  const toggleFullscreen = () => {
    const el = containerRef.current;
    if (!el) return;
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      el.requestFullscreen();
    }
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    const v = videoRef.current;
    if (!v || !duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = (e.clientX - rect.left) / rect.width;
    v.currentTime = ratio * duration;
  };

  // ── Không có video URL → placeholder ──
  if (!videoUrl) {
    return (
      <div className="relative overflow-hidden rounded-2xl bg-[#0d1117] aspect-video shadow-lg">
        <div className="absolute inset-0 flex flex-col items-center justify-center text-white/80">
          <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-white/10 backdrop-blur-sm">
            <Play className="h-8 w-8 ml-1 text-white/60" />
          </div>
          <p className="text-sm text-white/50">{lesson.title}</p>
          <p className="mt-1 text-xs text-white/30">Video chưa được tải lên</p>
        </div>
      </div>
    );
  }

  // ── YouTube → dùng iframe embed ──
  if (isYoutube) {
    return (
      <div
        ref={containerRef}
        className="relative overflow-hidden rounded-2xl bg-[#0d1117] aspect-video shadow-lg"
      >
        <iframe
          src={`https://www.youtube.com/embed/${youtubeId}?rel=0&modestbranding=1&showinfo=0`}
          className="h-full w-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
          allowFullScreen
          title={lesson.title}
          onLoad={() => setIsLoading(false)}
        />
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50">
            <Loader2 className="h-10 w-10 animate-spin text-white/70" />
          </div>
        )}
      </div>
    );
  }

  // ── XBlock embed (LMS render fallback) — khi không có encoded_videos ──
  if (isXblockEmbed && videoUrl) {
    return (
      <div
        ref={containerRef}
        className="relative overflow-hidden rounded-2xl bg-[#0d1117] aspect-video shadow-lg"
      >
        <iframe
          src={videoUrl}
          className="h-full w-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
          allowFullScreen
          title={lesson.title}
          onLoad={() => setIsLoading(false)}
        />
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50">
            <Loader2 className="h-10 w-10 animate-spin text-white/70" />
          </div>
        )}
      </div>
    );
  }

  // ── Video trực tiếp (MP4/WebM/HLS) → dùng <video> ──
  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div
      ref={containerRef}
      className="relative overflow-hidden rounded-2xl bg-[#0d1117] aspect-video shadow-lg group"
    >
      <video
        ref={videoRef}
        src={videoUrl}
        className="h-full w-full object-contain"
        onLoadedMetadata={(e) => {
          setDuration(e.currentTarget.duration);
          setIsLoading(false);
        }}
        onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onWaiting={() => setIsLoading(true)}
        onCanPlay={() => setIsLoading(false)}
        onEnded={() => setIsPlaying(false)}
        playsInline
      />

      {/* Loading spinner */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/30">
          <Loader2 className="h-10 w-10 animate-spin text-white/70" />
        </div>
      )}

      {/* Nút play giữa màn hình */}
      {!isPlaying && !isLoading && (
        <button
          onClick={togglePlay}
          className="absolute inset-0 flex items-center justify-center bg-black/20 transition-opacity"
        >
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-white/15 backdrop-blur-sm transition-transform hover:scale-110">
            <Play className="h-8 w-8 ml-1 text-white" />
          </div>
        </button>
      )}

      {/* Thanh điều khiển */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-4 opacity-0 group-hover:opacity-100 transition-opacity">
        <div
          className="mb-3 h-1.5 w-full cursor-pointer rounded-full bg-white/20 overflow-hidden"
          onClick={handleSeek}
        >
          <div
            className="h-full rounded-full bg-primary transition-[width] duration-100"
            style={{ width: `${progress}%` }}
          />
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={togglePlay} className="text-white hover:text-white/80 transition-colors">
              {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
            </button>
            <button onClick={toggleMute} className="text-white hover:text-white/80 transition-colors">
              {isMuted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
            </button>
            <span className="text-xs text-white/70">
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>
          </div>
          <button onClick={toggleFullscreen} className="text-white hover:text-white/80 transition-colors">
            <Maximize className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
