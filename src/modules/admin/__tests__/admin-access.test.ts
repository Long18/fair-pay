import { describe, expect, it } from "vitest";
import { getAdminCapabilities, normalizeAppRole } from "../access";

describe("admin capability matrix", () => {
  it("keeps admins fully privileged", () => {
    const access = getAdminCapabilities("admin");

    expect(access.canEnterAdmin).toBe(true);
    expect(access.canManagePeople).toBe(true);
    expect(access.canDeleteTransactions).toBe(true);
    expect(access.canViewTracking).toBe(true);
    expect(access.canViewAuditLogs).toBe(true);
    expect(access.canUseDevtool).toBe(true);
    expect(access.canModerateContent).toBe(true);
    expect(access.canAccessDevTool).toBe(true);
  });

  it("gives moderators only the approved staff surface", () => {
    const access = getAdminCapabilities("moderator");

    expect(access.canEnterAdmin).toBe(true);
    expect(access.canViewOverview).toBe(true);
    expect(access.canViewPeople).toBe(true);
    expect(access.canEditPeopleBasics).toBe(true);
    expect(access.canViewTransactions).toBe(true);
    expect(access.canManageOwnTransactions).toBe(true);
    expect(access.canViewGroups).toBe(true);
    expect(access.canManageReactions).toBe(true);
    expect(access.canModerateContent).toBe(true);
    expect(access.canAccessDevTool).toBe(true);
    expect(access.canDeleteTransactions).toBe(false);
    expect(access.canManagePeople).toBe(false);
    expect(access.canManageGroups).toBe(false);
    expect(access.canViewTracking).toBe(false);
    expect(access.canViewAuditLogs).toBe(false);
    expect(access.canUseDevtool).toBe(false);
  });

  it("keeps users outside the staff surface", () => {
    const access = getAdminCapabilities("user");

    expect(access.canEnterAdmin).toBe(false);
    expect(Object.values(access).every((value) => value === false)).toBe(true);
  });

  it("normalizes unknown roles to user", () => {
    expect(normalizeAppRole("owner")).toBe("user");
    expect(normalizeAppRole(null)).toBe("user");
  });
});
