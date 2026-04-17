import { create } from "zustand";
import { persist } from "zustand/middleware";

export type ColorMode = "light" | "dark";
export type ColorStyle = "solid" | "gradient";
export type ThemePreset =
  | "la-blue"
  | "ocean"
  | "emerald"
  | "royal"
  | "sunset"
  | "rose"
  | "teal"
  | "amber";

export interface ThemePresetInfo {
  id: ThemePreset;
  name: string;
  color: string; // representative hex color for preview
}

export const THEME_PRESETS: ThemePresetInfo[] = [
  { id: "la-blue", name: "L&A Blue", color: "#2563eb" },
  { id: "ocean", name: "Ocean", color: "#3282b8" },
  { id: "emerald", name: "Emerald", color: "#10b981" },
  { id: "royal", name: "Royal", color: "#6366f1" },
  { id: "sunset", name: "Sunset", color: "#f97316" },
  { id: "rose", name: "Rose", color: "#e11d48" },
  { id: "teal", name: "Teal", color: "#14b8a6" },
  { id: "amber", name: "Amber", color: "#f59e0b" },
];

interface ThemeState {
  colorMode: ColorMode;
  colorStyle: ColorStyle;
  preset: ThemePreset;
  toggleColorMode: () => void;
  setColorMode: (mode: ColorMode) => void;
  setColorStyle: (style: ColorStyle) => void;
  setPreset: (preset: ThemePreset) => void;
}

function syncThemeToDOM(
  colorMode: ColorMode,
  colorStyle: ColorStyle,
  preset: ThemePreset
) {
  const html = document.documentElement;
  html.setAttribute("data-theme", colorMode);
  html.setAttribute("data-color-style", colorStyle);
  html.setAttribute("data-preset", preset);
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      colorMode: "light",
      colorStyle: "solid",
      preset: "la-blue",

      toggleColorMode: () => {
        const newMode = get().colorMode === "light" ? "dark" : "light";
        set({ colorMode: newMode });
        syncThemeToDOM(newMode, get().colorStyle, get().preset);
      },

      setColorMode: (mode) => {
        set({ colorMode: mode });
        syncThemeToDOM(mode, get().colorStyle, get().preset);
      },

      setColorStyle: (style) => {
        set({ colorStyle: style });
        syncThemeToDOM(get().colorMode, style, get().preset);
      },

      setPreset: (preset) => {
        set({ preset });
        syncThemeToDOM(get().colorMode, get().colorStyle, preset);
      },
    }),
    {
      name: "la-theme",
      onRehydrateStorage: () => (state) => {
        if (state) {
          syncThemeToDOM(state.colorMode, state.colorStyle, state.preset);
        }
      },
    }
  )
);
