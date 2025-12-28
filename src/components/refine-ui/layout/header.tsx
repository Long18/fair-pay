import { useState } from "react";
import { useTranslation } from "react-i18next";
import { UserAvatar } from "@/components/refine-ui/layout/user-avatar";
import { ThemeToggle } from "@/components/refine-ui/theme/theme-toggle";
import { LanguageToggle } from "@/components/ui/language-toggle";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { SidebarTrigger, useSidebar } from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";
import {
  useActiveAuthProvider,
  useLogout,
  useRefineOptions,
  useGo,
  useGetIdentity,
} from "@refinedev/core";
import { NotificationPanel } from "@/modules/notifications";
import { SearchModal, useSearchShortcut } from "@/components/global-search";
import { Profile } from "@/modules/profile/types";

import { LogOutIcon, UserIcon, SearchIcon, SettingsIcon, HeartIcon } from "@/components/ui/icons";
export const Header = () => {
  const { isMobile } = useSidebar();

  return <>{isMobile ? <MobileHeader /> : <DesktopHeader />}</>;
};

function DesktopHeader() {
  const [searchOpen, setSearchOpen] = useState(false);
  const { data: identity } = useGetIdentity<Profile>();
  const { t } = useTranslation();

  useSearchShortcut(() => setSearchOpen(true));

  const firstName = identity?.full_name?.split(" ")[0];

  return (
    <>
      <header
        className={cn(
          "sticky",
          "top-0",
          "flex",
          "h-16",
          "shrink-0",
          "items-center",
          "gap-4",
          "border-b",
          "bg-background/95",
          "backdrop-blur-sm",
          "px-6",
          "justify-between",
          "z-40"
        )}
      >
        <div className="flex flex-col justify-center">
          <h1 className="text-lg font-semibold tracking-tight leading-none">{t('dashboard.title')}</h1>
          <span className="text-xs text-muted-foreground mt-1">
            {firstName
              ? t('header.welcomeBack', { name: firstName })
              : t('header.welcomeGuest')
            }
          </span>
        </div>

        <div className="hidden md:flex items-center space-x-2 flex-1 max-w-md mx-8">
          <div className="relative w-full">
            <Button
              variant="ghost"
              className="w-full justify-start text-muted-foreground bg-muted/50 rounded-full h-9 px-5 hover:bg-muted/80 border-none"
              onClick={() => setSearchOpen(true)}
            >
              <SearchIcon className="h-4 w-4 mr-2" />
              <span className="text-sm">{t('header.search')}</span>
            </Button>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <ThemeToggle />
          <LanguageToggle />

          <div className="relative">
            <NotificationPanel />
          </div>

          <UserDropdown />
        </div>
      </header>
      <SearchModal open={searchOpen} onOpenChange={setSearchOpen} />
    </>
  );
}

function MobileHeader() {
  const { open, isMobile } = useSidebar();
  const { title } = useRefineOptions();
  const [searchOpen, setSearchOpen] = useState(false);
  const { data: identity } = useGetIdentity<Profile>();
  const { t } = useTranslation();

  useSearchShortcut(() => setSearchOpen(true));

  const firstName = identity?.full_name?.split(" ")[0];

  return (
    <>
      <header
        className={cn(
          "sticky",
          "top-0",
          "flex",
          "h-12",
          "shrink-0",
          "items-center",
          "gap-2",
          "border-b",
          "border-border",
          "bg-sidebar",
          "pr-3",
          "justify-between",
          "z-40"
        )}
      >
        <SidebarTrigger
          className={cn("text-muted-foreground", "rotate-180", "ml-1", {
            "opacity-0": open,
            "opacity-100": !open || isMobile,
            "pointer-events-auto": !open || isMobile,
            "pointer-events-none": open && !isMobile,
          })}
        />

        <div className="flex flex-col justify-center flex-1 min-w-0 px-2">
          <h1 className="text-sm font-semibold tracking-tight leading-none truncate">
            {t('dashboard.title')}
          </h1>
          <span className="text-xs text-muted-foreground mt-0.5 truncate">
            {firstName
              ? t('header.welcomeBack', { name: firstName })
              : t('header.welcomeGuest')
            }
          </span>
        </div>

        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => setSearchOpen(true)}
            aria-label="Search"
          >
            <SearchIcon className="h-4 w-4" />
          </Button>
          <NotificationPanel />
          <ThemeToggle className={cn("h-8", "w-8")} />
          <LanguageToggle className={cn("h-8", "w-8")} />
          <UserDropdown />
        </div>
      </header>
      <SearchModal open={searchOpen} onOpenChange={setSearchOpen} />
    </>
  );
}

const UserDropdown = () => {
  const { t } = useTranslation();
  const { data: identity } = useGetIdentity<Profile>();
  const { mutate: logout, isPending: isLoggingOut } = useLogout();
  const go = useGo();

  const authProvider = useActiveAuthProvider();

  // Check if user is admin
  const isAdmin = identity?.email === import.meta.env.VITE_ADMIN_EMAIL;

  if (!authProvider?.getIdentity) {
    return null;
  }

  // Show Login button for unauthenticated users
  if (!identity) {
    return (
      <Button
        variant="default"
        size="sm"
        onClick={() => go({ to: "/login" })}
      >
        {t('auth.login')}
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex items-center gap-3 outline-none hover:opacity-80 transition-opacity">
        <div className="hidden md:flex flex-col items-end">
          <span className="text-sm font-semibold text-foreground">
            {identity.full_name || "User"}
          </span>
          <span className="text-xs text-muted-foreground">
            {identity.id.slice(0, 8)}
          </span>
        </div>
        <UserAvatar />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <div className="flex flex-col gap-1 px-2 py-2 md:hidden border-b border-border mb-1">
          <span className="text-sm font-semibold text-foreground">
            {identity.full_name || "User"}
          </span>
          <span className="text-xs text-muted-foreground">
            ID: {identity.id.slice(0, 8)}
          </span>
        </div>
        <DropdownMenuItem
          onClick={() => {
            go({ to: "/profile/edit" });
          }}
        >
          <UserIcon className="h-4 w-4" />
          <span>{t('auth.editProfile')}</span>
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => {
            go({ to: "/settings" });
          }}
        >
          <SettingsIcon className="h-4 w-4" />
          <span>{t('settings.title')}</span>
        </DropdownMenuItem>
        {isAdmin && (
          <DropdownMenuItem
            onClick={() => {
              go({ to: "/settings/donation" });
            }}
          >
            <HeartIcon className="h-4 w-4" />
            <span>{t('settings.donationSetup')}</span>
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => {
            logout();
          }}
        >
          <LogOutIcon
            className={cn("h-4 w-4", "text-destructive", "hover:text-destructive")}
          />
          <span className={cn("text-destructive", "hover:text-destructive")}>
            {isLoggingOut ? t('auth.loggingOut') : t('auth.logout')}
          </span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

Header.displayName = "Header";
MobileHeader.displayName = "MobileHeader";
DesktopHeader.displayName = "DesktopHeader";
