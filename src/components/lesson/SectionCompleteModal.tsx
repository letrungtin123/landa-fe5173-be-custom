import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getSectionModalConfigs, getSectionModalShown, markSectionModalShown } from "@/api/sectionModalConfig";
import type { Module } from "@/data/types";
import { useAppStore } from "@/stores/useAppStore";
import flyElementUrl from "@/assets/EncourageModal/Fly_element.png";
import flyElementMobileUrl from "@/assets/EncourageModal/fly-element-mobile.png";
import letterUrl from "@/assets/EncourageModal/letter.png";
import letterElementMobileUrl from "@/assets/EncourageModal/letter-element-mobile.png";
import lightEffectUrl from "@/assets/EncourageModal/light-effect.png";

const CONFETTI_COLORS = ["#fbbf24", "#f59e0b", "#ef4444", "#ec4899", "#8b5cf6", "#3b82f6", "#10b981", "#f97316"];
const ENCOURAGE_TITLE = "Xuất sắc quá! Bạn đã chinh phục thành công phần này!";
const ENCOURAGE_DESCRIPTION =
  "Mỗi bước đi nhỏ đều đang đưa bạn đến gần hơn với mục tiêu lớn. Bạn đã làm rất tốt, hãy giữ vững năng lượng tích cực này để tiếp tục tiến lên nhé!";

const Confetti = () => {
  const particles = useMemo(() => {
    return Array.from({ length: 60 }, (_, i) => ({
      id: i,
      color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
      x: Math.random() * 100,
      delay: Math.random() * 2,
      duration: 3 + Math.random() * 3,
      size: 5 + Math.random() * 5,
      rotateEnd: 360 + Math.random() * 360,
      xOffset: (Math.random() - 0.5) * 80,
    }));
  }, []);

  return (
    <div className="pointer-events-none absolute inset-0 z-50 overflow-hidden">
      <style>
        {particles
          .map(
            (p) => `
          @keyframes section-confetti-${p.id} {
            0% { transform: translate3d(0, -24px, 0) rotate(0deg); }
            100% { transform: translate3d(${p.xOffset}px, 100vh, 0) rotate(${p.rotateEnd}deg); }
          }
        `
          )
          .join("")}
      </style>
      {particles.map((p) => (
        <div
          key={p.id}
          className="absolute rounded-sm shadow-sm"
          style={{
            left: `${p.x}%`,
            top: 0,
            width: p.size,
            height: p.size * 0.5,
            backgroundColor: p.color,
            animation: `section-confetti-${p.id} ${p.duration}s linear ${p.delay}s infinite`,
          }}
        />
      ))}
    </div>
  );
};

interface SectionCompleteModalProps {
  courseId: string;
  modules: Module[];
}

