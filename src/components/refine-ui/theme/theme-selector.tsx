"use client";

import { useTheme } from "@/components/refine-ui/theme/theme-provider";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { Palette, Check } from "lucide-react";
import { getThemeVariantsByGroup, parseThemeVariant, themePalettes } from "@/lib/theme-palettes";
import { useTranslation } from "react-i18next";

type ThemeSelectorProps = {
  className?: string;
};

export function ThemeSelector({ className }: ThemeSelectorProps) {
  const { themeVariant, setThemeVariant } = useTheme();
  const { t } = useTranslation();

  const variantGroups = getThemeVariantsByGroup();
  const currentVariant = parseThemeVariant(themeVariant);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          className={cn(
            "rounded-full",
            "border-sidebar-border",
            "bg-transparent",
            className,
            "h-10",
            "w-10"
          )}
          title={currentVariant.displayName}
        >
          <Palette className="h-[1.2rem] w-[1.2rem]" />
          <span className="sr-only">Select color theme</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64 max-h-[500px] overflow-y-auto">
        <DropdownMenuLabel>{t("theme.selectTheme")}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {variantGroups.map((group, groupIndex) => (
          <div key={group.label}>
            {groupIndex > 0 && <DropdownMenuSeparator />}
            <DropdownMenuLabel className="text-xs text-muted-foreground px-2 py-1.5">
              {group.label}
            </DropdownMenuLabel>
            {group.variants.map((variant) => {
              const variantKey = `${variant.themeName}-${variant.mode}`;
              const isSelected = themeVariant === variantKey;
              const palette = themePalettes[variant.themeName];
              const mode = variant.mode === "system" ? "light" : variant.mode;
              const colors = palette?.[mode];

              return (
                <DropdownMenuItem
                  key={variantKey}
                  onClick={() => setThemeVariant(variantKey)}
                  className={cn(
                    "flex items-center justify-between cursor-pointer px-2 py-1.5",
                    isSelected && "bg-accent"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <div className="relative w-12 h-12 sm:w-14 sm:h-14 rounded-md border border-border overflow-hidden flex-shrink-0 bg-background">
                      <div
                        className="absolute top-1 left-1 right-1 h-1 sm:h-1.5 rounded-sm opacity-30"
                        style={{ backgroundColor: colors?.card || colors?.background || "#000" }}
                      />
                      <div className="absolute bottom-1 left-1 right-1 flex gap-0.5 sm:gap-1">
                        <div
                          className="h-2 sm:h-2.5 flex-1 rounded-sm"
                          style={{ backgroundColor: colors?.primary || "#3B9DA5" }}
                        />
                        <div
                          className="h-2 sm:h-2.5 flex-1 rounded-sm"
                          style={{ backgroundColor: colors?.accent || "#8B7CF6" }}
                        />
                      </div>
                    </div>
                    <span className="text-sm sm:text-base">{variant.displayName}</span>
                  </div>
                  {isSelected && (
                    <Check className="h-4 w-4 text-primary" />
                  )}
                </DropdownMenuItem>
              );
            })}
          </div>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

ThemeSelector.displayName = "ThemeSelector";
