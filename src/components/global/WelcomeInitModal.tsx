import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowRight, CheckCircle2, Compass, Sparkles } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  getWelcomeInitStateApi,
  markWelcomeInitSeenApi,
  type WelcomeInitState,
} from "@/api/welcomeInit";
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

  const tenantName = branding.tenantName || user?.tenantName || "tổ chức của bạn";
  const displayName = user?.fullName?.trim() || user?.username || "bạn";
  const firstName = displayName.split(/\s+/).slice(-1)[0] || displayName;

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
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent
        className="w-[calc(100vw-1.5rem)] max-w-[940px] max-h-[calc(100vh-1.5rem)] overflow-hidden border-border bg-card p-0 text-card-foreground shadow-2xl [&>button]:hidden sm:rounded-2xl"
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogTitle className="sr-only">Chào mừng bạn đến với {tenantName}</DialogTitle>
        <DialogDescription className="sr-only">
          Modal chào mừng xuất hiện trong lần đầu đăng nhập vào hệ thống học tập.
        </DialogDescription>

        <div className="relative max-h-[calc(100vh-1.5rem)] overflow-y-auto">
          <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(135deg,hsl(var(--primary)/0.14),transparent_34%,hsl(var(--accent)/0.16))]" />
          <div className="pointer-events-none absolute inset-0 opacity-[0.42] bg-[linear-gradient(to_right,hsl(var(--border)/0.55)_1px,transparent_1px),linear-gradient(to_bottom,hsl(var(--border)/0.55)_1px,transparent_1px)] bg-[size:28px_28px]" />

          <div className="relative grid md:min-h-[560px] md:grid-cols-[0.92fr_1.08fr]">
            <div className="flex flex-col justify-between border-b border-border bg-muted/40 p-6 sm:p-8 md:border-b-0 md:border-r">
              <div>
                <img
                  src={branding.squareIcon}
                  alt={tenantName}
                  className="h-20 w-20 object-contain sm:h-24 sm:w-24"
                />
                <div className="mt-8 inline-flex items-center gap-2 rounded-full border border-border bg-background/70 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  <Sparkles className="h-3.5 w-3.5 text-primary" />
                  Khởi đầu mới
                </div>
                <h2 className="mt-5 max-w-[420px] text-3xl font-semibold leading-tight tracking-normal text-foreground sm:text-4xl md:text-5xl">
                  Chào mừng bạn đến với {tenantName}
                </h2>
              </div>

              <div className="mt-8 grid gap-3 text-sm text-muted-foreground">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="h-5 w-5 text-primary" />
                  <span>Không gian học tập đã sẵn sàng cho bạn.</span>
                </div>
                <div className="flex items-center gap-3">
                  <Compass className="h-5 w-5 text-primary" />
                  <span>Hành trình hôm nay bắt đầu từ đây.</span>
                </div>
              </div>
            </div>

            <div className="flex flex-col justify-between p-6 sm:p-8 md:p-10">
              <div>
                <div className="inline-flex rounded-full border border-primary/25 bg-primary/10 px-3 py-1 text-sm font-medium text-primary">
                  Xin chào, {firstName}
                </div>
                <h3 className="mt-6 text-3xl font-semibold leading-tight text-foreground sm:text-4xl">
                  Rất vui được gặp bạn trong hành trình học tập mới.
                </h3>
                <p className="mt-5 max-w-[520px] text-base leading-7 text-muted-foreground">
                  Hãy dành một nhịp để sẵn sàng. Mọi thứ trong cổng học tập của {tenantName} đã được chuẩn bị để bạn bắt đầu thật mượt mà.
                </p>
              </div>

              <div className="mt-8 rounded-xl border border-border bg-background/70 p-4">
                <div className="flex items-start gap-3">
                  <div className="mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                    <Sparkles className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">Sẵn sàng bứt phá</p>
                    <p className="mt-1 text-sm leading-6 text-muted-foreground">
                      Bắt đầu học, theo dõi tiến độ và quay lại bất cứ lúc nào để tiếp tục đúng nhịp của bạn.
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-muted-foreground">
                  Chúc bạn có một phiên học thật hiệu quả.
                </p>
                <Button
                  type="button"
                  size="lg"
                  onClick={handleContinue}
                  disabled={isPending}
                  className="h-12 rounded-full px-6 text-base shadow-lg shadow-primary/20"
                >
                  {isPending ? "Đang bắt đầu..." : "Bắt đầu học ngay"}
                  <ArrowRight className="h-5 w-5" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
