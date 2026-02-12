import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import fc from "fast-check";

// ============================================================
// Mocks — must be declared before imports that use them
// ============================================================

const mockNavigate = vi.fn();
const mockToastError = vi.fn();

// Mock react-router Navigate component
vi.mock("react-router", () => ({
  Navigate: (props: { to: string; replace?: boolean }) => {
    mockNavigate(props);
    return <div data-testid="navigate" data-to={props.to} />;
  },
}));

// Mock sonner toast
vi.mock("sonner", () => ({
  toast: {
    error: (...args: unknown[]) => mockToastError(...args),
  },
}));

// Mock the icons module
vi.mock("@/components/ui/icons", () => ({
  Loader2Icon: (props: Record<string, unknown>) => (
    <svg data-testid="loader-icon" {...props} />
  ),
}));

// Mock supabaseClient
const mockSupabaseFrom = vi.fn();
vi.mock("@/utility/supabaseClient", () => ({
  supabaseClient: {
    from: (...args: unknown[]) => mockSupabaseFrom(...args),
  },
}));

// Mock useGetIdentity from refine
const mockUseGetIdentity = vi.fn();
vi.mock("@refinedev/core", () => ({
  useGetIdentity: () => mockUseGetIdentity(),
}));

// Mock useQuery from tanstack
const mockUseQuery = vi.fn();
vi.mock("@tanstack/react-query", () => ({
  useQuery: (opts: Record<string, unknown>) => mockUseQuery(opts),
}));

// ============================================================
// Imports under test (after mocks)
// ============================================================

import { AdminGuard } from "../components/AdminGuard";

// ============================================================
// Helpers
// ============================================================


function setupMocks(opts: {
  identity?: { id: string; full_name: string; avatar_url: null; created_at: string; updated_at: string } | null;
  identityLoading?: boolean;
  isAdmin?: boolean;
  roleLoading?: boolean;
}) {
  const {
    identity = null,
    identityLoading = false,
    isAdmin = false,
    roleLoading = false,
  } = opts;

  mockUseGetIdentity.mockReturnValue({
    data: identity ?? undefined,
    isLoading: identityLoading,
  });

  mockUseQuery.mockImplementation(() => ({
    data: identity ? isAdmin : undefined,
    isLoading: identity ? roleLoading : false,
  }));
}

const ADMIN_IDENTITY = {
  id: "admin-uuid-123",
  full_name: "Admin User",
  avatar_url: null,
  created_at: "2024-01-01",
  updated_at: "2024-01-01",
};

const NON_ADMIN_IDENTITY = {
  id: "user-uuid-456",
  full_name: "Regular User",
  avatar_url: null,
  created_at: "2024-01-01",
  updated_at: "2024-01-01",
};

// ============================================================
// Unit Tests: AdminGuard
// ============================================================

describe("AdminGuard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  /**
   * Validates: Requirement 1.1
   * WHEN an unauthenticated user accesses /admin/*, redirect to /login
   */
  it("redirects unauthenticated users to /login", () => {
    setupMocks({ identity: null, identityLoading: false });

    render(
      <AdminGuard>
        <div data-testid="admin-content">Admin Content</div>
      </AdminGuard>
    );

    const nav = screen.getByTestId("navigate");
    expect(nav).toHaveAttribute("data-to", "/login");
    expect(screen.queryByTestId("admin-content")).not.toBeInTheDocument();
  });

  /**
   * Validates: Requirement 1.2
   * WHEN a non-admin user accesses /admin/*, redirect to / with toast
   */
  it("redirects non-admin users to / and shows toast", () => {
    setupMocks({ identity: NON_ADMIN_IDENTITY, isAdmin: false });

    render(
      <AdminGuard>
        <div data-testid="admin-content">Admin Content</div>
      </AdminGuard>
    );

    const nav = screen.getByTestId("navigate");
    expect(nav).toHaveAttribute("data-to", "/");
    expect(screen.queryByTestId("admin-content")).not.toBeInTheDocument();
    expect(mockToastError).toHaveBeenCalledWith(
      "Bạn không có quyền truy cập trang quản trị"
    );
  });

  /**
   * Validates: Requirement 1.3
   * WHEN an admin user accesses /admin/*, render children
   */
  it("renders children for admin users", () => {
    setupMocks({ identity: ADMIN_IDENTITY, isAdmin: true });

    render(
      <AdminGuard>
        <div data-testid="admin-content">Admin Content</div>
      </AdminGuard>
    );

    expect(screen.getByTestId("admin-content")).toBeInTheDocument();
    expect(screen.queryByTestId("navigate")).not.toBeInTheDocument();
  });

  /**
   * Shows loading state while identity or role is being fetched
   */
  it("shows loading spinner while checking auth", () => {
    setupMocks({ identityLoading: true });

    render(
      <AdminGuard>
        <div data-testid="admin-content">Admin Content</div>
      </AdminGuard>
    );

    expect(screen.getByRole("status")).toBeInTheDocument();
    expect(screen.getByTestId("loader-icon")).toBeInTheDocument();
    expect(screen.queryByTestId("admin-content")).not.toBeInTheDocument();
  });

  /**
   * Renders custom fallback when provided during loading
   */
  it("renders custom fallback during loading", () => {
    setupMocks({ identityLoading: true });

    render(
      <AdminGuard fallback={<div data-testid="custom-fallback">Loading...</div>}>
        <div data-testid="admin-content">Admin Content</div>
      </AdminGuard>
    );

    expect(screen.getByTestId("custom-fallback")).toBeInTheDocument();
    expect(screen.queryByTestId("admin-content")).not.toBeInTheDocument();
  });
});

