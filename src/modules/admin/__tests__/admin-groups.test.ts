import { describe, it, expect } from "vitest";
import fc from "fast-check";

/**
 * Property-Based Tests for Admin Group Deletion Audit Trail
 * Feature: admin-dashboard
 *
 * Property 2: Admin deletion creates audit trail (groups)
 *
 * Tests pure logic of deletion + audit trail creation:
 * - Simulated data store (Map of groups)
 * - Simulated audit log (array)
 * - Delete function removes from store and adds to audit log
 * - Verify: after deletion, group is not in store AND audit log has correct entry
 *
 * **Validates: Requirements 5.4**
 */

// ============================================================
// Types
// ============================================================

interface Group {
  id: string;
  name: string;
  created_by: string;
  member_count: number;
  total_expenses: number;
  created_at: string;
}

interface AuditLogEntry {
  actor_id: string;
  entity_id: string;
  entity_type: string;
  action_type: string;
  timestamp: string;
}

interface DeleteResult {
  success: boolean;
  error?: string;
}

// ============================================================
// Pure logic: Group deletion with audit trail
// ============================================================

/**
 * Deletes a group from the store and records an audit log entry.
 * Mirrors the admin group deletion behavior:
 * 1. Remove group from data store
 * 2. Create audit log entry with actor, entity_id, action_type
 */
function deleteGroupWithAudit(
  groupId: string,
  actorId: string,
  groupStore: Map<string, Group>,
  auditLog: AuditLogEntry[],
): DeleteResult {
  const group = groupStore.get(groupId);
  if (!group) {
    return { success: false, error: "Group not found" };
  }

  // Remove from store
  groupStore.delete(groupId);

  // Record audit trail
  auditLog.push({
    actor_id: actorId,
    entity_id: groupId,
    entity_type: "group",
    action_type: "DELETE",
    timestamp: new Date().toISOString(),
  });

  return { success: true };
}

// ============================================================
// Arbitraries (generators)
// ============================================================

/** Generate a non-empty group name */
const arbGroupName = fc.string({ minLength: 1, maxLength: 60 });

/** Generate a Group object */
const arbGroup: fc.Arbitrary<Group> = fc
  .tuple(
    fc.uuid(),
    arbGroupName,
    fc.uuid(),
    fc.integer({ min: 1, max: 100 }),
    fc.integer({ min: 0, max: 1_000_000 }),
  )
  .map(([id, name, created_by, member_count, total_expenses]) => ({
    id,
    name,
    created_by,
    member_count,
    total_expenses,
    created_at: new Date().toISOString(),
  }));

/** Generate a list of groups with unique IDs */
const arbGroupList = fc
  .array(arbGroup, { minLength: 1, maxLength: 20 })
  .map((groups) => {
    const seen = new Set<string>();
    return groups.filter((g) => {
      if (seen.has(g.id)) return false;
      seen.add(g.id);
      return true;
    });
  })
  .filter((groups) => groups.length > 0);

/** Generate an admin actor ID */
const arbActorId = fc.uuid();

// ============================================================
// Property 2: Admin deletion creates audit trail (groups)
// ============================================================

