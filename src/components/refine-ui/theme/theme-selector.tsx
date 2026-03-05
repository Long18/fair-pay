"use client";

import { useTheme } from "@/components/refine-ui/theme/theme-provider";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { Check } from "lucide-react";
import { SunIcon, MoonIcon, MonitorIcon, PaletteIcon } from "@/components/ui/icons";
import { getThemeVariantsByGroup, parseThemeVariant, themePalettes, type ThemeColors } from "@/lib/theme-palettes";
import { useTranslation } from "react-i18next";
import { useState } from "react";
import { useHaptics } from "@/hooks/use-haptics";

type ThemeSelectorProps = {
  className?: string;
};

export function ThemeSelector({ className }: ThemeSelectorProps) {
  const { themeVariant, setThemeVariant } = useTheme();
  const { t } = useTranslation();
  const { tap } = useHaptics();
  const currentVariant = parseThemeVariant(themeVariant);
  const [activeTab, setActiveTab] = useState<string>(currentVariant.mode);
  const [open, setOpen] = useState(false);

  const variantGroups = getThemeVariantsByGroup();

  // Group variants by mode
  const variantsByMode = {
    light: variantGroups.flatMap(group =>
      group.variants.filter(v => v.mode === "light")
    ),
    dark: variantGroups.flatMap(group =>
      group.variants.filter(v => v.mode === "dark")
    ),
    system: variantGroups.flatMap(group =>
      group.variants.filter(v => v.mode === "system")
    ),
  };

  const getModeIcon = (mode: string) => {
    switch (mode) {
      case "light":
        return <SunIcon className="h-3.5 w-3.5 text-[hsl(var(--warning))]" />;
      case "dark":
        return <MoonIcon className="h-3.5 w-3.5 text-muted-foreground" />;
      case "system":
        return <MonitorIcon className="h-3.5 w-3.5 text-muted-foreground" />;
      default:
        return null;
    }
  };

  const getModeDescription = (mode: string) => {
    switch (mode) {
      case "light":
        return t("theme.light") + " theme";
      case "dark":
        return t("theme.dark") + " theme";
      case "system":
        return t("theme.system") + " theme";
      default:
        return "";
    }
  };

  const renderThemeButton = (variant: any, index: number) => {
    const variantKey = `${variant.themeName}-${variant.mode}`;
    const isSelected = themeVariant === variantKey;
    const palette = themePalettes[variant.themeName];
    const mode = variant.mode === "system" ? "light" : variant.mode;
    const colors = palette?.[mode as keyof typeof palette] as ThemeColors | undefined;
    const themeName = palette?.displayName || variant.themeName;
    const isEven = index % 2 === 0;

    const handleClick = async (event: React.MouseEvent<HTMLButtonElement>) => {
      tap();
      // Capture click coordinates for circular reveal animation
      const { clientX, clientY } = event;

      // Wait for animation to complete before closing dropdown
      await setThemeVariant(variantKey, { x: clientX, y: clientY });

      // Close dropdown after animation finishes
      setOpen(false);
    };

    return (
      <button
        key={variantKey}
        onClick={handleClick}
        className={cn(
          "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-150",
          isSelected
            ? "bg-primary/20 border border-primary/40"
            : isEven
            ? "bg-muted/40 dark:bg-muted/60 hover:bg-muted/60 dark:hover:bg-muted/80 border border-transparent"
            : "bg-transparent hover:bg-secondary/80 dark:hover:bg-secondary border border-transparent"
        )}
        role="option"
        aria-selected={isSelected}
      >
        <div
          className="relative h-8 w-12 rounded-md overflow-hidden shrink-0 border border-border shadow-sm"
          style={{ backgroundColor: colors?.background || "#000" }}
        >
          <div
            className="absolute top-1 left-1 right-1 h-1 rounded-sm opacity-30"
            style={{ backgroundColor: colors?.card || colors?.foreground || "#000" }}
          />
          <div className="absolute bottom-1 left-1 right-1 flex gap-0.5">
            <div
              className="h-1.5 flex-1 rounded-sm"
              style={{ backgroundColor: colors?.primary || "#3B9DA5" }}
            />
            <div
              className="h-1.5 flex-1 rounded-sm"
              style={{ backgroundColor: colors?.accent || "#8B7CF6" }}
            />
          </div>
        </div>
        <div className="flex-1 text-left">
          <div className="flex items-center gap-2">
            <span className={cn(
              "text-sm font-medium",
              isSelected ? "text-primary" : "text-foreground"
            )}>
              {themeName}
            </span>
            {getModeIcon(variant.mode)}
          </div>
          <span className="text-xs text-muted-foreground">
            {getModeDescription(variant.mode)}
          </span>
        </div>
        {isSelected && (
          <div className="flex h-5 w-5 items-center justify-center rounded-full bg-primary">
            <Check className="h-3 w-3 text-primary-foreground" />
          </div>
        )}
      </button>
    );
  };

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
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
          <PaletteIcon className="h-[1.2rem] w-[1.2rem]" />
          <span className="sr-only">Select color theme</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 max-h-[600px] overflow-hidden p-2">
        <DropdownMenuLabel className="px-2 py-1.5">{t("theme.selectTheme")}</DropdownMenuLabel>
        <DropdownMenuSeparator />

        <Tabs value={activeTab} onValueChange={(v) => { tap(); setActiveTab(v); }} className="w-full">
          <TabsList className="w-full grid grid-cols-3 mb-2">
            <TabsTrigger value="light" className="gap-1.5">
              <SunIcon className="h-3.5 w-3.5" />
              <span className="text-xs">{t("theme.light")}</span>
            </TabsTrigger>
            <TabsTrigger value="dark" className="gap-1.5">
              <MoonIcon className="h-3.5 w-3.5" />
              <span className="text-xs">{t("theme.dark")}</span>
            </TabsTrigger>
            <TabsTrigger value="system" className="gap-1.5">
              <MonitorIcon className="h-3.5 w-3.5" />
              <span className="text-xs">{t("theme.system")}</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="light" className="mt-0 max-h-[450px] overflow-y-auto space-y-1 pr-1">
            {variantsByMode.light.map((variant, index) => renderThemeButton(variant, index))}
          </TabsContent>

          <TabsContent value="dark" className="mt-0 max-h-[450px] overflow-y-auto space-y-1 pr-1">
            {variantsByMode.dark.map((variant, index) => renderThemeButton(variant, index))}
          </TabsContent>

          <TabsContent value="system" className="mt-0 max-h-[450px] overflow-y-auto space-y-1 pr-1">
            {variantsByMode.system.map((variant, index) => renderThemeButton(variant, index))}
          </TabsContent>
        </Tabs>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

ThemeSelector.displayName = "ThemeSelector";