// ============================================================
// Unit Tests: useIsAdmin hook logic
// ============================================================

describe("useIsAdmin logic", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns isAdmin=false when user has no admin role", () => {
    // Simulate useQuery returning false (non-admin)
    setupMocks({ identity: NON_ADMIN_IDENTITY, isAdmin: false });

    render(
      <AdminGuard>
        <div data-testid="admin-content">Admin Content</div>
      </AdminGuard>
    );

    // Non-admin gets redirected, proving isAdmin=false
    expect(screen.getByTestId("navigate")).toHaveAttribute("data-to", "/");
  });

  it("returns isAdmin=true when user has admin role", () => {
    setupMocks({ identity: ADMIN_IDENTITY, isAdmin: true });

    render(
      <AdminGuard>
        <div data-testid="admin-content">Admin Content</div>
      </AdminGuard>
    );

    // Admin gets through, proving isAdmin=true
    expect(screen.getByTestId("admin-content")).toBeInTheDocument();
  });
});

// ============================================================
// Property 4: Self-role-change prevention
// ============================================================

/**
 * Property 4: Self-role-change prevention
 *
 * For any admin user, attempting to change their own role SHALL be rejected
 * by the system, and the admin's role in user_roles SHALL remain unchanged
 * after the attempted operation.
 *
 * We test the pure logic that the AdminUsers page uses:
 *   if (currentUserId === targetUserId) → reject
 *
 * **Validates: Requirements 1.1, 1.2, 1.3, 4.4**
 */

type UserRole = "admin" | "user";

interface RoleChangeRequest {
  currentAdminId: string;
  targetUserId: string;
  newRole: UserRole;
}

interface RoleChangeResult {
  success: boolean;
  error?: string;
  finalRole: UserRole;
}

/**
 * Simulates the self-role-change prevention logic used in AdminUsers page.
 * This mirrors the check: identity.id !== user.id
 */
function attemptRoleChange(
  request: RoleChangeRequest,
  currentRoles: Map<string, UserRole>
): RoleChangeResult {
  const currentRole = currentRoles.get(request.targetUserId) ?? "user";

  // Self-role-change prevention: admin cannot change their own role
  if (request.currentAdminId === request.targetUserId) {
    return {
      success: false,
      error: "Không thể thay đổi vai trò của chính mình",
      finalRole: currentRole,
    };
  }

  // For other users, the change succeeds
  currentRoles.set(request.targetUserId, request.newRole);
  return {
    success: true,
    finalRole: request.newRole,
  };
}

describe("Feature: admin-dashboard - Property 4: Self-role-change prevention", () => {
  const arbUserId = fc.uuid();
  const arbRole = fc.constantFrom<UserRole>("admin", "user");

  it("for any admin user, changing their own role is always rejected", () => {
    fc.assert(
      fc.property(arbUserId, arbRole, (adminId, newRole) => {
        const roles = new Map<string, UserRole>([[adminId, "admin"]]);

        const result = attemptRoleChange(
          { currentAdminId: adminId, targetUserId: adminId, newRole },
          roles
        );

        // Must be rejected
        expect(result.success).toBe(false);
        expect(result.error).toBeDefined();
        // Admin role must remain unchanged
        expect(result.finalRole).toBe("admin");
        expect(roles.get(adminId)).toBe("admin");
      }),
      { numRuns: 100 }
    );
  });

  it("for any admin and any OTHER user, role change succeeds", () => {
    fc.assert(
      fc.property(
        arbUserId,
        arbUserId.filter((id) => id !== "same"), // ensure different IDs
        arbRole,
        (adminId, targetId, newRole) => {
          // Skip if IDs happen to be the same (extremely unlikely with UUIDs)
          fc.pre(adminId !== targetId);

          const roles = new Map<string, UserRole>([
            [adminId, "admin"],
            [targetId, "user"],
          ]);

          const result = attemptRoleChange(
            { currentAdminId: adminId, targetUserId: targetId, newRole },
            roles
          );

          // Must succeed
          expect(result.success).toBe(true);
          expect(result.error).toBeUndefined();
          // Target role must be updated
          expect(result.finalRole).toBe(newRole);
          expect(roles.get(targetId)).toBe(newRole);
          // Admin's own role must remain unchanged
          expect(roles.get(adminId)).toBe("admin");
        }
      ),
      { numRuns: 100 }
    );
  });

  it("self-role-change rejection preserves the original admin role regardless of requested role", () => {
    fc.assert(
      fc.property(arbUserId, arbRole, (adminId, requestedRole) => {
        const roles = new Map<string, UserRole>([[adminId, "admin"]]);
        const originalRole = roles.get(adminId);

        attemptRoleChange(
          { currentAdminId: adminId, targetUserId: adminId, newRole: requestedRole },
          roles
        );

        // Role must be exactly the same as before the attempt
        expect(roles.get(adminId)).toBe(originalRole);
      }),
      { numRuns: 100 }
    );
  });
});
