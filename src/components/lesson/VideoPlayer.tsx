import { Play, Volume2, Settings, Maximize2, Pause } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { useThemeStore } from "@/stores/useThemeStore";
import { mockLessons } from "@/data/mock";
import { useAppStore } from "@/stores/useAppStore";
import logoImg from "@/assets/leandassociate.webp";

export function VideoPlayer() {
  const [isPlaying, setIsPlaying] = useState(false);
  const { colorStyle } = useThemeStore();
  const currentLessonId = useAppStore((s) => s.currentLessonId);
  const lesson = mockLessons[currentLessonId] || mockLessons["l-m2-1"];

  // Calculate progress percentage
  const [currentMin, currentSec] = lesson.videoCurrentTime
    .split(":")
    .map(Number);
  const [totalMin, totalSec] = lesson.videoDuration.split(":").map(Number);
  const currentSeconds = currentMin * 60 + currentSec;
  const totalSeconds = totalMin * 60 + totalSec;
  const progressPercent = (currentSeconds / totalSeconds) * 100;

  return (
    <div className="relative aspect-video w-full overflow-hidden rounded-xl bg-foreground/5 border border-border">
      {/* Video Content Placeholder */}
      <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-primary/90 to-primary">
        {/* Video Title Overlay */}
        <div className="absolute top-4 left-4 flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center rounded bg-destructive">
            <Play className="h-3 w-3 text-white fill-white" />
          </div>
          <span className="text-sm font-semibold text-white">
            {lesson.title}
          </span>
        </div>

        {/* Logo watermark */}
        <img
          src={logoImg}
          alt=""
          className="absolute top-4 right-4 h-8 opacity-70 brightness-0 invert"
        />

        {/* Organization chart placeholder */}
        <div className="flex flex-col items-center gap-3 opacity-30">
          <div className="grid grid-cols-3 gap-2">
            {["BOD", "SRD", "CEO"].map((label) => (
              <div
                key={label}
                className="rounded border border-white/40 px-4 py-2 text-xs text-white/80"
              >
                {label}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-5 gap-1.5">
            {[
              "HR",
              "MARKETING",
              "TECH",
              "LEGAL",
              "FINANCE",
            ].map((label) => (
              <div
                key={label}
                className="rounded border border-white/30 px-2 py-1 text-[10px] text-white/60"
              >
                {label}
              </div>
            ))}
          </div>
        </div>

        {/* Center Play Button */}
        <button
          onClick={() => setIsPlaying(!isPlaying)}
          className={cn(
            "absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2",
            "flex h-16 w-16 items-center justify-center rounded-full",
            "transition-transform hover:scale-110 active:scale-95",
            "shadow-xl",
            colorStyle === "gradient"
              ? "accent-surface-gradient"
              : "bg-accent"
          )}
        >
          {isPlaying ? (
            <Pause className="h-7 w-7 text-white fill-white" />
          ) : (
            <Play className="ml-1 h-7 w-7 text-white fill-white" />
          )}
        </button>
      </div>

      {/* Controls Bar */}
      <div className="absolute inset-x-0 bottom-0 flex items-center gap-3 bg-gradient-to-t from-black/80 to-transparent px-4 pb-3 pt-8">
        {/* Play/Pause */}
        <button
          onClick={() => setIsPlaying(!isPlaying)}
          className="text-white transition-transform hover:scale-110"
        >
          {isPlaying ? (
            <Pause className="h-4 w-4" />
          ) : (
            <Play className="h-4 w-4 fill-white" />
          )}
        </button>

        {/* Volume */}
        <button className="text-white/80 transition-colors hover:text-white">
          <Volume2 className="h-4 w-4" />
        </button>

        {/* Progress Bar */}
        <div className="flex-1">
          <div className="relative h-1 w-full rounded-full bg-white/30">
            <div
              className="absolute inset-y-0 left-0 rounded-full bg-accent"
              style={{ width: `${progressPercent}%` }}
            />
            <div
              className="absolute top-1/2 -translate-y-1/2 h-3 w-3 rounded-full bg-white shadow-md"
              style={{ left: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* Timestamp */}
        <span className="text-xs font-mono text-white/80">
          {lesson.videoCurrentTime} / {lesson.videoDuration}
        </span>

        {/* Settings */}
        <button className="text-white/80 transition-colors hover:text-white">
          <Settings className="h-4 w-4" />
        </button>

        {/* Fullscreen */}
        <button className="text-white/80 transition-colors hover:text-white">
          <Maximize2 className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
