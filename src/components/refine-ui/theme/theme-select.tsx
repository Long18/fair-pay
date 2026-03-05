"use client";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import React from "react";
import { useTheme } from "./theme-provider";
import { parseThemeVariant, createThemeVariant } from "@/lib/theme-palettes";

import { CheckIcon, ChevronDownIcon, MonitorIcon, MoonIcon, SunIcon } from "@/components/ui/icons";
type ThemeOption = {
  value: "light" | "dark" | "system";
  label: string;
  icon: React.ReactNode;
};

const themeOptions: ThemeOption[] = [
  {
    value: "light",
    label: "Light",
    icon: <SunIcon className="h-4 w-4" />,
  },
  {
    value: "dark",
    label: "Dark",
    icon: <MoonIcon className="h-4 w-4" />,
  },
  {
    value: "system",
    label: "System",
    icon: <MonitorIcon className="h-4 w-4" />,
  },
];

export function ThemeSelect() {
  const { themeVariant, setThemeVariant } = useTheme();
  const { themeName, mode } = parseThemeVariant(themeVariant);

  const currentTheme = themeOptions.find((option) => option.value === mode);

  const handleThemeChange = (newMode: "light" | "dark" | "system") => {
    const newVariant = createThemeVariant(themeName, newMode);
    setThemeVariant(newVariant);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="lg"
          className={cn(
            "w-full",
            "justify-between",
            "px-3",
            "text-left",
            "text-sm",
            "font-normal",
            "text-foreground",
            "hover:bg-accent",
            "hover:text-accent-foreground",
            "focus-visible:outline-none",
            "focus-visible:ring-2",
            "focus-visible:ring-ring"
          )}
        >
          <div className="flex items-center gap-2">
            {currentTheme?.icon}
            <span>{currentTheme?.label}</span>
          </div>
          <ChevronDownIcon className="h-4 w-4 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-40 space-y-1">
        {themeOptions.map((option) => {
          const isSelected = mode === option.value;

          return (
            <DropdownMenuItem
              key={option.value}
              onClick={() => handleThemeChange(option.value)}
              className={cn(
                "flex items-center gap-2 cursor-pointer relative pr-8",
                {
                  "bg-accent text-accent-foreground": isSelected,
                }
              )}
            >
              {option.icon}
              <span>{option.label}</span>
              {isSelected && (
                <CheckIcon className="h-4 w-4 absolute right-2 text-primary" />
              )}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

ThemeSelect.displayName = "ThemeSelect";
