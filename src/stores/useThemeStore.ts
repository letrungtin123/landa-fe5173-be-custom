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

export const LOCKED_THEME_PRESET: ThemePreset = "la-blue";
export const THEME_PRESET_SWITCHER_ENABLED = false;

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

export function resolveThemePreset(preset: ThemePreset): ThemePreset {
  return THEME_PRESET_SWITCHER_ENABLED ? preset : LOCKED_THEME_PRESET;
}

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
  const effectivePreset = resolveThemePreset(preset);
  html.setAttribute("data-theme", colorMode);
  html.setAttribute("data-color-style", colorStyle);
  html.setAttribute("data-preset", effectivePreset);
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
        const effectivePreset = resolveThemePreset(preset);
        set({ preset: effectivePreset });
        syncThemeToDOM(get().colorMode, get().colorStyle, effectivePreset);
      },
    }),
    {
      name: "la-theme",
      merge: (persistedState, currentState) => {
        const persisted = persistedState as Partial<ThemeState> | undefined;
        return {
          ...currentState,
          ...persisted,
          preset: resolveThemePreset(persisted?.preset ?? currentState.preset),
        };
      },
      onRehydrateStorage: () => (state) => {
        if (state) {
          const effectivePreset = resolveThemePreset(state.preset);
          state.preset = effectivePreset;
          syncThemeToDOM(state.colorMode, state.colorStyle, effectivePreset);
        }
      },
    }
  )
);
