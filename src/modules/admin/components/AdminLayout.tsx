import { useState, useEffect, useCallback } from "react";
import { useGetIdentity } from "@refinedev/core";
import { Link, useLocation } from "react-router";
import { AnimatedOutlet } from "@/components/animated-outlet";
import { Profile } from "@/modules/profile/types";
import { ThemeSelector } from "@/components/refine-ui/theme/theme-selector";
import { useIsMobile } from "@/hooks/ui/use-mobile";
import { useScrolled } from "@/hooks/ui/use-scrolled";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  FairPayIcon,
  LayoutDashboardIcon,
  UsersIcon,
  ReceiptIcon,
  SmilePlusIcon,
  PanelLeftIcon,
  ArrowLeftIcon,
  SettingsIcon,
  TrendingUpIcon,
  ShieldCheckIcon,
} from "@/components/ui/icons";
import { useHaptics } from "@/hooks/use-haptics";
import { useAdminTranslation } from "../i18n";
import { useAdminAccess } from "../hooks/use-admin-access";
import type { AdminCapabilities } from "../access";

// ─── Nav Items Config ───────────────────────────────────────────────

const NAV_ITEMS = [
  { key: "overview", labelKey: "nav.overview", icon: LayoutDashboardIcon, path: "/admin", capability: "canViewOverview" },
  { key: "people", labelKey: "nav.people", icon: UsersIcon, path: "/admin/people", capability: "canViewPeople" },
  { key: "transactions", labelKey: "nav.transactions", icon: ReceiptIcon, path: "/admin/transactions", capability: "canViewTransactions" },
  { key: "reactions", labelKey: "nav.reactions", icon: SmilePlusIcon, path: "/admin/reactions", capability: "canManageReactions" },
  { key: "devtool", labelKey: "nav.devtool", icon: SettingsIcon, path: "/admin/devtool", capability: "canAccessDevTool" },
  { key: "marketing", labelKey: "nav.marketing", icon: TrendingUpIcon, path: "/admin/marketing", capability: "canViewGrowth" },
] as const;

// ─── Helpers ────────────────────────────────────────────────────────

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function isActive(itemPath: string, pathname: string): boolean {
  return itemPath === "/admin"
    ? pathname === "/admin"
    : pathname.startsWith(itemPath);
}

function getNavItemLabel(
  item: (typeof NAV_ITEMS)[number],
  access: AdminCapabilities,
  tAdmin: (key: string) => string,
): string {
  if (
    item.key === "devtool" &&
    access.canModerateContent &&
    !access.canUseDevtool
  ) {
    return tAdmin("nav.moderation");
  }
  return tAdmin(item.labelKey);
}

function getNavItemIcon(item: (typeof NAV_ITEMS)[number], access: AdminCapabilities) {
  if (
    item.key === "devtool" &&
    access.canModerateContent &&
    !access.canUseDevtool
  ) {
    return ShieldCheckIcon;
  }
  return item.icon;
}

// ─── Main Layout ────────────────────────────────────────────────────

export function AdminLayout() {
  const isMobile = useIsMobile();

  return (
    <div className="flex flex-col min-h-screen">
      <AdminNavBar isMobile={isMobile} />
      <main
        className={cn(
          "@container/main",
          "container",
          "mx-auto",
          "relative",
          "w-full",
          "flex",
          "flex-col",
          "flex-1",
          "px-2",
          "pt-16",
          "md:pt-20",
          "md:px-4",
          "lg:px-6",
          "lg:pt-24",
          "pb-6",
          "viewport-transition"
        )}
      >
        <AnimatedOutlet />
      </main>
    </div>
  );
}

// ─── Floating Navbar ────────────────────────────────────────────────

