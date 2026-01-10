import { Link } from "react-router";
import { cn } from "@/lib/utils";
import { HomeIcon, ChevronRightIcon } from "@/components/ui/icons";
import { Fragment } from "react";

interface BreadcrumbItem {
  label: string;
  href?: string;
  icon?: React.ReactNode;
}

interface BreadcrumbProps {
  items?: BreadcrumbItem[];
  className?: string;
}

export const Breadcrumb = ({ items = [], className }: BreadcrumbProps) => {
  if (items.length === 0) return null;
  return (
    <nav
      aria-label="Breadcrumb"
      className={cn(
        "hidden md:flex items-center gap-2 text-sm text-muted-foreground",
        className
      )}
    >
      {items.map((item, index) => {
        const isLast = index === items.length - 1;

        return (
          <Fragment key={index}>
            {index > 0 && (
              <ChevronRightIcon className="h-4 w-4 shrink-0" />
            )}
            {item.href && !isLast ? (
              <Link
                to={item.href}
                className="flex items-center gap-1.5 hover:text-foreground transition-colors"
              >
                {item.icon}
                <span>{item.label}</span>
              </Link>
            ) : (
              <span
                className={cn(
                  "flex items-center gap-1.5",
                  isLast && "text-foreground font-medium"
                )}
              >
                {item.icon}
                <span>{item.label}</span>
              </span>
            )}
          </Fragment>
        );
      })}
    </nav>
  );
};

// Helper function to create common breadcrumb patterns
export const createBreadcrumbs = {
  home: (): BreadcrumbItem => ({
    label: "Home",
    href: "/",
    icon: <HomeIcon className="h-4 w-4" />,
  }),
  
  friends: (): BreadcrumbItem => ({
    label: "Friends",
    href: "/friends",
  }),
  
  friendDetail: (name: string): BreadcrumbItem => ({
    label: name,
  }),
  
  groups: (): BreadcrumbItem => ({
    label: "Groups",
    href: "/groups",
  }),
  
  groupDetail: (name: string): BreadcrumbItem => ({
    label: name,
  }),
  
  profile: (): BreadcrumbItem => ({
    label: "Profile",
    href: "/profile",
  }),
  
  editProfile: (): BreadcrumbItem => ({
    label: "Edit Profile",
  }),
};
