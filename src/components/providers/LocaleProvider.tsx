import { useEffect } from "react";
import i18n from "@/i18n";
import { useLocaleStore } from "@/stores/useLocaleStore";
import { useAuthStore } from "@/stores/useAuthStore";
import {
  createDemoIframeReadyMessage,
  getEmbeddingParentOrigin,
  isDemoIframeLocaleMessage,
} from "@/utils/demoIframeMessaging";

/** Syncs the persisted UI-only locale with i18next and the document language. */
export function LocaleProvider({ children }: { children: React.ReactNode }) {
  const locale = useLocaleStore((state) => state.locale);
  const setLocale = useLocaleStore((state) => state.setLocale);
  const sessionMode = useAuthStore((state) => state.sessionMode);

  useEffect(() => {
    document.documentElement.lang = locale;
    void i18n.changeLanguage(locale);
  }, [locale]);

  useEffect(() => {
    const isDemoEmbedRoute = window.location.pathname === "/demo-embed";
    const isDemoIframe = sessionMode === "demo_iframe" || isDemoEmbedRoute;
    const trustedParentOrigin = getEmbeddingParentOrigin();
    if (!isDemoIframe || window.parent === window || !trustedParentOrigin) return;

    const handleMessage = (event: MessageEvent<unknown>) => {
      if (event.source !== window.parent || event.origin !== trustedParentOrigin) return;
      if (!isDemoIframeLocaleMessage(event.data)) return;

      setLocale(event.data.locale);
    };

    window.addEventListener("message", handleMessage);
    window.parent.postMessage(createDemoIframeReadyMessage(), trustedParentOrigin);

    return () => window.removeEventListener("message", handleMessage);
  }, [sessionMode, setLocale]);

  return <>{children}</>;
}
