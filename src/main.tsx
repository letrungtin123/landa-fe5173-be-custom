import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App";

function syncFontPlatformToDOM() {
  const nav = window.navigator as Navigator & {
    userAgentData?: { mobile?: boolean; platform?: string };
  };
  const platform = nav.userAgentData?.platform || nav.platform || "";
  const userAgent = nav.userAgent || "";
  const isWindows = /windows|win32|win64|wow64/i.test(`${platform} ${userAgent}`);
  const isMobileUa = nav.userAgentData?.mobile === true
    || /android|iphone|ipad|ipod|iemobile|opera mini|mobile/i.test(userAgent);
  const isDesktopViewport = window.matchMedia("(min-width: 768px)").matches;
  const hasDesktopPointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;

  if (isWindows && !isMobileUa && isDesktopViewport && hasDesktopPointer) {
    document.documentElement.setAttribute("data-font-platform", "windows-desktop");
  } else {
    document.documentElement.removeAttribute("data-font-platform");
  }
}

syncFontPlatformToDOM();
window.matchMedia("(min-width: 768px)").addEventListener("change", syncFontPlatformToDOM);
window.matchMedia("(hover: hover) and (pointer: fine)").addEventListener("change", syncFontPlatformToDOM);

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
