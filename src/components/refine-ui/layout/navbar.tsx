"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import {
  useLink,
  useMenu,
  useGo,
  useGetIdentity,
  useActiveAuthProvider,
  useLogout,
  type TreeMenuItem,
} from "@refinedev/core";
import { useIsMobile } from "@/hooks/ui/use-mobile";
import { useScrolled } from "@/hooks/ui/use-scrolled";
import { cn } from "@/lib/utils";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import { UserAvatar } from "@/components/refine-ui/layout/user-avatar";
import { ThemeSelector } from "@/components/refine-ui/theme/theme-selector";
import { LanguageToggle } from "@/components/ui/language-toggle";
import { NotificationPanel } from "@/modules/notifications";
import { SearchModal, useSearchShortcut } from "@/components/global-search";
import { Profile } from "@/modules/profile/types";
import { useIsAdmin } from "@/modules/admin/hooks/use-is-admin";

import {
  FairPayIcon,
  SearchIcon,
  LogOutIcon,
  UserIcon,
  SettingsIcon,
  HeartIcon,
  BanknoteIcon,
  CreditCardIcon,
  ListIcon,
  PanelLeftIcon,
  LayoutDashboardIcon,
} from "@/components/ui/icons";

// ============ Main NavBar Component ============

export function NavBar() {
  const isMobile = useIsMobile();
  const scrolled = useScrolled(10);

  return (
    <nav
      className={cn(
        // Fixed positioning
        "fixed",
        "inset-x-0",
        "z-40",
        // Centering and sizing
        "mx-auto",
        "w-full",
        // Height
        "h-14",
        "md:h-16",
        // Layout
        "flex",
        "items-center",
        "justify-between",
        "gap-2",
        "md:gap-4",
        // Padding
        "px-3",
        "md:px-6",
        "py-2",
        "md:py-3",
        // Animation
        "transition-all",
        "duration-500",
        "ease-out",
        // Safe area for iOS
        "safe-area-inset-top",
        // ── Scroll-based states ──
        scrolled
          ? [
              // Floating glass pill
              "max-w-3xl",
              "lg:max-w-5xl",
              "top-3",
              "rounded-2xl",
              "bg-background/60",
              "backdrop-blur-xl",
              "shadow-lg",
              "shadow-black/5",
              "dark:shadow-black/20",
              "border",
              "border-border/40",
            ]
          : [
              // Full-width solid bar at top
              "max-w-full",
              "top-0",
              "rounded-none",
              "bg-background/95",
              "backdrop-blur-sm",
              "shadow-none",
              "border-b",
              "border-border/30",
            ]
      )}
      role="navigation"
      aria-label="Main navigation"
    >
      {/* Left section: Logo + Mobile Hamburger */}
      <div className="flex items-center gap-2">
        {isMobile && <MobileNavMenu />}
        <NavLogo />
      </div>

      {/* Center section: Desktop navigation items */}
      <DesktopNavItems />

      {/* Right section: Actions */}
      <NavActions />
    </nav>
  );
}

// ============ Logo Component ============

function NavLogo() {
  const go = useGo();

  return (
    <button
      onClick={() => go({ to: "/" })}
      className={cn(
        "flex items-center gap-2",
        "hover:opacity-80",
        "transition-opacity",
        "focus:outline-none",
        "focus-visible:ring-2",
        "focus-visible:ring-primary",
        "focus-visible:ring-offset-2",
        "rounded-lg"
      )}
      aria-label="Go to home"
    >
      <FairPayIcon className="w-10 h-10" />
      <span className="text-base md:text-lg font-bold">FairPay</span>
    </button>
  );
}

// ============ Desktop Navigation Items ============

function DesktopNavItems() {
  const { menuItems, selectedKey } = useMenu();
  const isMobile = useIsMobile();

  if (isMobile) return null;

  // Filter out hidden items
  const visibleItems = menuItems.filter(
    (item: TreeMenuItem) => !item.meta?.hide
  );

  return (
    <TooltipProvider delayDuration={0}>
      <div className="hidden md:flex items-center gap-1 lg:gap-2">
        {visibleItems.map((item: TreeMenuItem) => (
          <NavItem
            key={item.key || item.name}
            item={item}
            isActive={item.key === selectedKey}
          />
        ))}
      </div>
    </TooltipProvider>
  );
}

// ============ Single Navigation Item ============

type NavItemProps = {
  item: TreeMenuItem;
  isActive: boolean;
  onClick?: () => void;
  showLabel?: boolean;
};

