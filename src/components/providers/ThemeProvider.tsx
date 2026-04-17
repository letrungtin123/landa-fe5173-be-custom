import { useEffect } from "react";
import { useThemeStore } from "@/stores/useThemeStore";

/**
 * ThemeProvider — syncs Zustand theme state to DOM attributes on mount.
 * Also watches for system prefers-color-scheme changes.
 */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { colorMode, colorStyle, preset, setColorMode } = useThemeStore();

  // Sync theme to DOM on mount and when values change
  useEffect(() => {
    const html = document.documentElement;
    html.setAttribute("data-theme", colorMode);
    html.setAttribute("data-color-style", colorStyle);
    html.setAttribute("data-preset", preset);
  }, [colorMode, colorStyle, preset]);

  // Watch for system color scheme changes
  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = (e: MediaQueryListEvent) => {
      // Only auto-switch if user hasn't explicitly set a preference
      const stored = localStorage.getItem("la-theme");
      if (!stored) {
        setColorMode(e.matches ? "dark" : "light");
      }
    };

    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, [setColorMode]);

  return <>{children}</>;
}