export function SectionCompleteModal({ courseId, modules }: SectionCompleteModalProps) {
  const [open, setOpen] = useState(false);
  const [currentConfig, setCurrentConfig] = useState<{ section_id: string; title: string; description: string } | null>(null);
  const queryClient = useQueryClient();
  const setCourseModalActive = useAppStore((s) => s.setCourseModalActive);

  useEffect(() => {
    setCourseModalActive(open);
    return () => setCourseModalActive(false);
  }, [open, setCourseModalActive]);

  const { data: configs } = useQuery({
    queryKey: ["sectionModalConfigs", courseId],
    queryFn: () => getSectionModalConfigs(courseId),
    enabled: !!courseId,
    staleTime: 5 * 60 * 1000,
  });

  const { data: shownData } = useQuery({
    queryKey: ["sectionModalShown", courseId],
    queryFn: () => getSectionModalShown(courseId),
    enabled: !!courseId,
    staleTime: 2 * 60 * 1000,
  });

  const { mutate: markShown } = useMutation({
    mutationFn: (sectionId: string) => markSectionModalShown(courseId, sectionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sectionModalShown", courseId] });
    },
  });

  useEffect(() => {
    if (!configs || configs.length === 0 || !shownData || !modules || modules.length === 0) return;

    const shownSet = new Set(shownData.shown_sections);
    const configMap = new Map(configs.map((config) => [config.section_id, config]));

    for (const mod of modules) {
      if (mod.completed && configMap.has(mod.id) && !shownSet.has(mod.id)) {
        const cfg = configMap.get(mod.id)!;
        setCurrentConfig(cfg);
        setOpen(true);
        return;
      }
    }
  }, [configs, shownData, modules]);

  const handleDismiss = () => {
    if (currentConfig) {
      markShown(currentConfig.section_id);
    }
    setOpen(false);
    setCurrentConfig(null);
  };

  if (!currentConfig) return null;

  const title = currentConfig.title || ENCOURAGE_TITLE;
  const description = currentConfig.description || ENCOURAGE_DESCRIPTION;

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => { if (!nextOpen) handleDismiss(); }}>
      <DialogContent
        className="z-[10000] w-auto max-w-none overflow-visible border-none bg-transparent p-0 shadow-none outline-none [&>button]:hidden"
        style={{ zIndex: 10000 }}
      >
        <DialogTitle className="sr-only">{title}</DialogTitle>
        <DialogDescription className="sr-only">{description}</DialogDescription>
        <style>
          {`
            .section-complete-encourage-card {
              width: min(670px, calc(100vw - 64px));
              height: min(510px, calc(100vh - 64px));
            }

            .section-complete-letter {
              width: 474px;
            }

            .section-complete-letter-mobile {
              display: none;
            }

            .section-complete-fly-element {
              inset: 66px;
              width: calc(100% - 132px);
              height: calc(100% - 132px);
              object-fit: cover;
            }

            .section-complete-fly-element-mobile {
              display: none;
            }

            .section-complete-copy {
              top: 188px;
              width: 370px;
            }

            .section-complete-title {
              color: #0062DF;
              font-size: 24px;
              line-height: 26px;
              font-weight: 800;
            }

            .section-complete-description {
              color: #0062DF;
              margin-top: 10px;
              max-width: 365px;
              font-size: 14px;
              line-height: 17px;
              font-weight: 500;
            }

            .section-complete-action {
              bottom: 32px;
              width: 112px;
              height: 42px;
              font-size: 18px;
              font-weight: 600;
            }

            @media (max-width: 767px) {
              .section-complete-encourage-card {
                width: min(363px, calc(100vw - 32px));
                height: min(410px, calc(100vh - 32px));
              }

              .section-complete-letter {
                display: none;
              }

              .section-complete-letter-mobile {
                display: block;
                width: 306px;
              }

              .section-complete-fly-element {
                display: none;
              }

              .section-complete-fly-element-mobile {
                display: block;
                left: 50%;
                top: 50%;
                width: 394.5px;
                height: 290.75px;
                transform: translate(-50%, -50%);
                object-fit: contain;
              }

              .section-complete-copy {
                top: 158px;
                width: 236px;
              }

              .section-complete-title {
                font-size: 18px;
                line-height: 20px;
              }

              .section-complete-description {
                margin-top: 7px;
                max-width: 212px;
                font-size: 9px;
                line-height: 10px;
              }

            .section-complete-action {
              bottom: 22px;
              width: 108px;
              height: 38px;
              font-size: 15px;
              font-weight: 600;
              white-space: nowrap;
            }
            }
          `}
        </style>

        <div
          className="section-complete-encourage-card relative isolate overflow-hidden rounded-[18px] shadow-2xl md:rounded-[28px]"
          style={{
            background:
              "radial-gradient(circle at 50% 39%, #0A74FF 0%, #005FE8 50%, #0034C3 100%), #005FE8",
          }}
        >
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_39%,#0A74FF_0%,#005FE8_50%,#0034C3_100%)]" />
          <img
            src={lightEffectUrl}
            alt=""
            aria-hidden="true"
            className="absolute left-1/2 top-1/2 z-[1] h-[125%] w-[125%] -translate-x-1/2 -translate-y-1/2 object-cover opacity-35 mix-blend-screen [filter:hue-rotate(155deg)_saturate(170%)_brightness(0.8)] md:h-[118%] md:w-[118%]"
          />
          <div
            className="absolute inset-0 z-[2] opacity-45"
            style={{
              background:
                "conic-gradient(from 200deg at 50% 46%, rgba(255,255,255,0.04) 0deg, rgba(255,255,255,0.18) 22deg, rgba(0,36,158,0.18) 42deg, rgba(255,255,255,0.12) 68deg, rgba(0,33,144,0.22) 94deg, rgba(255,255,255,0.13) 128deg, rgba(0,42,155,0.24) 166deg, rgba(255,255,255,0.11) 205deg, rgba(0,35,139,0.18) 252deg, rgba(255,255,255,0.12) 300deg, rgba(0,33,142,0.22) 340deg, rgba(255,255,255,0.04) 360deg)",
            }}
          />

          <img
            src={letterUrl}
            alt=""
            aria-hidden="true"
            className="section-complete-letter pointer-events-none absolute bottom-0 left-1/2 z-20 -translate-x-1/2 select-none"
            loading="eager"
            draggable={false}
          />
          <img
            src={letterElementMobileUrl}
            alt=""
            aria-hidden="true"
            className="section-complete-letter-mobile pointer-events-none absolute bottom-0 left-1/2 z-20 -translate-x-1/2 select-none"
            loading="eager"
            draggable={false}
          />
          <img
            src={flyElementUrl}
            alt=""
            aria-hidden="true"
            className="section-complete-fly-element pointer-events-none absolute z-30 select-none object-cover"
            loading="eager"
            draggable={false}
          />
          <img
            src={flyElementMobileUrl}
            alt=""
            aria-hidden="true"
            className="section-complete-fly-element-mobile pointer-events-none absolute z-30 select-none"
            loading="eager"
            draggable={false}
          />

          <div className="section-complete-copy absolute left-1/2 z-40 -translate-x-1/2 text-center">
            <h1 className="section-complete-title tracking-normal text-[#0062DF]" style={{ color: "#0062DF" }}>
              {title}
            </h1>
            <p className="section-complete-description mx-auto tracking-normal text-[#0062DF]" style={{ color: "#0062DF" }}>
              {description}
            </p>
          </div>

          <button
            type="button"
            onClick={handleDismiss}
            className="section-complete-action absolute left-1/2 z-50 flex -translate-x-1/2 items-center justify-center rounded-full bg-[#0062DF] px-5 font-semibold leading-none tracking-normal text-white shadow-[0_10px_24px_rgba(0,52,195,0.28)] transition hover:bg-[#0054C8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/90 focus-visible:ring-offset-2 focus-visible:ring-offset-[#005FE8]"
            style={{ backgroundColor: "#0062DF", fontWeight: 600 }}
          >
            Tiếp tục
          </button>

          <Confetti />
        </div>
      </DialogContent>
    </Dialog>
  );
}