function NavItem({ item, isActive, onClick, showLabel = true }: NavItemProps) {
  const Link = useLink();
  const { t } = useTranslation();

  const label = getDisplayName(item, t);
  const icon = item.meta?.icon ?? item.icon;

  const content = (
    <Link
      to={item.route || "/"}
      className={cn(
        "flex items-center gap-2 px-3 py-2 rounded-lg",
        "text-sm font-medium",
        "transition-all duration-200",
        isActive
          ? "bg-primary/10 text-primary"
          : "text-muted-foreground hover:text-foreground hover:bg-accent"
      )}
      onClick={onClick}
    >
      <ItemIcon icon={icon} isActive={isActive} />
      {showLabel && <span className="hidden lg:inline">{label}</span>}
    </Link>
  );

  // Show tooltip on desktop when label is hidden
  if (!showLabel) {
    return content;
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>{content}</TooltipTrigger>
      <TooltipContent side="bottom" className="lg:hidden">
        <span className="text-xs font-medium">{label}</span>
      </TooltipContent>
    </Tooltip>
  );
}

// ============ Navigation Actions (Right Side) ============

function NavActions() {
  const [searchOpen, setSearchOpen] = useState(false);
  const { t } = useTranslation();
  const isMobile = useIsMobile();

  useSearchShortcut(() => setSearchOpen(true));

  return (
    <div className="flex items-center gap-1 md:gap-2">
      {/* Search button */}
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              "h-9 w-9 md:h-10 md:w-10",
              "rounded-full",
              "hover:bg-accent"
            )}
            onClick={() => setSearchOpen(true)}
            aria-label={t("header.search")}
          >
            <SearchIcon className="h-4 w-4 md:h-5 md:w-5" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom">
          <span className="text-xs">{t("header.search")}</span>
        </TooltipContent>
      </Tooltip>

      {/* Theme selector - hidden on very small screens */}
      <div className="hidden sm:block">
        <ThemeSelector className="h-9 w-9 md:h-10 md:w-10" />
      </div>

      {/* Language toggle - hidden on mobile */}
      {!isMobile && <LanguageToggle className="h-9 w-9 md:h-10 md:w-10" />}

      {/* Notifications */}
      <NotificationPanel />

      {/* User dropdown */}
      <UserDropdown />

      {/* Search modal */}
      <SearchModal open={searchOpen} onOpenChange={setSearchOpen} />
    </div>
  );
}

// ============ Mobile Navigation Menu ============

