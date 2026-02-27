import { useState, useEffect } from "react";
import { useGo } from "@refinedev/core";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

import { PlusCircleIcon, BanknoteIcon, UsersIcon, UserPlusIcon, PlusIcon, XIcon } from "@/components/ui/icons";
interface FloatingActionButtonProps {
  disabled?: boolean;
}

export function FloatingActionButton({ disabled = false }: FloatingActionButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const go = useGo();
  const { t } = useTranslation();

  // Keyboard accessibility: Close on Escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
      return () => document.removeEventListener("keydown", handleEscape);
    }
  }, [isOpen]);

  const actions = [
    {
      icon: PlusCircleIcon,
      title: t('dashboard.addExpense'),
      path: "/expenses/create",
      color: "bg-primary hover:bg-primary/90",
      hoverRing: "hover:ring-primary/20",
    },
    {
      icon: BanknoteIcon,
      title: t('dashboard.settleUp'),
      path: "/payments/create",
      color: "bg-green-600 hover:bg-green-700 dark:bg-green-500 dark:hover:bg-green-600",
      hoverRing: "hover:ring-green-500/20",
    },
    {
      icon: UsersIcon,
      title: t('dashboard.createGroup'),
      path: "/groups/create",
      color: "bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600",
      hoverRing: "hover:ring-blue-500/20",
    },
    {
      icon: UserPlusIcon,
      title: t('dashboard.inviteFriend'),
      path: "/friends",
      color: "bg-purple-600 hover:bg-purple-700 dark:bg-purple-500 dark:hover:bg-purple-600",
      hoverRing: "hover:ring-purple-500/20",
    },
  ];

  const handleClick = (path: string) => {
    go({ to: path });
    setIsOpen(false);
  };

  const toggleMenu = () => {
    setIsOpen(!isOpen);
  };

  // Hide FAB for unauthenticated users
  if (disabled) {
    return null;
  }

  return (
    <>
      {/* Enhanced backdrop with smooth blur */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40 animate-in fade-in duration-200"
          onClick={() => setIsOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* FAB Container */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col-reverse items-end gap-3">
        <TooltipProvider delayDuration={300}>
          {/* Speed Dial Actions with staggered animation */}
          {isOpen && (
            <div className="flex flex-col-reverse gap-3">
              {actions.map((action, index) => (
                <Tooltip key={index}>
                  <TooltipTrigger asChild>
                    <Button
                      size="icon"
                      onClick={() => handleClick(action.path)}
                      className={cn(
                        "h-12 w-12 md:h-14 md:w-14 rounded-xl text-white shadow-lg",
                        "transition-all duration-150 ease-out",
                        "hover:scale-110 active:scale-95",
                        "hover:shadow-xl hover:ring-4",
                        "focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-offset-2",
                        "relative overflow-visible group",
                        action.color,
                        action.hoverRing,
                        // Smooth entrance animation
                        "animate-in fade-in slide-in-from-bottom-1 zoom-in-95 duration-200"
                      )}
                      style={{
                        animationDelay: `${index * 40}ms`,
                        animationFillMode: "backwards",
                      }}
                      aria-label={action.title}
                    >
                      {/* Subtle glow on hover */}
                      <div className="absolute inset-0 rounded-xl bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none" />

                      {/* Icon with subtle scale on hover */}
                      <div className="relative z-10 transition-transform duration-150 group-hover:scale-110">
                        <action.icon className="h-5 w-5 md:h-6 md:w-6" fill="currentColor" />
                      </div>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent
                    side="left"
                    className="font-medium shadow-lg"
                  >
                    {action.title}
                  </TooltipContent>
                </Tooltip>
              ))}
            </div>
          )}

          {/* Main FAB with enhanced depth and modern effects */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="icon"
                onClick={toggleMenu}
                className={cn(
                  "h-14 w-14 md:h-16 md:w-16 rounded-2xl shadow-xl",
                  "bg-primary hover:bg-primary/90 text-primary-foreground",
                  "transition-all duration-200 ease-out",
                  "hover:scale-110 active:scale-95",
                  "hover:shadow-2xl hover:ring-4 hover:ring-primary/30",
                  "focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/40 focus-visible:ring-offset-2",
                  "relative overflow-visible group",
                  isOpen && "scale-110 shadow-2xl ring-4 ring-primary/30"
                )}
                aria-label={isOpen ? t('dashboard.closeMenu') : t('dashboard.quickActions')}
                aria-expanded={isOpen}
                aria-haspopup="menu"
              >
                {/* Animated glow ring */}
                <div className={cn(
                  "absolute inset-0 rounded-2xl bg-primary/20 blur-md -z-10",
                  "transition-opacity duration-300",
                  isOpen ? "opacity-100 animate-pulse" : "opacity-0 group-hover:opacity-60"
                )} />

                {/* Gradient overlay for depth */}
                <div className="absolute inset-0 bg-gradient-to-br from-white/20 via-white/5 to-transparent rounded-2xl pointer-events-none" />

                {/* Icon with enhanced animation */}
                <div className={cn(
                  "relative z-10 transition-all duration-200",
                  isOpen ? "rotate-45 scale-110" : "rotate-0 scale-100"
                )}>
                  {isOpen ? (
                    <XIcon className="h-6 w-6 md:h-7 md:w-7" fill="currentColor" />
                  ) : (
                    <PlusIcon className="h-6 w-6 md:h-7 md:w-7" fill="currentColor" />
                  )}
                </div>
              </Button>
            </TooltipTrigger>
            <TooltipContent
              side="left"
              className="font-medium shadow-lg"
            >
              {isOpen ? t('dashboard.closeMenu') : t('dashboard.quickActions')}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    </>
  );
}
