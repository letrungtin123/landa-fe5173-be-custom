import { useEffect, useMemo, useState } from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowRight, CheckCircle2, Compass } from "lucide-react";
import {
  getWelcomeInitStateApi,
  markWelcomeInitSeenApi,
  type WelcomeInitState,
} from "@/api/welcomeInit";
import flowerImage from "@/assets/WelcomeInitModal/welcome_init_flower.png";
import folderImage from "@/assets/WelcomeInitModal/welcome_init_folder.png";
import linePlaneMobileImage from "@/assets/WelcomeInitModal/welcome_init_line_plan_mobile.png";
import linePlanePcImage from "@/assets/WelcomeInitModal/welcome_init_line_plan_pc.png";
import planeImage from "@/assets/WelcomeInitModal/welcome_init_plane.png";
import { useBranding } from "@/hooks/useBranding";
import { useAppStore } from "@/stores/useAppStore";
import { useAuthStore } from "@/stores/useAuthStore";

function storageGet(key: string): boolean {
  try {
    return sessionStorage.getItem(key) === "1";
  } catch {
    return false;
  }
}

function storageSet(key: string): void {
  try {
    sessionStorage.setItem(key, "1");
  } catch {
    // Ignore private browsing / storage-disabled cases.
  }
}

function getDisplayName(fullName?: string | null, username?: string | null): string {
  const normalized = fullName?.trim() || username?.trim();
  return normalized || "bạn";
}

