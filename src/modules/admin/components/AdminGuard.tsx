import { useGetIdentity } from "@refinedev/core";
import { Navigate } from "react-router";
import { toast } from "sonner";
import { useEffect, useRef } from "react";
import { Profile } from "@/modules/profile/types";
import { useIsAdmin } from "../hooks/use-is-admin";
import { Loader2Icon } from "@/components/ui/icons";

interface AdminGuardProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

/**
 * Route guard that restricts access to admin-only routes.
 * - Unauthenticated users → redirect to /login
 * - Non-admin users → redirect to / with toast
 * - Admin users → render children
 */
export function AdminGuard({ children, fallback }: AdminGuardProps) {
  const { data: identity, isLoading: identityLoading } =
    useGetIdentity<Profile>();
  const { isAdmin, isLoading: adminLoading } = useIsAdmin();
  const toastShownRef = useRef(false);

  const isLoading = identityLoading || adminLoading;

  // Show toast once when non-admin is detected
  useEffect(() => {
    if (!isLoading && identity && !isAdmin && !toastShownRef.current) {
      toastShownRef.current = true;
      toast.error("Bạn không có quyền truy cập trang quản trị");
    }
  }, [isLoading, identity, isAdmin]);

  if (isLoading) {
    return fallback ?? (
      <div
        className="flex items-center justify-center min-h-screen"
        role="status"
        aria-live="polite"
      >
        <Loader2Icon className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Unauthenticated → /login
  if (!identity) {
    return <Navigate to="/login" replace />;
  }

  // Non-admin → /
  if (!isAdmin) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
