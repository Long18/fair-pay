"use client";

import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sidebar as ShadcnSidebar,
  SidebarContent as ShadcnSidebarContent,
  SidebarHeader as ShadcnSidebarHeader,
  SidebarRail as ShadcnSidebarRail,
  SidebarTrigger as ShadcnSidebarTrigger,
  useSidebar as useShadcnSidebar,
} from "@/components/ui/sidebar";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import {
  useLink,
  useMenu,
  useRefineOptions,
  type TreeMenuItem,
} from "@refinedev/core";
import { ChevronRight, ListIcon } from "lucide-react";
import React from "react";
import { useTranslation } from "react-i18next";
import { FairPayIcon } from "@/components/ui/icons";

export function Sidebar() {
  const { open } = useShadcnSidebar();
  const { menuItems, selectedKey } = useMenu();

  return (
    <ShadcnSidebar
      collapsible="icon"
      className={cn("border-none bg-background shadow-sm", {
        "w-16": !open,
      })}
    >
      <ShadcnSidebarRail />
      <SidebarHeader />
      <ShadcnSidebarContent
        className={cn(
          "transition-discrete duration-200 flex flex-col gap-1 pt-4 pb-2 border-r",
          {
            "px-3": open,
            "px-1 items-center": !open,
          }
        )}
      >
        <TooltipProvider delayDuration={0}>
          {menuItems.map((item: TreeMenuItem) => (
            <SidebarItem
              key={item.key || item.name}
              item={item}
              selectedKey={selectedKey}
            />
          ))}
        </TooltipProvider>
      </ShadcnSidebarContent>
    </ShadcnSidebar>
  );
}

type MenuItemProps = {
  item: TreeMenuItem;
  selectedKey?: string;
};

function SidebarItem({ item, selectedKey }: MenuItemProps) {
  const { open } = useShadcnSidebar();

  if (item.meta?.group) {
    return <SidebarItemGroup item={item} selectedKey={selectedKey} />;
  }

  if (item.children && item.children.length > 0) {
    if (open) {
      return <SidebarItemCollapsible item={item} selectedKey={selectedKey} />;
    }
    return <SidebarItemDropdown item={item} selectedKey={selectedKey} />;
  }

  return <SidebarItemLink item={item} selectedKey={selectedKey} />;
}

