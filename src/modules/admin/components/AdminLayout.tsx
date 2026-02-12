import { useGetIdentity } from "@refinedev/core";
import { Link, Outlet, useLocation } from "react-router";
import { Profile } from "@/modules/profile/types";
import { ThemeSelector } from "@/components/refine-ui/theme/theme-selector";
import {
  FairPayIcon,
  LayoutDashboardIcon,
  UsersIcon,
  GroupIcon,
  ReceiptIcon,
  CreditCardIcon,
  HeartHandshakeIcon,
  BellIcon,
  ScrollTextIcon,
  HeartIcon,
} from "@/components/ui/icons";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";

const SIDEBAR_ITEMS = [
  { key: "overview", label: "Overview", icon: LayoutDashboardIcon, path: "/admin" },
  { key: "users", label: "Users", icon: UsersIcon, path: "/admin/users" },
  { key: "groups", label: "Groups", icon: GroupIcon, path: "/admin/groups" },
  { key: "expenses", label: "Expenses", icon: ReceiptIcon, path: "/admin/expenses" },
  { key: "payments", label: "Payments", icon: CreditCardIcon, path: "/admin/payments" },
  { key: "friendships", label: "Friendships", icon: HeartHandshakeIcon, path: "/admin/friendships" },
  { key: "notifications", label: "Notifications", icon: BellIcon, path: "/admin/notifications" },
  { key: "audit-logs", label: "Audit Logs", icon: ScrollTextIcon, path: "/admin/audit-logs" },
  { key: "donation-settings", label: "Donation Settings", icon: HeartIcon, path: "/admin/donation-settings" },
] as const;

/** Map route segments to breadcrumb labels */
const BREADCRUMB_LABELS: Record<string, string> = {
  admin: "Admin Dashboard",
  users: "Users",
  groups: "Groups",
  expenses: "Expenses",
  payments: "Payments",
  friendships: "Friendships",
  notifications: "Notifications",
  "audit-logs": "Audit Logs",
  "donation-settings": "Donation Settings",
};

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export function AdminLayout() {
  const { pathname } = useLocation();
  const { data: identity } = useGetIdentity<Profile>();

  // Derive breadcrumb from pathname
  const segments = pathname.split("/").filter(Boolean);
  const pageSegment = segments[1]; // e.g. "users" from "/admin/users"
  const pageLabel = pageSegment ? BREADCRUMB_LABELS[pageSegment] : undefined;

  return (
    <SidebarProvider>
      <Sidebar collapsible="icon">
        {/* Sidebar Header */}
        <SidebarHeader>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton size="lg" asChild tooltip="FairPay Admin">
                <Link to="/admin">
                  <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                    <FairPayIcon size={20} />
                  </div>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-semibold">FairPay Admin</span>
                  </div>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarHeader>

        {/* Sidebar Navigation */}
        <SidebarContent>
          <SidebarGroup>
            <SidebarMenu>
              {SIDEBAR_ITEMS.map((item) => {
                const isActive =
                  item.path === "/admin"
                    ? pathname === "/admin"
                    : pathname.startsWith(item.path);

                return (
                  <SidebarMenuItem key={item.key}>
                    <SidebarMenuButton asChild isActive={isActive} tooltip={item.label}>
                      <Link to={item.path}>
                        <item.icon />
                        <span>{item.label}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroup>
        </SidebarContent>

        {/* Sidebar Footer */}
        <SidebarFooter>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarTrigger className="w-full justify-start" />
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
      </Sidebar>

      <SidebarInset>
        {/* Header Bar */}
        <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b bg-background/95 backdrop-blur-md supports-[backdrop-filter]:bg-background/60 px-4 lg:px-6">
          {/* Left: trigger + separator + breadcrumb */}
          <div className="flex items-center gap-2">
            <SidebarTrigger />
            <Separator orientation="vertical" className="h-6" />
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem>
                  {pageLabel ? (
                    <BreadcrumbLink asChild>
                      <Link to="/admin">Admin Dashboard</Link>
                    </BreadcrumbLink>
                  ) : (
                    <BreadcrumbPage>Admin Dashboard</BreadcrumbPage>
                  )}
                </BreadcrumbItem>
                {pageLabel && (
                  <>
                    <BreadcrumbSeparator />
                    <BreadcrumbItem>
                      <BreadcrumbPage>{pageLabel}</BreadcrumbPage>
                    </BreadcrumbItem>
                  </>
                )}
              </BreadcrumbList>
            </Breadcrumb>
          </div>

          {/* Right: theme toggle, avatar, back button */}
          <div className="flex items-center gap-2 ml-auto">
            <ThemeSelector />
            {identity && (
              <div className="flex items-center gap-2">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={identity.avatar_url ?? undefined} alt={identity.full_name} />
                  <AvatarFallback>{getInitials(identity.full_name)}</AvatarFallback>
                </Avatar>
                <span className="text-sm font-medium hidden md:inline">
                  {identity.full_name}
                </span>
              </div>
            )}
            <Button variant="outline" size="sm" asChild>
              <Link to="/">Quay về FairPay</Link>
            </Button>
          </div>
        </header>

        {/* Main Content */}
        <div className="flex-1 p-6">
          <Outlet />
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
