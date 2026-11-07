"use client";

import { useMemo, useSyncExternalStore } from "react";
import { Link, useLocation } from "react-router";
import { useTranslation } from "react-i18next";
import { useGetIdentity } from "@refinedev/core";
import { motion } from "framer-motion";
import {
  HomeIcon,
  UsersIcon,
  PlusIcon,
  BanknoteIcon,
  UserIcon,
} from "@/components/ui/icons";
import type { Profile } from "@/modules/profile/types";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import { cn } from "@/lib/utils";
import { benchoTokenStyle } from "@/components/bencho";
import { FAB_BOTTOM_BASE_REM } from "@/lib/floating-tokens";

const navItems = [
  { to: "/", icon: HomeIcon, labelKey: "nav.home", fallback: "Home" },
  {
    to: "/connections",
    icon: UsersIcon,
    labelKey: "nav.connections",
    fallback: "Connections",
  },
  {
    to: "/balances",
    icon: BanknoteIcon,
    labelKey: "nav.insightsShort",
    fallback: "Insights",
  },
] as const;

const profileNavItem = {
  icon: UserIcon,
  labelKey: "nav.profile",
  fallback: "Profile",
} as const;

const MOBILE_NAV_DRAWER_CLASS = "mobile-nav-drawer-open";

const TAB_SPRING = { type: "spring" as const, stiffness: 420, damping: 32 };

function subscribeMobileNavDrawer(onStoreChange: () => void) {
  const observer = new MutationObserver(onStoreChange);
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["class"],
  });
  return () => observer.disconnect();
}

function getMobileNavDrawerOpen() {
  return document.documentElement.classList.contains(MOBILE_NAV_DRAWER_CLASS);
}

type NavTabProps = {
  to: string;
  icon: (typeof navItems)[number]["icon"];
  active: boolean;
  label: string;
};

function BottomNavTab({
  to,
  icon: Icon,
  active,
  label,
}: NavTabProps) {
  const reducedMotion = useReducedMotion();

  return (
    <Link
      to={to}
      aria-current={active ? "page" : undefined}
      className={cn(
        "relative flex min-h-11 min-w-0 flex-col items-center justify-center gap-0.5 px-0.5 py-1 text-[10px] leading-tight",
        "transition-colors duration-200",
        active ? "text-primary font-medium" : "text-muted-foreground",
      )}
    >
      {active ? (
        reducedMotion ? (
          <span
            className="absolute inset-x-0.5 inset-y-0 rounded-[14px] bg-primary/12 dark:bg-primary/18"
            aria-hidden
          />
        ) : (
          <motion.span
            layoutId="client-bottom-nav-pill"
            className="absolute inset-x-0.5 inset-y-0 rounded-[14px] bg-primary/12 dark:bg-primary/18"
            transition={TAB_SPRING}
            aria-hidden
          />
        )
      ) : null}
      <motion.span
        className="relative z-10 flex flex-col items-center justify-center gap-0.5"
        animate={
          reducedMotion
            ? undefined
            : {
                scale: active ? 1 : 0.94,
              }
        }
        transition={reducedMotion ? undefined : TAB_SPRING}
      >
        <Icon
          className={cn(
            "size-5 shrink-0 transition-transform duration-200",
            active && "scale-105",
          )}
          aria-hidden
        />
        <span className="truncate max-w-full text-center">{label}</span>
      </motion.span>
    </Link>
  );
}

export function ClientBottomNav() {
  const { pathname } = useLocation();
  const { t } = useTranslation();
  const { data: identity } = useGetIdentity<Profile>();
  const profileTo = identity?.id ? `/profile/${identity.id}` : null;
  const trailingNavItems = useMemo(() => {
    const items: Array<
      (typeof navItems)[number] | (typeof profileNavItem & { to: string })
    > = [...navItems.slice(2)];
    if (profileTo) {
      items.push({ ...profileNavItem, to: profileTo });
    }
    return items;
  }, [profileTo]);
  const mobileNavDrawerOpen = useSyncExternalStore(
    subscribeMobileNavDrawer,
    getMobileNavDrawerOpen,
    () => false,
  );

  const isActive = (to: string) => {
    if (to === "/") return pathname === "/" || pathname.startsWith("/debts");
    return pathname === to || pathname.startsWith(`${to}/`);
  };

  return (
    <nav
      aria-label={t("header.mainNav", "Main navigation")}
      aria-hidden={mobileNavDrawerOpen || undefined}
      style={{
        ...benchoTokenStyle,
        /* keep mobile chrome clearance aligned with FAB_RIGHT_STACK base */
        ["--mobile-fab-clearance" as string]: `${FAB_BOTTOM_BASE_REM.mobile}rem`,
      }}
      className={cn(
        "fixed bottom-0 left-0 right-0 z-30 grid md:hidden w-full max-w-[100dvw] grid-cols-5 items-end",
        "border-t border-border/40 border-white/20 dark:border-white/10",
        "bg-background/72 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60",
        "shadow-[0_-1px_0_0_rgba(255,255,255,0.08)_inset]",
        "pb-[env(safe-area-inset-bottom)] pt-3 px-1",
        mobileNavDrawerOpen && "pointer-events-none invisible",
      )}
    >
      {navItems.slice(0, 2).map((item) => (
        <BottomNavTab
          key={item.to}
          {...item}
          active={isActive(item.to)}
          label={t(item.labelKey, item.fallback)}
        />
      ))}

      <div className="flex min-h-11 flex-col items-center justify-end pb-0.5">
        <Link
          to="/expenses/create"
          aria-label={t("nav.addExpense", "Add expense")}
          className={cn(
            "flex size-12 shrink-0 items-center justify-center rounded-full",
            "bg-primary text-primary-foreground shadow-lg shadow-primary/25",
            "ring-[3px] ring-background/90 dark:ring-background/70",
            "transition-[transform,box-shadow] duration-200 ease-out",
            "hover:shadow-xl hover:shadow-primary/30",
            "active:scale-95",
          )}
        >
          <PlusIcon className="size-6 shrink-0" aria-hidden />
        </Link>
      </div>

      {trailingNavItems.map((item) => (
        <BottomNavTab
          key={item.to}
          {...item}
          active={isActive(item.to)}
          label={t(item.labelKey, item.fallback)}
        />
      ))}
    </nav>
  );
}

ClientBottomNav.displayName = "ClientBottomNav";
