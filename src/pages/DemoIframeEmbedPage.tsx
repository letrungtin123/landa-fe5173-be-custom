import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { AlertCircle, Loader2 } from "lucide-react";
import { bootstrapDemoIframeApi } from "@/api/auth";
import { resetDemoCourseModalStates } from "@/api/modalState";
import { resetDemoSectionModalStates } from "@/api/sectionModalConfig";
import { resetTransientBadgeStorage } from "@/lib/badgeEvaluator";
import { resetDemoIframeLearning } from "@/stores/demoIframeLearningStore";
import { useAuthStore } from "@/stores/useAuthStore";

function errorMessage(error: unknown): string {
  const maybeAxios = error as { response?: { data?: { message?: string } }; message?: string };
  return maybeAxios.response?.data?.message || maybeAxios.message || "Không thể khởi tạo demo iframe";
}

function parentOrigin(): string {
  const ancestorOrigins = (window.location as Location & { ancestorOrigins?: DOMStringList }).ancestorOrigins;
  const firstAncestor = ancestorOrigins?.[0];
  if (firstAncestor) {
    try { return new URL(firstAncestor).origin; } catch { /* ignore */ }
  }

  if (document.referrer) {
    try { return new URL(document.referrer).origin; } catch { /* ignore */ }
  }

  return "";
}

function safeNext(raw: string | null): string {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//")) return "/dashboard";
  if (raw.startsWith("/login") || raw.startsWith("/demo-embed")) return "/dashboard";
  return raw;
}

export function DemoIframeEmbedPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const setSession = useAuthStore((state) => state.setSession);
  const [error, setError] = useState<string | null>(null);
  const embedId = params.get("embed") || "";
  const nextPath = useMemo(() => safeNext(params.get("next")), [params]);

  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      if (!embedId) {
        setError("Thiếu mã nhúng demo iframe");
        return;
      }

      const origin = parentOrigin();
      if (!origin) {
        setError("Không xác định được domain nhúng iframe");
        return;
      }

      try {
        const session = await bootstrapDemoIframeApi(embedId, origin);
        if (cancelled) return;
        resetDemoIframeLearning();
        resetDemoCourseModalStates();
        resetDemoSectionModalStates();
        resetTransientBadgeStorage();
        await setSession(session);
        if (cancelled) return;
        navigate(nextPath, { replace: true });
      } catch (err) {
        if (!cancelled) setError(errorMessage(err));
      }
    }

    bootstrap();
    return () => { cancelled = true; };
  }, [embedId, navigate, nextPath, setSession]);

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-6">
        <div className="w-full max-w-md rounded-lg border border-destructive/20 bg-destructive/5 p-5 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-lg bg-destructive/10 text-destructive">
            <AlertCircle className="h-6 w-6" />
          </div>
          <h1 className="text-base font-semibold text-foreground">Demo iframe không khả dụng</h1>
          <p className="mt-2 text-sm text-muted-foreground">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="flex items-center gap-3 text-sm text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
        Đang khởi tạo demo...
      </div>
    </div>
  );
}