function AdminNavBar({ isMobile }: { isMobile: boolean }) {
  const scrolled = useScrolled(10);
  const { tAdmin } = useAdminTranslation();

  return (
    <nav
      className={cn(
        "fixed",
        "inset-x-0",
        "z-40",
        "mx-auto",
        "w-full",
        "h-14",
        "md:h-16",
        "flex",
        "items-center",
        "justify-between",
        "gap-2",
        "md:gap-4",
        "px-3",
        "md:px-6",
        "py-2",
        "md:py-3",
        "transition-all",
        "duration-500",
        "ease-out",
        "safe-area-inset-top",
        // ── Scroll-based states ──
        scrolled
          ? [
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
      aria-label={tAdmin("nav.ariaLabel")}
    >
      {/* Left: Mobile menu + Logo */}
      <div className="flex items-center gap-2">
        {isMobile && <MobileAdminMenu />}
        <AdminLogo />
      </div>

      {/* Center: Desktop nav items */}
      <DesktopAdminNav scrolled={scrolled} />

      {/* Right: Actions */}
      <AdminActions />
    </nav>
  );
}

// ─── Logo ───────────────────────────────────────────────────────────

function AdminLogo() {
  const { tAdmin } = useAdminTranslation();

  return (
    <Link
      to="/admin"
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
    >
      <FairPayIcon className="w-10 h-10" />
      <span className="text-sm font-semibold hidden lg:inline">{tAdmin("common.admin")}</span>
    </Link>
  );
}

// ─── Desktop Nav Items ──────────────────────────────────────────────

function DesktopAdminNav({ scrolled }: { scrolled: boolean }) {
  const { pathname } = useLocation();
  const isMobile = useIsMobile();
  const { tAdmin } = useAdminTranslation();
  const access = useAdminAccess();
  const visibleItems = NAV_ITEMS.filter((item) => access[item.capability]);

  if (isMobile) return null;

  return (
    <TooltipProvider delayDuration={0}>
      <div className="hidden md:flex items-center gap-0.5 lg:gap-1 overflow-x-auto scrollbar-none">
        {visibleItems.map((item) => {
          const active = isActive(item.path, pathname);
          const Icon = getNavItemIcon(item, access);
          const label = getNavItemLabel(item, access, tAdmin);
          // Show label when: item is active, OR navbar is in full (not scrolled) state
          const showLabel = active || !scrolled;
          return (
            <Tooltip key={item.key}>
              <TooltipTrigger asChild>
                <Link
                  to={item.path}
                  className={cn(
                    "relative flex items-center gap-2 rounded-md",
                    "text-sm font-medium whitespace-nowrap",
                    "transition-all duration-300 ease-out",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                    active
                      ? "bg-primary/10 text-primary px-3 py-2"
                      : showLabel
                        ? "text-muted-foreground hover:text-foreground hover:bg-accent/60 px-3 py-2"
                        : "text-muted-foreground hover:text-foreground hover:bg-accent/60 p-2"
                  )}
                >
                  <Icon
                    className={cn(
                      "w-[18px] h-[18px] shrink-0 transition-colors duration-200",
                      active ? "text-primary" : "text-muted-foreground"
                    )}
                  />
                  <span
                    className={cn(
                      "inline-grid transition-all duration-300 ease-out overflow-hidden",
                      showLabel
                        ? "grid-cols-[1fr] opacity-100"
                        : "grid-cols-[0fr] opacity-0"
                    )}
                  >
                    <span className="min-w-0 overflow-hidden">{label}</span>
                  </span>
                </Link>
              </TooltipTrigger>
              {!showLabel && (
                <TooltipContent side="bottom">
                  <span className="text-xs font-medium">{label}</span>
                </TooltipContent>
              )}
            </Tooltip>
          );
        })}
      </div>
    </TooltipProvider>
  );
}

// ─── Right Actions ──────────────────────────────────────────────────

function AdminActions() {
  const { data: identity } = useGetIdentity<Profile>();
  const { tAdmin } = useAdminTranslation();

  return (
    <div className="flex items-center gap-1 md:gap-2">
      <div className="hidden sm:block">
        <ThemeSelector className="h-9 w-9 md:h-10 md:w-10" />
      </div>

      {identity && (
        <div className="flex items-center gap-2">
          <Avatar className="h-8 w-8">
            <AvatarImage src={identity.avatar_url ?? undefined} alt={identity.full_name} />
            <AvatarFallback className="text-xs">{getInitials(identity.full_name)}</AvatarFallback>
          </Avatar>
          <span className="text-sm font-medium hidden md:inline">
            {identity.full_name}
          </span>
        </div>
      )}

      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="outline" size="sm" asChild>
            <Link to="/">
              <ArrowLeftIcon className="h-4 w-4 mr-1" />
              <span className="hidden sm:inline">FairPay</span>
            </Link>
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom">
          <span className="text-xs">{tAdmin("common.backToFairPay")}</span>
        </TooltipContent>
      </Tooltip>
    </div>
  );
}

// ─── Mobile Menu ────────────────────────────────────────────────────

function MobileAdminMenu() {
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();
  const { tap } = useHaptics();
  const { tAdmin } = useAdminTranslation();
  const access = useAdminAccess();
  const visibleItems = NAV_ITEMS.filter((item) => access[item.capability]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && open) setOpen(false);
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [open]);

  const handleItemClick = useCallback(() => { tap(); setOpen(false); }, [tap]);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="flex md:hidden h-10 w-10 rounded-lg hover:bg-accent"
          aria-label={tAdmin("common.openAdminMenu")}
          aria-expanded={open}
          onClick={() => tap()}
        >
          <PanelLeftIcon className="h-5 w-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-[280px] sm:w-[320px] p-0 safe-area-inset-top">
        <SheetHeader className="p-4 border-b">
          <SheetTitle className="flex items-center gap-3">
            <FairPayIcon className="w-10 h-10" />
            <span className="text-sm font-semibold">FairPay Admin</span>
          </SheetTitle>
        </SheetHeader>

        <nav className="flex flex-col p-4 gap-1">
          {visibleItems.map((item) => {
            const active = isActive(item.path, pathname);
            const Icon = getNavItemIcon(item, access);
            const label = getNavItemLabel(item, access, tAdmin);
            return (
              <Link
                key={item.key}
                to={item.path}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-lg",
                  "text-sm font-medium",
                  "transition-all duration-200",
                  active
                    ? "bg-primary/10 text-primary"
                    : "text-foreground hover:bg-accent"
                )}
                onClick={handleItemClick}
              >
                <Icon className={cn("w-5 h-5 shrink-0", active ? "text-primary" : "text-muted-foreground")} />
                <span>{label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="absolute bottom-0 left-0 right-0 p-4 border-t bg-background">
          <Button variant="outline" className="w-full" asChild>
            <Link to="/">
              <ArrowLeftIcon className="h-4 w-4 mr-2" />
              {tAdmin("common.backToFairPay")}
            </Link>
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
