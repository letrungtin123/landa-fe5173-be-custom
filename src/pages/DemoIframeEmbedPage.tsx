import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { AlertCircle, Loader2 } from "lucide-react";
import { bootstrapDemoIframeApi } from "@/api/auth";
import { resetDemoCourseModalStates } from "@/api/modalState";
import { resetDemoSectionModalStates } from "@/api/sectionModalConfig";
import { resetDemoIframeLearning } from "@/stores/demoIframeLearningStore";
import { useAuthStore } from "@/stores/useAuthStore";
import { LanguageSwitcher } from "@/components/layout/LanguageSwitcher";
import { useTranslation } from "react-i18next";
import { getEmbeddingParentOrigin } from "@/utils/demoIframeMessaging";

function errorMessage(error: unknown, fallback: string): string {
  const maybeAxios = error as { response?: { data?: { message?: string } }; message?: string };
  return maybeAxios.response?.data?.message || maybeAxios.message || fallback;
}

function safeNext(raw: string | null): string {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//")) return "/dashboard";
  if (raw.startsWith("/login") || raw.startsWith("/demo-embed")) return "/dashboard";
  return raw;
}

export function DemoIframeEmbedPage() {
  const { t } = useTranslation();
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
        setError(t("demo.iframeCodeMissing"));
        return;
      }

      const origin = getEmbeddingParentOrigin();
      if (!origin) {
        setError(t("demo.iframeDomainUnknown"));
        return;
      }

      try {
        const session = await bootstrapDemoIframeApi(embedId, origin);
        if (cancelled) return;
        resetDemoIframeLearning();
        resetDemoCourseModalStates();
        resetDemoSectionModalStates();
        await setSession(session);
        if (cancelled) return;
        navigate(nextPath, { replace: true });
      } catch (err) {
        if (!cancelled) setError(errorMessage(err, t("demo.iframeInitializationFailed")));
      }
    }

    bootstrap();
    return () => { cancelled = true; };
  }, [embedId, navigate, nextPath, setSession, t]);

  if (error) {
    return (
      <div className="relative flex min-h-screen items-center justify-center bg-background p-6">
        <div className="absolute right-4 top-4">
          <LanguageSwitcher variant="public" />
        </div>
        <div className="w-full max-w-md rounded-lg border border-destructive/20 bg-destructive/5 p-5 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-lg bg-destructive/10 text-destructive">
            <AlertCircle className="h-6 w-6" />
          </div>
          <h1 className="text-base font-semibold text-foreground">{t("demo.iframeUnavailable")}</h1>
          <p className="mt-2 text-sm text-muted-foreground">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-background">
      <div className="absolute right-4 top-4">
        <LanguageSwitcher variant="public" />
      </div>
      <div className="flex items-center gap-3 text-sm text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
        {t("demo.initializing")}
      </div>
    </div>
  );
}
