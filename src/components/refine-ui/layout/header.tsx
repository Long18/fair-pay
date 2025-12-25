import { useState } from "react";
import { UserAvatar } from "@/components/refine-ui/layout/user-avatar";
import { ThemeToggle } from "@/components/refine-ui/theme/theme-toggle";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
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
import { LogOutIcon, UserIcon, Search } from "lucide-react";
import { NotificationPanel } from "@/modules/notifications";
import { SearchModal, useSearchShortcut } from "@/components/global-search";
import { Profile } from "@/modules/profile/types";

export const Header = () => {
  const { isMobile } = useSidebar();

  return <>{isMobile ? <MobileHeader /> : <DesktopHeader />}</>;
};

function DesktopHeader() {
  const [searchOpen, setSearchOpen] = useState(false);
  const { data: identity } = useGetIdentity<Profile>();

  useSearchShortcut(() => setSearchOpen(true));

  return (
    <>
      <header
        className={cn(
          "sticky",
          "top-0",
          "flex",
          "h-[94px]",
          "shrink-0",
          "items-center",
          "gap-4",
          "border-b",
          "border-[#E0E0E0]",
          "bg-white",
          "px-8",
          "justify-between",
          "z-40"
        )}
      >
        <div className="flex items-center gap-4 flex-1">
          {identity && (
            <div className="flex items-center gap-3 px-4 py-2 border border-[#E0E0E0]/20 rounded-[10px] bg-[#E0E0E0]/15">
              <div className="w-14 h-14 rounded-lg overflow-hidden bg-gray-200">
                {identity.avatar_url ? (
                  <img
                    src={identity.avatar_url}
                    alt={identity.full_name || "User"}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-500 font-semibold">
                    {identity.full_name?.charAt(0) || "U"}
                  </div>
                )}
              </div>
              <div className="flex flex-col">
                <span className="text-xs font-semibold text-[#828282]">
                  {identity.full_name || "User"}
                </span>
                <span className="text-[10px] font-medium text-[#BDBDBD]">
                  ID: {identity.id.slice(0, 7)}
                </span>
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-md">
            <Button
              variant="ghost"
              className="w-full justify-start text-[#BBB] bg-[#FCFCFC] rounded-[50px] h-14 px-6 hover:bg-[#F9F9F9]"
              onClick={() => setSearchOpen(true)}
            >
              <Search className="h-5 w-5 mr-3" />
              <span className="text-base">Search</span>
            </Button>
          </div>

          <div className="flex items-center gap-1">
            <div className="flex items-center gap-2 px-4 h-14 border border-[rgba(189,189,189,0.2)] rounded-[50px] cursor-pointer hover:bg-[#F9F9F9]">
              <span className="text-base text-[#828282]">English</span>
              <svg width="13" height="7" viewBox="0 0 13 7" fill="none">
                <path d="M1 1L6.5 6L12 1" stroke="#828282" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>

            <div className="relative">
              <NotificationPanel />
            </div>

            <UserDropdown />
          </div>
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

  useSearchShortcut(() => setSearchOpen(true));

  return (
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

      <div
        className={cn(
          "whitespace-nowrap",
          "flex",
          "flex-row",
          "h-full",
          "items-center",
          "justify-start",
          "gap-2",
          "transition-discrete",
          "duration-200",
          {
            "pl-3": !open,
            "pl-5": open,
          }
        )}
      >
        <div>{title.icon}</div>
        <h2
          className={cn(
            "text-sm",
            "font-bold",
            "transition-opacity",
            "duration-200",
            {
              "opacity-0": !open,
              "opacity-100": open,
            }
          )}
        >
          {title.text}
        </h2>
      </div>

      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => setSearchOpen(true)}
          aria-label="Search"
        >
          <Search className="h-4 w-4" />
        </Button>
        <NotificationPanel />
        <ThemeToggle className={cn("h-8", "w-8")} />
      </div>
      <SearchModal open={searchOpen} onOpenChange={setSearchOpen} />
    </header>
  );
}

const UserDropdown = () => {
  const { data: identity } = useGetIdentity<Profile>();
  const { mutate: logout, isPending: isLoggingOut } = useLogout();
  const go = useGo();

  const authProvider = useActiveAuthProvider();

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
        Login
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger>
        <UserAvatar />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem
          onClick={() => {
            go({ to: "/profile/edit" });
          }}
        >
          <UserIcon />
          <span>Edit Profile</span>
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => {
            logout();
          }}
        >
          <LogOutIcon
            className={cn("text-destructive", "hover:text-destructive")}
          />
          <span className={cn("text-destructive", "hover:text-destructive")}>
            {isLoggingOut ? "Logging out..." : "Logout"}
          </span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

Header.displayName = "Header";
MobileHeader.displayName = "MobileHeader";
DesktopHeader.displayName = "DesktopHeader";
