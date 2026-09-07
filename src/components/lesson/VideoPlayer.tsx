// ============================================================
// VideoPlayer — Phát video từ Open edX
// Hỗ trợ: YouTube embed, MP4/WebM direct, HLS
// Tự động đánh dấu hoàn thành khi xem ≥90%
// ============================================================

import {
  useRef,
  useState,
  useCallback,
  useEffect,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import type { LessonDetail } from "@/data/types";
import { useMarkComplete } from "@/hooks/useProgress";
import { useAuthStore } from "@/stores/useAuthStore";
import { useParams } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";

interface VideoPlayerProps {
  lesson: LessonDetail;
  videoUrl?: string | null;
  demoGuideActive?: boolean;
  onDemoGuidePlay?: () => void;
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

export function VideoPlayer({
  lesson,
  videoUrl: propVideoUrl,
  demoGuideActive = false,
  onDemoGuidePlay,
}: VideoPlayerProps) {
  const { t } = useTranslation();
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isSeeking, setIsSeeking] = useState(false);
  const hasMarkedComplete = useRef(false);

  const { courseId } = useParams();
  const user = useAuthStore((s) => s.user);
  const { mutate: markComplete } = useMarkComplete();

  const videoUrl = propVideoUrl || lesson._videoUrl;
  const youtubeId = videoUrl ? getYouTubeId(videoUrl) : null;
  const isYoutube = !!youtubeId;
  // Nếu URL là xblock render URL từ LMS → dùng iframe embed
  const isXblockEmbed = videoUrl ? videoUrl.includes("/xblock/") : false;

  const checkCompletion = useCallback(() => {
    if (
      !hasMarkedComplete.current &&
      duration > 0 &&
      currentTime / duration >= 0.9 &&
      lesson.id &&
      courseId &&
      user?.username
    ) {
      hasMarkedComplete.current = true;
      markComplete({ courseId, usageKey: lesson.id }, {
        onError: () => {
          // Bỏ qua lỗi — không ảnh hưởng trải nghiệm xem
        }
      });
    }
  }, [currentTime, duration, lesson.id, courseId, user]);

  useEffect(() => {
    checkCompletion();
  }, [checkCompletion]);

  // Format thời gian mm:ss
  const formatTime = (s: number) => {
    const safeSeconds = Number.isFinite(s) && s > 0 ? s : 0;
    const m = Math.floor(safeSeconds / 60);
    const sec = Math.floor(safeSeconds % 60);
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  const togglePlay = () => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) {
      void v.play();
      setIsPlaying(true);
      if (demoGuideActive) {
        onDemoGuidePlay?.();
      }
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

  const seekToTime = useCallback((nextTime: number) => {
    const v = videoRef.current;
    if (!v || !Number.isFinite(duration) || duration <= 0) return;
    const clampedTime = Math.min(duration, Math.max(0, nextTime));
    v.currentTime = clampedTime;
    setCurrentTime(clampedTime);
  }, [duration]);

  const seekToClientX = useCallback((clientX: number) => {
    const track = progressRef.current;
    if (!track || !Number.isFinite(duration) || duration <= 0) return;
    const rect = track.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
    seekToTime(ratio * duration);
  }, [duration, seekToTime]);

  const handleSeekPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (e.button !== 0 || !Number.isFinite(duration) || duration <= 0) return;
    e.preventDefault();
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    setIsSeeking(true);
    seekToClientX(e.clientX);
  };

  const handleSeekPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!isSeeking) return;
    e.preventDefault();
    seekToClientX(e.clientX);
  };

  const endSeek = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!isSeeking) return;
    e.preventDefault();
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
    seekToClientX(e.clientX);
    setIsSeeking(false);
  };

  const handleSeekKeyDown = (e: ReactKeyboardEvent<HTMLDivElement>) => {
    if (!Number.isFinite(duration) || duration <= 0) return;

    const baseTime = videoRef.current?.currentTime ?? currentTime;
    let nextTime: number | null = null;

    if (e.key === "ArrowLeft") nextTime = baseTime - 5;
    if (e.key === "ArrowRight") nextTime = baseTime + 5;
    if (e.key === "Home") nextTime = 0;
    if (e.key === "End") nextTime = duration;

    if (nextTime === null) return;
    e.preventDefault();
    seekToTime(nextTime);
  };

  const handleSurfaceClick = () => {
    togglePlay();
  };

  const handleOverlayPlayClick = (e: ReactMouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    togglePlay();
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
          <p className="mt-1 text-xs text-white/30">{t("lesson.videoNotUploaded")}</p>
        </div>
      </div>
    );
  }

  // ── YouTube → dùng iframe embed ──
  if (isYoutube) {
    return (
      <div
        ref={containerRef}
        onPointerDownCapture={demoGuideActive ? onDemoGuidePlay : undefined}
        className="relative overflow-hidden rounded-2xl bg-[#0d1117] aspect-video shadow-lg"
      >
        {isLoading && (
          <Skeleton className="absolute inset-0 z-10" />
        )}
        <iframe
          src={`https://www.youtube.com/embed/${youtubeId}?rel=0&modestbranding=1&showinfo=0`}
          className={cn("h-full w-full", isLoading ? "invisible" : "")}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
          allowFullScreen
          title={lesson.title}
          onLoad={() => setIsLoading(false)}
        />
      </div>
    );
  }

  // ── XBlock embed (LMS render fallback) — khi không có encoded_videos ──
  if (isXblockEmbed && videoUrl) {
    return (
      <div
        ref={containerRef}
        onPointerDownCapture={demoGuideActive ? onDemoGuidePlay : undefined}
        className="relative overflow-hidden rounded-2xl bg-[#0d1117] aspect-video shadow-lg"
      >
        {isLoading && (
          <Skeleton className="absolute inset-0 z-10" />
        )}
        <iframe
          src={videoUrl}
          className={cn("h-full w-full", isLoading ? "invisible" : "")}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
          allowFullScreen
          title={lesson.title}
          onLoad={() => setIsLoading(false)}
        />
      </div>
    );
  }

  // ── Video trực tiếp (MP4/WebM/HLS) → dùng <video> ──
  const canSeek = Number.isFinite(duration) && duration > 0;
  const progress = canSeek ? Math.min(100, Math.max(0, (currentTime / duration) * 100)) : 0;

  return (
    <div
      ref={containerRef}
      className="relative overflow-hidden rounded-2xl bg-[#0d1117] aspect-video shadow-lg group"
      onClick={handleSurfaceClick}
    >
      <video
        ref={videoRef}
        src={videoUrl}
        className={cn("h-full w-full object-contain", isLoading ? "invisible" : "")}
        onLoadedMetadata={(e) => {
          setDuration(Number.isFinite(e.currentTarget.duration) ? e.currentTarget.duration : 0);
          setIsLoading(false);
        }}
        onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onWaiting={() => setIsLoading(true)}
        onCanPlay={() => setIsLoading(false)}
        onEnded={() => setIsPlaying(false)}
        preload="metadata"
        playsInline
      />

      {/* Loading spinner */}
      {isLoading && (
        <Skeleton className="absolute inset-0 z-10" />
      )}

      {/* Nút play giữa màn hình */}
      {!isPlaying && !isLoading && (
        <button
          type="button"
          onClick={handleOverlayPlayClick}
          className="absolute inset-0 z-20 flex items-center justify-center bg-black/20 transition-opacity"
          aria-label="Play video"
        >
          <div
            className={cn(
              "flex h-20 w-20 items-center justify-center rounded-full backdrop-blur-sm transition-transform hover:scale-110",
              demoGuideActive
                ? "demo-iframe-hero-cta-guide relative text-[#075985]"
                : "bg-white/15"
            )}
          >
            {demoGuideActive && <span className="demo-iframe-hero-cta-echo" aria-hidden="true" />}
            <Play className={cn("relative z-10 h-8 w-8 ml-1", demoGuideActive ? "text-[#075985]" : "text-white")} />
          </div>
        </button>
      )}

      {/* Thanh điều khiển */}
      <div
        onClick={(e) => e.stopPropagation()}
        className={cn(
          "absolute bottom-0 left-0 right-0 z-30 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-4 transition-opacity",
          !isPlaying || isSeeking
            ? "opacity-100"
            : "opacity-100 md:opacity-0 md:group-hover:opacity-100 md:focus-within:opacity-100"
        )}
      >
        <div
          ref={progressRef}
          role="slider"
          tabIndex={0}
          aria-label="Video progress"
          aria-valuemin={0}
          aria-valuemax={Math.floor(duration || 0)}
          aria-valuenow={Math.floor(currentTime || 0)}
          aria-valuetext={`${formatTime(currentTime)} / ${formatTime(duration)}`}
          className={cn(
            "relative mb-3 h-5 w-full touch-none rounded-full outline-none",
            canSeek ? "cursor-pointer" : "cursor-not-allowed opacity-60"
          )}
          onPointerDown={handleSeekPointerDown}
          onPointerMove={handleSeekPointerMove}
          onPointerUp={endSeek}
          onPointerCancel={endSeek}
          onKeyDown={handleSeekKeyDown}
        >
          <div
            className="absolute left-0 right-0 top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-white/20"
            aria-hidden="true"
          />
          <div
            className={cn(
              "absolute left-0 top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-primary",
              isSeeking ? "" : "transition-[width] duration-100"
            )}
            style={{ width: `${progress}%` }}
            aria-hidden="true"
          />
          <div
            className={cn(
              "absolute top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-primary shadow-lg shadow-black/30 transition-transform",
              canSeek ? "scale-100" : "scale-0",
              isSeeking ? "scale-125" : "group-hover:scale-125"
            )}
            style={{ left: `${progress}%` }}
            aria-hidden="true"
          />
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button type="button" onClick={togglePlay} className="text-white hover:text-white/80 transition-colors" aria-label={isPlaying ? "Pause video" : "Play video"}>
              {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
            </button>
            <button type="button" onClick={toggleMute} className="text-white hover:text-white/80 transition-colors" aria-label={isMuted ? "Unmute video" : "Mute video"}>
              {isMuted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
            </button>
            <span className="text-xs text-white/70">
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>
          </div>
          <button type="button" onClick={toggleFullscreen} className="text-white hover:text-white/80 transition-colors" aria-label="Fullscreen">
            <Maximize className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