function SidebarItemGroup({ item, selectedKey }: MenuItemProps) {
  const { children } = item;
  const { open } = useShadcnSidebar();

  return (
    <div className={cn("border-t", "border-sidebar-border", "pt-4", "mt-2")}>
      <span
        className={cn(
          "ml-3",
          "block",
          "text-xs",
          "font-semibold",
          "uppercase",
          "text-muted-foreground",
          "transition-all",
          "duration-200",
          {
            "h-8": open,
            "h-0": !open,
            "opacity-0": !open,
            "opacity-100": open,
            "pointer-events-none": !open,
            "pointer-events-auto": open,
          }
        )}
      >
        {getDisplayName(item)}
      </span>
      {children && children.length > 0 && (
        <div className={cn("flex", "flex-col")}>
          {children.map((child: TreeMenuItem) => (
            <SidebarItem
              key={child.key || child.name}
              item={child}
              selectedKey={selectedKey}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function SidebarItemCollapsible({ item, selectedKey }: MenuItemProps) {
  const { name, children } = item;

  const chevronIcon = (
    <ChevronRight
      className={cn(
        "h-4",
        "w-4",
        "shrink-0",
        "text-muted-foreground",
        "transition-transform",
        "duration-200",
        "group-data-[state=open]:rotate-90"
      )}
    />
  );

  return (
    <Collapsible key={`collapsible-${name}`} className={cn("w-full", "group")}>
      <CollapsibleTrigger asChild>
        <SidebarButton item={item} rightIcon={chevronIcon} />
      </CollapsibleTrigger>
      <CollapsibleContent className={cn("ml-6", "flex", "flex-col", "gap-2")}>
        {children?.map((child: TreeMenuItem) => (
          <SidebarItem
            key={child.key || child.name}
            item={child}
            selectedKey={selectedKey}
          />
        ))}
      </CollapsibleContent>
    </Collapsible>
  );
}

function SidebarItemDropdown({ item, selectedKey }: MenuItemProps) {
  const { children } = item;
  const Link = useLink();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <SidebarButton item={item} />
      </DropdownMenuTrigger>
      <DropdownMenuContent side="right" align="start">
        {children?.map((child: TreeMenuItem) => {
          const { key: childKey } = child;
          const isSelected = childKey === selectedKey;

          return (
            <DropdownMenuItem key={childKey || child.name} asChild>
              <Link
                to={child.route || ""}
                className={cn("flex w-full items-center gap-2", {
                  "bg-accent text-accent-foreground": isSelected,
                })}
              >
                <ItemIcon
                  icon={child.meta?.icon ?? child.icon}
                  isSelected={isSelected}
                />
                <span>{getDisplayName(child)}</span>
              </Link>
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function SidebarItemLink({ item, selectedKey }: MenuItemProps) {
  const isSelected = item.key === selectedKey;
  const { open } = useShadcnSidebar();

  if (!open) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <SidebarButton item={item} isSelected={isSelected} asLink={true} />
        </TooltipTrigger>
        <TooltipContent side="right" className="font-medium text-xs">
          {getDisplayName(item)}
        </TooltipContent>
      </Tooltip>
    );
  }

  return <SidebarButton item={item} isSelected={isSelected} asLink={true} />;
}

function SidebarHeader() {
  const { open, isMobile } = useShadcnSidebar();

  return (
    <ShadcnSidebarHeader
      className={cn(
        "p-0 h-16 border-b flex-row items-center overflow-hidden",
        {
          "justify-between": open,
          "justify-center": !open,
        }
      )}
    >
      <div
        className={cn(
          "whitespace-nowrap flex flex-row h-full items-center gap-3 transition-discrete duration-200",
          {
            "pl-5 justify-start": open,
            "justify-center": !open,
          }
        )}
      >
        <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-primary-foreground font-bold shadow-sm">
          <FairPayIcon className="w-5 h-5" />
        </div>
        <h1
          className={cn(
            "text-xl font-bold transition-opacity duration-200",
            {
              "opacity-0": !open,
              "opacity-100": open,
            }
          )}
        >
          FairPay
        </h1>
      </div>

      {open && (
        <ShadcnSidebarTrigger
          className={cn("text-muted-foreground mr-1.5", {
            "opacity-100": open || isMobile,
            "pointer-events-auto": open || isMobile,
          })}
        />
      )}
    </ShadcnSidebarHeader>
  );
}

function getDisplayName(item: TreeMenuItem) {
  const { t } = useTranslation();
  const label = item.meta?.label ?? item.label ?? item.name;

  // Map resource names to translation keys
  const translationMap: Record<string, string> = {
    'Dashboard': 'dashboard.title',
    'Groups': 'groups.title',
    'Friends': 'friends.title',
    'Balances': 'balances.title',
    'Reports': 'reports.title',
    'Settings': 'settings.title',
  };

  return translationMap[label] ? t(translationMap[label]) : label;
}

type IconProps = {
  icon: React.ReactNode;
  isSelected?: boolean;
};

function ItemIcon({ icon, isSelected }: IconProps) {
  return (
    <div
      className={cn("w-5 h-5", {
        "text-muted-foreground": !isSelected,
        "text-primary": isSelected,
      })}
    >
      {icon ?? <ListIcon />}
    </div>
  );
}

type SidebarButtonProps = React.ComponentProps<typeof Button> & {
  item: TreeMenuItem;
  isSelected?: boolean;
  rightIcon?: React.ReactNode;
  asLink?: boolean;
  onClick?: () => void;
};

function SidebarButton({
  item,
  isSelected = false,
  rightIcon,
  asLink = false,
  className,
  onClick,
  ...props
}: SidebarButtonProps) {
  const Link = useLink();
  const { open } = useShadcnSidebar();

  const buttonContent = (
    <>
      <ItemIcon icon={item.meta?.icon ?? item.icon} isSelected={isSelected} />
      {open && (
        <>
          <span
            className={cn("text-sm font-medium", {
              "flex-1": rightIcon,
              "text-left": rightIcon,
              "line-clamp-1": !rightIcon,
              truncate: !rightIcon,
              "text-muted-foreground": !isSelected,
              "text-foreground": isSelected,
            })}
          >
            {getDisplayName(item)}
          </span>
          {rightIcon}
        </>
      )}
    </>
  );

  return (
    <Button
      asChild={!!(asLink && item.route)}
      variant={isSelected ? "secondary" : "ghost"}
      size={open ? "lg" : "icon"}
      className={cn(
        "rounded-lg transition-all",
        {
          "flex w-full items-center justify-start gap-3 py-2.5 px-3 h-auto": open,
          "h-10 w-10": !open,
          "bg-accent text-accent-foreground shadow-sm": isSelected,
          "hover:bg-accent": !isSelected,
        },
        className
      )}
      onClick={onClick}
      {...props}
    >
      {asLink && item.route ? (
        <Link to={item.route} className={cn("flex items-center", {
          "w-full gap-3": open,
        })}>
          {buttonContent}
        </Link>
      ) : (
        buttonContent
      )}
    </Button>
  );
}

Sidebar.displayName = "Sidebar";
