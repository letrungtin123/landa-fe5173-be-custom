import { storageUrl } from "@/utils/storageUrl";

interface LessonUploadedVideoProps {
  storagePath?: string | null;
  src?: string | null;
  className?: string;
  videoClassName?: string;
  title?: string;
}

export function LessonUploadedVideo({
  storagePath,
  src,
  className = "relative overflow-hidden rounded-2xl bg-[#0d1117] aspect-video shadow-lg",
  videoClassName = "h-full w-full object-contain",
  title = "Uploaded video",
}: LessonUploadedVideoProps) {
  const videoSrc = src || (storagePath ? storageUrl(storagePath) : "");
  if (!videoSrc) return null;

  return (
    <div className={className} onClick={(event) => event.stopPropagation()} onPointerDown={(event) => event.stopPropagation()}>
      <video
        key={storagePath || videoSrc}
        src={videoSrc}
        controls
        className={videoClassName}
        preload="metadata"
        playsInline
        title={title}
      />
    </div>
  );
}