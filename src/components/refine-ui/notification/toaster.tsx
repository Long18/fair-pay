"use client";

import { useTheme } from "@/components/refine-ui/theme/theme-provider";
import { parseThemeVariant } from "@/lib/theme-palettes";
import { Toaster as Sonner, type ToasterProps } from "sonner";

export function Toaster({ ...props }: ToasterProps) {
  const { themeVariant } = useTheme();
  const { mode } = parseThemeVariant(themeVariant);

  const effectiveTheme = mode === "system"
    ? (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light")
    : mode;

  return (
    <Sonner
      theme={effectiveTheme as ToasterProps["theme"]}
      position="bottom-left"
      className="toaster group"
      style={
        {
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--border)",
        } as React.CSSProperties
      }
      {...props}
    />
  );
}
