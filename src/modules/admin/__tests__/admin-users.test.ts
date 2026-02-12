import { describe, it, expect } from "vitest";
import fc from "fast-check";

/**
 * Property-Based Tests for Admin User Management
 * Feature: admin-dashboard
 *
 * Property 1: Data table filtering returns only matching results (user search)
 * Property 3: Role change persists correctly
 *
 * Tests pure logic extracted from AdminUsers page — no mocks, no Supabase.
 */

// ============================================================
// Types
// ============================================================

type UserRole = "admin" | "user";

interface UserRow {
  id: string;
  full_name: string;
  email: string;
  role: UserRole;
}

// ============================================================
// Pure logic: Filtering (mirrors AdminUsers search behavior)
// ============================================================

/**
 * Filters user rows by a text search query against searchable fields.
 * Mirrors the AdminUsers page behavior: search by full_name (case-insensitive substring).
 * Extended to also search email, as the design spec says "Tìm kiếm theo tên hoặc email".
 */
function filterUsersBySearch(users: UserRow[], query: string): UserRow[] {
  if (!query.trim()) return users;
  const lowerQuery = query.toLowerCase();
  return users.filter(
    (u) =>
      u.full_name.toLowerCase().includes(lowerQuery) ||
      u.email.toLowerCase().includes(lowerQuery),
  );
}

/**
 * Filters user rows by role.
 * Mirrors the client-side role filter in AdminUsers page.
 */
function filterUsersByRole(users: UserRow[], role: string): UserRow[] {
  if (role === "all") return users;
  return users.filter((u) => u.role === role);
}

// ============================================================
// Pure logic: Role change (mirrors AdminUsers handleToggleRole)
// ============================================================

interface RoleChangeRequest {
  currentAdminId: string;
  targetUserId: string;
  newRole: UserRole;
}

interface RoleChangeResult {
  success: boolean;
  error?: string;
}

/**
 * Simulates the role change logic from AdminUsers page.
 * Applies the change to the roles map if allowed.
 */
function attemptRoleChange(
  request: RoleChangeRequest,
  roles: Map<string, UserRole>,
): RoleChangeResult {
  // Self-role-change prevention
  if (request.currentAdminId === request.targetUserId) {
    return {
      success: false,
      error: "Không thể thay đổi vai trò của chính mình",
    };
  }

  // Apply role change
  roles.set(request.targetUserId, request.newRole);
  return { success: true };
}

// ============================================================
// Arbitraries (generators)
// ============================================================

/** Generate a non-empty name string */
const arbName = fc.string({ minLength: 1, maxLength: 50 });

/** Generate an email-like string */
const arbEmail = fc
  .tuple(
    fc.stringMatching(/^[a-z0-9]{1,15}$/),
    fc.stringMatching(/^[a-z]{2,8}$/),
  )
  .map(([local, domain]) => `${local}@${domain}.com`);

/** Generate a user role */
const arbRole = fc.constantFrom<UserRole>("admin", "user");

/** Generate a UserRow */
const arbUserRow: fc.Arbitrary<UserRow> = fc
  .tuple(fc.uuid(), arbName, arbEmail, arbRole)
  .map(([id, full_name, email, role]) => ({ id, full_name, email, role }));

/** Generate a list of user rows */
const arbUserList = fc.array(arbUserRow, { minLength: 0, maxLength: 30 });

/** Generate a search query (any non-empty string) */
const arbSearchQuery = fc.string({ minLength: 1, maxLength: 20 });

// ============================================================
// Property 1: Data table filtering returns only matching results
// ============================================================

