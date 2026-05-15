import { useGetIdentity } from "@refinedev/core";
import { Navigate } from "react-router";
import { toast } from "sonner";
import { useEffect, useRef } from "react";
import { Profile } from "@/modules/profile/types";
import { useAdminAccess } from "../hooks/use-admin-access";
import { Loader2Icon } from "@/components/ui/icons";
import { useAdminTranslation } from "../i18n";

interface AdminGuardProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

/**
 * Route guard that restricts access to the staff admin surface.
 * - Unauthenticated users → redirect to /login
 * - Non-staff users → redirect to / with toast
 * - Admin/moderator users → render children
 */
export function AdminGuard({ children, fallback }: AdminGuardProps) {
  const { data: identity, isLoading: identityLoading } =
    useGetIdentity<Profile>();
  const { isStaff, isLoading: adminLoading } = useAdminAccess();
  const { tAdmin } = useAdminTranslation();
  const toastShownRef = useRef(false);

  const isLoading = identityLoading || adminLoading;

  // Show toast once when non-staff is detected
  useEffect(() => {
    if (!isLoading && identity && !isStaff && !toastShownRef.current) {
      toastShownRef.current = true;
      toast.error(tAdmin("guard.accessDenied"));
    }
  }, [isLoading, identity, isStaff, tAdmin]);

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

  // Non-staff → /
  if (!isStaff) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