function MobileNavMenu() {
  const [open, setOpen] = useState(false);
  const { menuItems, selectedKey } = useMenu();

  // Close on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && open) {
        setOpen(false);
      }
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [open]);

  // Filter out hidden items
  const visibleItems = menuItems.filter(
    (item: TreeMenuItem) => !item.meta?.hide
  );

  const handleItemClick = useCallback(() => {
    setOpen(false);
  }, []);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            "flex md:hidden",
            "h-10 w-10",
            "rounded-lg",
            "hover:bg-accent"
          )}
          aria-label="Open navigation menu"
          aria-expanded={open}
        >
          <PanelLeftIcon className="h-5 w-5" />
        </Button>
      </SheetTrigger>
      <SheetContent
        side="left"
        className={cn(
          "w-[280px] sm:w-[320px]",
          "p-0",
          "safe-area-inset-top"
        )}
      >
        <SheetHeader className="p-4 border-b">
          <SheetTitle className="flex items-center gap-3">
            <FairPayIcon className="w-10 h-10" />
            <span className="text-lg font-bold">FairPay</span>
          </SheetTitle>
        </SheetHeader>

        <nav className="flex flex-col p-4 gap-1" role="navigation">
          <TooltipProvider delayDuration={0}>
            {visibleItems.map((item: TreeMenuItem) => (
              <MobileNavItem
                key={item.key || item.name}
                item={item}
                isActive={item.key === selectedKey}
                onClick={handleItemClick}
              />
            ))}
          </TooltipProvider>
        </nav>

        {/* Mobile-specific actions at bottom */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t bg-background">
          <div className="flex items-center justify-between gap-2">
            <ThemeSelector className="flex-1 h-10 w-10" />
            <LanguageToggle className="flex-1 h-10 w-10" />
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

// ============ Mobile Navigation Item ============

type MobileNavItemProps = {
  item: TreeMenuItem;
  isActive: boolean;
  onClick: () => void;
};

function MobileNavItem({ item, isActive, onClick }: MobileNavItemProps) {
  const Link = useLink();
  const { t } = useTranslation();

  const label = getDisplayName(item, t);
  const icon = item.meta?.icon ?? item.icon;

  return (
    <Link
      to={item.route || "/"}
      className={cn(
        "flex items-center gap-3 px-4 py-3 rounded-lg",
        "text-base font-medium",
        "transition-all duration-200",
        isActive
          ? "bg-primary/10 text-primary"
          : "text-foreground hover:bg-accent"
      )}
      onClick={onClick}
    >
      <ItemIcon icon={icon} isActive={isActive} />
      <span>{label}</span>
    </Link>
  );
}

// ============ User Dropdown ============

function UserDropdown() {
  const { t } = useTranslation();
  const { data: identity } = useGetIdentity<Profile>();
  const { mutate: logout, isPending: isLoggingOut } = useLogout();
  const go = useGo();
  const authProvider = useActiveAuthProvider();
  const isMobile = useIsMobile();

  // Check if user is admin
  const { isAdmin } = useIsAdmin();

  if (!authProvider?.getIdentity) {
    return null;
  }

  // Show Login button for unauthenticated users
  if (!identity) {
    return (
      <Button variant="default" size="sm" onClick={() => go({ to: "/login" })}>
        {t("auth.login")}
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn(
          "flex items-center gap-2",
          "outline-none",
          "hover:opacity-80",
          "transition-opacity",
          "focus-visible:ring-2",
          "focus-visible:ring-primary",
          "focus-visible:ring-offset-2",
          "rounded-full"
        )}
      >
        {!isMobile && (
          <div className="hidden md:flex flex-col items-end">
            <span className="text-sm font-semibold text-foreground">
              {identity.full_name || "User"}
            </span>
            <span className="text-xs text-muted-foreground">
              {identity.id.slice(0, 8)}
            </span>
          </div>
        )}
        <UserAvatar />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        {/* Mobile: Show user info in dropdown */}
        <div className="flex flex-col gap-1 px-2 py-2 md:hidden border-b border-border mb-1">
          <span className="text-sm font-semibold text-foreground">
            {identity.full_name || "User"}
          </span>
          <span className="text-xs text-muted-foreground">
            ID: {identity.id.slice(0, 8)}
          </span>
        </div>

        <DropdownMenuItem
          onClick={() => go({ to: `/profile/${identity.id}?edit=true` })}
        >
          <UserIcon className="h-4 w-4" />
          <span>{t("auth.editProfile")}</span>
        </DropdownMenuItem>

        <DropdownMenuItem onClick={() => go({ to: "/settings" })}>
          <SettingsIcon className="h-4 w-4" />
          <span>{t("settings.title")}</span>
        </DropdownMenuItem>

        {isAdmin && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => go({ to: "/admin" })}>
              <LayoutDashboardIcon className="h-4 w-4" />
              <span>Admin Dashboard</span>
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => go({ to: "/settings/donation" })}
            >
              <HeartIcon className="h-4 w-4" />
              <span>{t("settings.donation.title", "Donation Settings")}</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => go({ to: "/settings/bank" })}>
              <BanknoteIcon className="h-4 w-4" />
              <span>{t("settings.bank.title", "Bank Settings")}</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => go({ to: "/settings/sepay" })}>
              <CreditCardIcon className="h-4 w-4" />
              <span>{t("settings.sepay.title", "SePay Settings")}</span>
            </DropdownMenuItem>
          </>
        )}

        <DropdownMenuSeparator />

        <DropdownMenuItem onClick={() => logout()}>
          <LogOutIcon
            className={cn("h-4 w-4", "text-destructive")}
          />
          <span className={cn("text-destructive")}>
            {isLoggingOut ? t("auth.loggingOut") : t("auth.logout")}
          </span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// ============ Helper Components ============

type ItemIconProps = {
  icon: React.ReactNode;
  isActive?: boolean;
};

function ItemIcon({ icon, isActive }: ItemIconProps) {
  const iconClassName = cn("w-5 h-5 shrink-0", {
    "text-primary": isActive,
    "text-muted-foreground": !isActive,
  });

  if (!icon) {
    return <ListIcon className={iconClassName} />;
  }

  // If icon is already a React element, clone it with the correct className
  if (React.isValidElement(icon)) {
    const existingClassName =
      (icon as React.ReactElement<{ className?: string }>).props?.className || "";
    return React.cloneElement(
      icon as React.ReactElement<{ className?: string }>,
      {
        className: cn(iconClassName, existingClassName),
      }
    );
  }

  return <>{icon}</>;
}

// ============ Utility Functions ============

function getDisplayName(
  item: TreeMenuItem,
  t: (key: string) => string
): string {
  const label = item.meta?.label ?? item.label ?? item.name;

  // Map resource names to translation keys
  const translationMap: Record<string, string> = {
    Dashboard: "dashboard.title",
    Groups: "groups.title",
    Friends: "friends.title",
    Connections: "connections.title",
    Balances: "balances.title",
    Reports: "reports.title",
    Settings: "settings.title",
  };

  return translationMap[label] ? t(translationMap[label]) : label;
}

NavBar.displayName = "NavBar";