export function WelcomeInitModal() {
  const queryClient = useQueryClient();
  const { branding } = useBranding();
  const setCourseModalActive = useAppStore((s) => s.setCourseModalActive);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const user = useAuthStore((s) => s.user);
  const loginSessionId = useAuthStore((s) => s.loginSessionId);

  const [open, setOpen] = useState(false);
  const [locallyDismissed, setLocallyDismissed] = useState(false);
  const [sessionDismissed, setSessionDismissed] = useState(false);

  const sessionKey = useMemo(() => {
    if (!user?.id) return "";
    return `welcome_init_demo_dismissed_${user.id}_${loginSessionId || "rehydrated"}`;
  }, [loginSessionId, user?.id]);

  const queryKey = useMemo(
    () => ["welcome-init-state", user?.id, loginSessionId || "rehydrated"],
    [loginSessionId, user?.id]
  );

  const { data: state } = useQuery({
    queryKey,
    queryFn: getWelcomeInitStateApi,
    enabled: isAuthenticated && !!user?.id,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
    retry: 1,
  });

  const { mutate: markSeen, isPending } = useMutation({
    mutationFn: markWelcomeInitSeenApi,
    onSuccess: (nextState: WelcomeInitState) => {
      queryClient.setQueryData(queryKey, nextState);
    },
  });

  useEffect(() => {
    setLocallyDismissed(false);
    setSessionDismissed(sessionKey ? storageGet(sessionKey) : false);
  }, [sessionKey]);

  useEffect(() => {
    setCourseModalActive(open);
    return () => setCourseModalActive(false);
  }, [open, setCourseModalActive]);

  useEffect(() => {
    if (!state || state.setup_required) {
      setOpen(false);
      return;
    }

    const blockedForSession = state.is_demo_account && sessionDismissed;
    setOpen(state.should_show && !blockedForSession && !locallyDismissed);
  }, [locallyDismissed, sessionDismissed, state]);

  const tenantName = branding.tenantName || user?.tenantName || "cổng học tập";
  const learnerName = getDisplayName(user?.fullName, user?.username);

  const handleContinue = () => {
    if (!state) {
      setOpen(false);
      return;
    }

    setLocallyDismissed(true);
    if (state.is_demo_account && sessionKey) {
      storageSet(sessionKey);
      setSessionDismissed(true);
    }

    markSeen(undefined, {
      onSettled: () => setOpen(false),
    });
  };

  return (
    <DialogPrimitive.Root open={open} onOpenChange={() => { }}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/35 backdrop-blur-[7px] data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 sm:bg-black/30" />
        <DialogPrimitive.Content
          className="fixed left-1/2 top-1/2 z-50 w-[calc(100vw-2.5rem)] max-w-[426px] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-[16px] border-0 bg-white p-0 shadow-[0_18px_42px_rgba(37,99,235,0.24)] outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 dark:bg-[#0f172a] dark:shadow-[0_18px_46px_rgba(2,6,23,0.66)] sm:w-[calc(100vw-4rem)] sm:max-w-[832px] sm:rounded-[30px] sm:border-[10px] sm:border-white sm:shadow-[0_24px_70px_rgba(15,23,42,0.28)] sm:dark:border-[#111827]"
          onInteractOutside={(e) => e.preventDefault()}
          onEscapeKeyDown={(e) => e.preventDefault()}
        >
          <DialogPrimitive.Title className="sr-only">
            Chào mừng bạn đến với {tenantName}
          </DialogPrimitive.Title>
          <DialogPrimitive.Description className="sr-only">
            Modal chào mừng xuất hiện trong lần đầu đăng nhập vào hệ thống học tập.
          </DialogPrimitive.Description>

          <div className="relative min-h-[526px] overflow-hidden rounded-[16px] bg-[linear-gradient(180deg,rgba(147,197,253,0.72)_0%,rgba(219,234,254,0.58)_48%,#ffffff_100%)] px-5 pb-10 pt-12 text-center text-[#213d6a] dark:bg-[linear-gradient(180deg,rgba(30,64,175,0.48)_0%,rgba(15,23,42,0.86)_52%,#0f172a_100%)] dark:text-slate-100 sm:min-h-[486px] sm:rounded-[21px] sm:px-12 sm:pb-12 sm:pt-10">
            <picture className="pointer-events-none absolute left-0 top-[118px] w-[75px] opacity-95 sm:left-0 sm:top-[148px] sm:w-[149px]">
              <source media="(min-width: 640px)" srcSet={linePlanePcImage} />
              <img src={linePlaneMobileImage} alt="" className="h-auto w-full" />
            </picture>
            <img
              src={planeImage}
              alt=""
              className="pointer-events-none absolute left-[46px] top-[86px] h-[54px] w-[54px] object-contain drop-shadow-[0_12px_18px_rgba(37,99,235,0.28)] sm:left-[108px] sm:top-[124px] sm:h-[62px] sm:w-[62px]"
            />
            <img
              src={flowerImage}
              alt=""
              className="pointer-events-none absolute right-[30px] top-[108px] h-[46px] w-[46px] object-contain drop-shadow-[0_10px_22px_rgba(37,99,235,0.28)] sm:right-[92px] sm:top-[92px] sm:h-[66px] sm:w-[66px]"
            />

            <div className="relative z-10 mx-auto flex max-w-[680px] flex-col items-center">
              <div className="flex h-[66px] w-[66px] items-center justify-center overflow-hidden rounded-full border border-white/80 bg-white shadow-[0_8px_20px_rgba(15,23,42,0.16)] sm:h-[58px] sm:w-[58px]">
                <img
                  src={branding.squareIcon}
                  alt={tenantName}
                  className="h-full w-full object-contain"
                />
              </div>

              <div className="mt-7 max-w-[250px] truncate rounded-full bg-[#35f0c3] px-4 py-2 text-[11px] font-semibold uppercase leading-none tracking-[0.12em] text-[#071f28] shadow-[0_8px_18px_rgba(20,184,166,0.18)] sm:mt-5 sm:max-w-[320px] sm:px-[15px] sm:py-[7px] sm:text-[10px]">
                Xin chào, {learnerName}
              </div>

              <h2 className="mt-8 max-w-none text-[29px] font-semibold leading-[1.18] tracking-normal text-[#213D6A] dark:text-slate-100 sm:mt-4 sm:max-w-[620px] sm:text-[43px] sm:leading-[1.22]">
                <span className="block whitespace-nowrap">Chào mừng bạn đã đến</span>
                <span className="block whitespace-nowrap">
                  với cổng học tập{" "}
                  <span className="inline-flex translate-y-[0.14em] items-center">
                    <img
                      src={folderImage}
                      alt=""
                      className="h-[35px] w-[44px] object-contain sm:h-[40px] sm:w-[51px]"
                    />
                  </span>{" "}
                  <span className="text-[#2563eb] dark:text-[#93c5fd]">{tenantName}!</span>
                </span>
              </h2>

              <p className="mt-4 max-w-[346px] text-center text-[15px] font-normal leading-[1.25] text-[#213D6A]/85 dark:text-slate-300 sm:mt-4 sm:max-w-[520px] sm:text-[14px] sm:leading-[1.18]">
                <span className="block sm:hidden">
                  Hãy dành một nhịp để sẵn sàng. Mọi thứ trong
                </span>
                <span className="block sm:hidden">
                  cổng học tập của {tenantName} đã được chuẩn bị để
                </span>
                <span className="block sm:hidden">
                  bạn bắt đầu thật mượt mà.
                </span>
                <span className="hidden sm:block">
                  Hãy dành một nhịp để sẵn sàng. Mọi thứ trong cổng học tập
                </span>
                <span className="hidden sm:block">
                  của {tenantName} đã được chuẩn bị để bạn bắt đầu thật mượt mà.
                </span>
              </p>

              <div className="mt-2 grid justify-items-center gap-[5px] text-[13px] font-normal text-[#213D6A]/85 dark:text-slate-300 sm:mt-[10px] sm:gap-[5px] sm:text-[13px]">
                <div className="inline-flex items-center justify-center gap-2">
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-[#2563eb] dark:text-[#93c5fd] sm:h-4 sm:w-4" />
                  <span>Không gian học tập đã sẵn sàng cho bạn</span>
                </div>
                <div className="inline-flex items-center justify-center gap-2">
                  <Compass className="h-4 w-4 shrink-0 text-[#2563eb] dark:text-[#93c5fd] sm:h-4 sm:w-4" />
                  <span>Hành trình hôm nay bắt đầu từ đây</span>
                </div>
              </div>

              <button
                type="button"
                onClick={handleContinue}
                disabled={isPending}
                className="mt-2 inline-flex h-12 min-w-[230px] items-center justify-center gap-3 rounded-full bg-[#2563eb] px-7 text-[16px] font-semibold text-white shadow-[0_12px_26px_rgba(37,99,235,0.28)] outline-none transition hover:-translate-y-0.5 hover:bg-[#1d4ed8] focus-visible:ring-2 focus-visible:ring-[#2563eb] focus-visible:ring-offset-2 focus-visible:ring-offset-white disabled:pointer-events-none disabled:opacity-70 dark:bg-[#3b82f6] dark:shadow-[0_12px_28px_rgba(59,130,246,0.24)] dark:hover:bg-[#60a5fa] dark:focus-visible:ring-[#93c5fd] dark:focus-visible:ring-offset-[#0f172a] sm:mt-3 sm:h-10 sm:min-w-[192px] sm:gap-3 sm:px-6 sm:text-[15px]"
              >
                {isPending ? "Đang bắt đầu..." : "Bắt đầu học ngay"}
                <ArrowRight className="h-5 w-5 sm:h-5 sm:w-5" />
              </button>
            </div>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
