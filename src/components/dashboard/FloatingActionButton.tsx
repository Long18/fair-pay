import { useState } from "react";
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

  const actions = [
    {
      icon: PlusCircleIcon,
      title: t('dashboard.addExpense'),
      path: "/expenses/create",
      color: "bg-emerald-600 hover:bg-emerald-700",
      hoverRing: "hover:ring-emerald-500/30",
    },
    {
      icon: BanknoteIcon,
      title: t('dashboard.settleUp'),
      path: "/payments/create",
      color: "bg-green-600 hover:bg-green-700",
      hoverRing: "hover:ring-green-500/30",
    },
    {
      icon: UsersIcon,
      title: t('dashboard.createGroup'),
      path: "/groups/create",
      color: "bg-blue-600 hover:bg-blue-700",
      hoverRing: "hover:ring-blue-500/30",
    },
    {
      icon: UserPlusIcon,
      title: t('dashboard.inviteFriend'),
      path: "/friends",
      color: "bg-purple-600 hover:bg-purple-700",
      hoverRing: "hover:ring-purple-500/30",
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
      {/* Backdrop with subtle blur */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/20 backdrop-blur-[2px] z-40 transition-all duration-200 ease-out"
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
                        "h-12 w-12 rounded-full text-white shadow-lg",
                        "transition-all duration-200 ease-out",
                        "hover:scale-[1.08] active:scale-95",
                        "hover:shadow-xl hover:ring-4",
                        "relative overflow-hidden",
                        action.color,
                        action.hoverRing,
                        // Staggered entrance animation
                        "animate-in fade-in slide-in-from-bottom-2 duration-200"
                      )}
                      style={{
                        animationDelay: `${index * 50}ms`,
                        animationFillMode: "backwards",
                      }}
                      aria-label={action.title}
                    >
                      {/* Subtle shine effect */}
                      <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
                      <action.icon className="h-5 w-5 relative z-10" />
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

          {/* Main FAB with enhanced depth */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="icon"
                onClick={toggleMenu}
                className={cn(
                  "h-14 w-14 rounded-full shadow-xl",
                  "bg-primary hover:bg-primary/90 text-primary-foreground",
                  "transition-all duration-200 ease-out",
                  "hover:scale-[1.08] active:scale-95",
                  "hover:shadow-2xl hover:ring-4 hover:ring-primary/30",
                  "relative overflow-hidden group",
                  isOpen && "rotate-45 shadow-2xl ring-4 ring-primary/30"
                )}
                aria-label={isOpen ? t('dashboard.closeMenu') : t('dashboard.quickActions')}
                aria-expanded={isOpen}
              >
                {/* Subtle inner glow */}
                <div className="absolute inset-0 bg-gradient-to-br from-white/20 via-transparent to-transparent opacity-60" />

                {/* Animated pulse effect (only when closed) */}
                {!isOpen && (
                  <div className="absolute inset-0 rounded-full bg-primary animate-pulse opacity-20" />
                )}

                {/* Icon with smooth transition */}
                <div className="relative z-10 transition-transform duration-200">
                  {isOpen ? (
                    <XIcon className="h-6 w-6" />
                  ) : (
                    <PlusIcon className="h-6 w-6" />
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