describe("Feature: admin-dashboard - Property 1: Data table filtering returns only matching results", () => {
  /**
   * **Validates: Requirements 4.2**
   *
   * For any search query, all returned rows' searchable fields
   * contain the search query as a substring (case-insensitive).
   */
  it("every filtered row contains the search query in full_name or email (case-insensitive)", () => {
    fc.assert(
      fc.property(arbUserList, arbSearchQuery, (users, query) => {
        // Skip whitespace-only queries — they are treated as "no filter"
        fc.pre(query.trim().length > 0);

        const results = filterUsersBySearch(users, query);
        const lowerQuery = query.toLowerCase();

        for (const row of results) {
          const nameMatch = row.full_name.toLowerCase().includes(lowerQuery);
          const emailMatch = row.email.toLowerCase().includes(lowerQuery);
          expect(nameMatch || emailMatch).toBe(true);
        }
      }),
      { numRuns: 100 },
    );
  });

  /**
   * **Validates: Requirements 4.2**
   *
   * Filtering never introduces rows that weren't in the original set.
   */
  it("filtered results are always a subset of the original data", () => {
    fc.assert(
      fc.property(arbUserList, arbSearchQuery, (users, query) => {
        const results = filterUsersBySearch(users, query);
        const originalIds = new Set(users.map((u) => u.id));

        for (const row of results) {
          expect(originalIds.has(row.id)).toBe(true);
        }
      }),
      { numRuns: 100 },
    );
  });

  /**
   * **Validates: Requirements 4.2**
   *
   * An empty search query returns all users (no filtering applied).
   */
  it("empty search query returns all users unchanged", () => {
    fc.assert(
      fc.property(arbUserList, (users) => {
        const results = filterUsersBySearch(users, "");
        expect(results).toEqual(users);

        const resultsWhitespace = filterUsersBySearch(users, "   ");
        expect(resultsWhitespace).toEqual(users);
      }),
      { numRuns: 100 },
    );
  });

  /**
   * **Validates: Requirements 4.2**
   *
   * Role filter returns only rows matching the selected role.
   */
  it("role filter returns only users with the matching role", () => {
    fc.assert(
      fc.property(arbUserList, arbRole, (users, role) => {
        const results = filterUsersByRole(users, role);

        for (const row of results) {
          expect(row.role).toBe(role);
        }
      }),
      { numRuns: 100 },
    );
  });

  /**
   * **Validates: Requirements 4.2**
   *
   * Role filter "all" returns all users.
   */
  it("role filter 'all' returns all users unchanged", () => {
    fc.assert(
      fc.property(arbUserList, (users) => {
        const results = filterUsersByRole(users, "all");
        expect(results).toEqual(users);
      }),
      { numRuns: 100 },
    );
  });
});

// ============================================================
// Property 3: Role change persists correctly
// ============================================================

describe("Feature: admin-dashboard - Property 3: Role change persists correctly", () => {
  /**
   * **Validates: Requirements 4.3**
   *
   * For any user (other than current admin) and any valid role value
   * ('admin' or 'user'), after changing that user's role, querying
   * user_roles SHALL return the newly assigned role.
   */
  it("after a successful role change, the target user's role matches the new role", () => {
    fc.assert(
      fc.property(
        fc.uuid(),
        fc.uuid(),
        arbRole,
        arbRole,
        (adminId, targetId, originalRole, newRole) => {
          fc.pre(adminId !== targetId);

          const roles = new Map<string, UserRole>([
            [adminId, "admin"],
            [targetId, originalRole],
          ]);

          const result = attemptRoleChange(
            { currentAdminId: adminId, targetUserId: targetId, newRole },
            roles,
          );

          expect(result.success).toBe(true);
          expect(roles.get(targetId)).toBe(newRole);
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * **Validates: Requirements 4.3**
   *
   * Role change does not affect the admin's own role.
   */
  it("role change on another user does not modify the admin's role", () => {
    fc.assert(
      fc.property(
        fc.uuid(),
        fc.uuid(),
        arbRole,
        (adminId, targetId, newRole) => {
          fc.pre(adminId !== targetId);

          const roles = new Map<string, UserRole>([
            [adminId, "admin"],
            [targetId, "user"],
          ]);

          attemptRoleChange(
            { currentAdminId: adminId, targetUserId: targetId, newRole },
            roles,
          );

          expect(roles.get(adminId)).toBe("admin");
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * **Validates: Requirements 4.3, 4.4**
   *
   * Self-role-change is always rejected and the role remains unchanged.
   */
  it("self-role-change is rejected and role remains unchanged", () => {
    fc.assert(
      fc.property(fc.uuid(), arbRole, (adminId, newRole) => {
        const roles = new Map<string, UserRole>([[adminId, "admin"]]);

        const result = attemptRoleChange(
          { currentAdminId: adminId, targetUserId: adminId, newRole },
          roles,
        );

        expect(result.success).toBe(false);
        expect(result.error).toBeDefined();
        expect(roles.get(adminId)).toBe("admin");
      }),
      { numRuns: 100 },
    );
  });

  /**
   * **Validates: Requirements 4.3**
   *
   * Multiple consecutive role changes on the same user always reflect
   * the last assigned role.
   */
  it("consecutive role changes always reflect the last assigned value", () => {
    fc.assert(
      fc.property(
        fc.uuid(),
        fc.uuid(),
        fc.array(arbRole, { minLength: 1, maxLength: 10 }),
        (adminId, targetId, roleSequence) => {
          fc.pre(adminId !== targetId);

          const roles = new Map<string, UserRole>([
            [adminId, "admin"],
            [targetId, "user"],
          ]);

          for (const role of roleSequence) {
            attemptRoleChange(
              { currentAdminId: adminId, targetUserId: targetId, newRole: role },
              roles,
            );
          }

          const lastRole = roleSequence[roleSequence.length - 1];
          expect(roles.get(targetId)).toBe(lastRole);
        },
      ),
      { numRuns: 100 },
    );
  });
});
