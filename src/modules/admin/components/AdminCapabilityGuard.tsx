import { Navigate } from "react-router";
import { Loader2Icon } from "@/components/ui/icons";
import { useAdminAccess } from "../hooks/use-admin-access";
import type { AdminCapabilities } from "../access";

interface AdminCapabilityGuardProps {
  capability: keyof AdminCapabilities;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function AdminCapabilityGuard({
  capability,
  children,
  fallback,
}: AdminCapabilityGuardProps) {
  const access = useAdminAccess();

  if (access.isLoading) {
    return fallback ?? (
      <div
        className="flex min-h-screen items-center justify-center"
        role="status"
        aria-live="polite"
      >
        <Loader2Icon className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!access[capability]) {
    return <Navigate to="/admin" replace />;
  }

  return <>{children}</>;
}