describe("Feature: admin-dashboard - Property 2: Admin deletion creates audit trail", () => {
  /**
   * **Validates: Requirements 5.4**
   *
   * After a successful group deletion, the group SHALL no longer
   * be retrievable from the data store.
   */
  it("deleted group is no longer retrievable from the store", () => {
    fc.assert(
      fc.property(arbGroupList, arbActorId, (groups, actorId) => {
        const store = new Map(groups.map((g) => [g.id, g]));
        const auditLog: AuditLogEntry[] = [];

        // Pick a random group to delete
        const targetGroup = groups[0];

        const result = deleteGroupWithAudit(
          targetGroup.id,
          actorId,
          store,
          auditLog,
        );

        expect(result.success).toBe(true);
        expect(store.has(targetGroup.id)).toBe(false);
        expect(store.get(targetGroup.id)).toBeUndefined();
      }),
      { numRuns: 100 },
    );
  });

  /**
   * **Validates: Requirements 5.4**
   *
   * After a successful group deletion, a corresponding audit log entry
   * SHALL exist with the correct actor_id, entity_id, and action_type.
   */
  it("audit log entry exists with correct actor, entity_id, and action_type after deletion", () => {
    fc.assert(
      fc.property(arbGroupList, arbActorId, (groups, actorId) => {
        const store = new Map(groups.map((g) => [g.id, g]));
        const auditLog: AuditLogEntry[] = [];

        const targetGroup = groups[0];

        deleteGroupWithAudit(targetGroup.id, actorId, store, auditLog);

        // Find the audit entry for this deletion
        const entry = auditLog.find(
          (e) =>
            e.entity_id === targetGroup.id && e.action_type === "DELETE",
        );

        expect(entry).toBeDefined();
        expect(entry!.actor_id).toBe(actorId);
        expect(entry!.entity_id).toBe(targetGroup.id);
        expect(entry!.entity_type).toBe("group");
        expect(entry!.action_type).toBe("DELETE");
        expect(entry!.timestamp).toBeTruthy();
      }),
      { numRuns: 100 },
    );
  });

  /**
   * **Validates: Requirements 5.4**
   *
   * Both conditions hold simultaneously: group removed AND audit entry created.
   */
  it("group is removed AND audit entry exists (combined invariant)", () => {
    fc.assert(
      fc.property(arbGroupList, arbActorId, (groups, actorId) => {
        const store = new Map(groups.map((g) => [g.id, g]));
        const auditLog: AuditLogEntry[] = [];

        const targetGroup = groups[0];

        const result = deleteGroupWithAudit(
          targetGroup.id,
          actorId,
          store,
          auditLog,
        );

        // Both conditions must hold
        expect(result.success).toBe(true);
        expect(store.has(targetGroup.id)).toBe(false);
        expect(
          auditLog.some(
            (e) =>
              e.entity_id === targetGroup.id &&
              e.action_type === "DELETE" &&
              e.actor_id === actorId,
          ),
        ).toBe(true);
      }),
      { numRuns: 100 },
    );
  });

  /**
   * **Validates: Requirements 5.4**
   *
   * Deleting a non-existent group fails gracefully without creating
   * an audit log entry.
   */
  it("deleting a non-existent group fails and creates no audit entry", () => {
    fc.assert(
      fc.property(arbGroupList, arbActorId, fc.uuid(), (groups, actorId, fakeId) => {
        const store = new Map(groups.map((g) => [g.id, g]));
        // Ensure fakeId is not in the store
        fc.pre(!store.has(fakeId));

        const auditLog: AuditLogEntry[] = [];

        const result = deleteGroupWithAudit(fakeId, actorId, store, auditLog);

        expect(result.success).toBe(false);
        expect(result.error).toBeDefined();
        expect(auditLog.length).toBe(0);
      }),
      { numRuns: 100 },
    );
  });

  /**
   * **Validates: Requirements 5.4**
   *
   * Deleting multiple groups sequentially creates one audit entry per
   * deletion, and none of the deleted groups remain in the store.
   */
  it("sequential deletions each produce exactly one audit entry and remove the group", () => {
    fc.assert(
      fc.property(arbGroupList, arbActorId, (groups, actorId) => {
        fc.pre(groups.length >= 2);

        const store = new Map(groups.map((g) => [g.id, g]));
        const auditLog: AuditLogEntry[] = [];

        const toDelete = groups.slice(0, Math.min(groups.length, 5));

        for (const group of toDelete) {
          deleteGroupWithAudit(group.id, actorId, store, auditLog);
        }

        // All deleted groups should be gone
        for (const group of toDelete) {
          expect(store.has(group.id)).toBe(false);
        }

        // One audit entry per deletion
        expect(auditLog.length).toBe(toDelete.length);

        // Each audit entry matches a deleted group
        for (const group of toDelete) {
          const entry = auditLog.find((e) => e.entity_id === group.id);
          expect(entry).toBeDefined();
          expect(entry!.action_type).toBe("DELETE");
          expect(entry!.actor_id).toBe(actorId);
        }
      }),
      { numRuns: 100 },
    );
  });

  /**
   * **Validates: Requirements 5.4**
   *
   * Deletion of one group does not affect other groups in the store.
   */
  it("deleting a group does not remove other groups from the store", () => {
    fc.assert(
      fc.property(arbGroupList, arbActorId, (groups, actorId) => {
        fc.pre(groups.length >= 2);

        const store = new Map(groups.map((g) => [g.id, g]));
        const auditLog: AuditLogEntry[] = [];

        const targetGroup = groups[0];
        const otherGroups = groups.slice(1);

        deleteGroupWithAudit(targetGroup.id, actorId, store, auditLog);

        // Other groups remain untouched
        for (const group of otherGroups) {
          expect(store.has(group.id)).toBe(true);
          expect(store.get(group.id)).toEqual(group);
        }
      }),
      { numRuns: 100 },
    );
  });
});
