"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { getThemeColors, parseThemeVariant, createThemeVariant } from "@/lib/theme-palettes";
import { withCircularReveal } from "@/lib/circular-reveal";

type ThemeProviderProps = {
  children: React.ReactNode;
  defaultThemeVariant?: string;
  storageKey?: string;
};

type ThemeProviderState = {
  themeVariant: string;
  setThemeVariant: (variant: string, clickPosition?: { x: number; y: number }) => Promise<void>;
};

const initialState: ThemeProviderState = {
  themeVariant: "monokai-pro-light",
  setThemeVariant: async () => {},
};

const ThemeProviderContext = createContext<ThemeProviderState>(initialState);

export function ThemeProvider({
  children,
  defaultThemeVariant = "monokai-pro-light",
  storageKey = "refine-ui-theme-variant",
  ...props
}: ThemeProviderProps) {
  const [themeVariant, setThemeVariantState] = useState<string>(() => {
    const stored = localStorage.getItem(storageKey);
    if (stored) return stored;

    const oldThemeName = localStorage.getItem("refine-ui-theme-name");
    const oldTheme = localStorage.getItem("refine-ui-theme");

    if (oldThemeName && oldTheme) {
      const migrated = createThemeVariant(oldThemeName, oldTheme);
      localStorage.setItem(storageKey, migrated);
      localStorage.removeItem("refine-ui-theme-name");
      localStorage.removeItem("refine-ui-theme");
      return migrated;
    }

    return defaultThemeVariant;
  });

  const applyThemeChanges = (variant: string) => {
    const root = window.document.documentElement;
    const { themeName, mode } = parseThemeVariant(variant);

    root.classList.remove("light", "dark");

    let effectiveTheme: "light" | "dark";

    if (mode === "system") {
      const systemTheme = window.matchMedia("(prefers-color-scheme: dark)")
        .matches
        ? "dark"
        : "light";

      root.classList.add(systemTheme);
      effectiveTheme = systemTheme;
    } else {
      root.classList.add(mode);
      effectiveTheme = mode;
    }

    const themeColors = getThemeColors(themeName, effectiveTheme);
    if (themeColors) {
      Object.entries(themeColors).forEach(([key, value]) => {
        const cssVarName = `--${key.replace(/([A-Z])/g, "-$1").toLowerCase()}`;
        root.style.setProperty(cssVarName, value);
      });
    }

    const themeColor = effectiveTheme === "dark" ? "#252525" : "#f9fafb";
    const metaThemeColor = document.querySelector('meta[name="theme-color"]');
    if (metaThemeColor) {
      metaThemeColor.setAttribute("content", themeColor);
    }
  };

  useEffect(() => {
    applyThemeChanges(themeVariant);
  }, [themeVariant]);

  const value = {
    themeVariant,
    setThemeVariant: async (newVariant: string, clickPosition?: { x: number; y: number }) => {
      const applyTheme = () => {
        // Apply theme changes immediately within the transition callback
        applyThemeChanges(newVariant);
        // Update state (will also trigger useEffect, but changes already applied)
        localStorage.setItem(storageKey, newVariant);
        setThemeVariantState(newVariant);
      };

      // If click position is provided, use circular reveal animation
      if (clickPosition) {
        await withCircularReveal(applyTheme, clickPosition);
      } else {
        // Fallback to instant change
        applyTheme();
      }
    },
  };

  return (
    <ThemeProviderContext.Provider {...props} value={value}>
      {children}
    </ThemeProviderContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeProviderContext);

  if (context === undefined) {
    console.error("useTheme must be used within a ThemeProvider");
  }

  return context;
}

ThemeProvider.displayName = "ThemeProvider";
