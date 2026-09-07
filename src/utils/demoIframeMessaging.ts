import { isAppLocale, type AppLocale } from "@/i18n";

export const DEMO_IFRAME_LOCALE_EVENT = "la-demo-embed:set-locale";
export const DEMO_IFRAME_READY_EVENT = "la-demo-embed:ready";
export const DEMO_IFRAME_MESSAGE_VERSION = 1;

type DemoIframeLocaleMessage = {
  type: typeof DEMO_IFRAME_LOCALE_EVENT;
  version: typeof DEMO_IFRAME_MESSAGE_VERSION;
  locale: AppLocale;
};

/** Returns the embedding page origin used by the demo bootstrap request. */
export function getEmbeddingParentOrigin(): string {
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

export function isDemoIframeLocaleMessage(value: unknown): value is DemoIframeLocaleMessage {
  if (!value || typeof value !== "object") return false;

  const message = value as Partial<DemoIframeLocaleMessage>;
  return message.type === DEMO_IFRAME_LOCALE_EVENT
    && message.version === DEMO_IFRAME_MESSAGE_VERSION
    && isAppLocale(message.locale);
}

export function createDemoIframeReadyMessage() {
  return {
    type: DEMO_IFRAME_READY_EVENT,
    version: DEMO_IFRAME_MESSAGE_VERSION,
  } as const;
}
