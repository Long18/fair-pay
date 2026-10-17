const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isAuditUuid(value: string): boolean {
  return UUID_RE.test(value);
}

export type AuditEntityBuckets = {
  userIds: string[];
  groupIds: string[];
  expenseIds: string[];
  splitIds: string[];
};

type BucketKind = "user" | "group" | "expense";

function emptyBuckets(): AuditEntityBuckets {
  return { userIds: [], groupIds: [], expenseIds: [], splitIds: [] };
}

function addToBucket(buckets: AuditEntityBuckets, kind: BucketKind, id: string) {
  if (!isAuditUuid(id)) return;
  const list =
    kind === "user" ? buckets.userIds : kind === "group" ? buckets.groupIds : buckets.expenseIds;
  if (!list.includes(id)) list.push(id);
}

function addSplitId(buckets: AuditEntityBuckets, id: string) {
  if (!isAuditUuid(id)) return;
  if (!buckets.splitIds.includes(id)) buckets.splitIds.push(id);
}

function inferKindFromKey(key: string): BucketKind | null {
  const k = key.toLowerCase();
  if (/user|actor|counterparty|paid_by|from_user|to_user|profile|member/.test(k)) return "user";
  if (/group/.test(k)) return "group";
  if (/expense/.test(k)) return "expense";
  return null;
}

function walkValue(key: string, value: unknown, buckets: AuditEntityBuckets) {
  if (value === null || value === undefined) return;

  if (typeof value === "string") {
    const kind = inferKindFromKey(key);
    if (kind) addToBucket(buckets, kind, value);
    if (/split_id/i.test(key)) addSplitId(buckets, value);
    return;
  }

  if (Array.isArray(value)) {
    const kind = inferKindFromKey(key);
    const isSplitIds = /split_id/i.test(key);
    for (const item of value) {
      if (typeof item === "string" && isSplitIds) {
        addSplitId(buckets, item);
      } else if (typeof item === "string" && kind) {
        addToBucket(buckets, kind, item);
      } else if (item && typeof item === "object" && !Array.isArray(item)) {
        walkObject(item as Record<string, unknown>, buckets);
      }
    }
    return;
  }

  if (typeof value === "object") {
    walkObject(value as Record<string, unknown>, buckets);
  }
}

function walkObject(obj: Record<string, unknown>, buckets: AuditEntityBuckets) {
  for (const [key, val] of Object.entries(obj)) {
    walkValue(key, val, buckets);
  }
}

function applyTableEntityHint(
  tableName: string | null | undefined,
  entityId: string | null | undefined,
  buckets: AuditEntityBuckets,
) {
  if (!tableName || !entityId || !isAuditUuid(entityId)) return;
  const table = tableName.toLowerCase();
  if (table === "expense_splits") {
    addSplitId(buckets, entityId);
    return;
  }
  if (table === "expenses") {
    addToBucket(buckets, "expense", entityId);
    return;
  }
  if (table === "groups" || table === "group_members") {
    addToBucket(buckets, "group", entityId);
    return;
  }
  if (table === "profiles" || table === "friendships" || table === "payments") {
    addToBucket(buckets, "user", entityId);
  }
}

export function collectAuditEntityIds(
  sources: Array<Record<string, unknown> | null | undefined>,
  options?: { tableName?: string | null; entityId?: string | null },
): AuditEntityBuckets {
  const buckets = emptyBuckets();
  for (const source of sources) {
    if (source) walkObject(source, buckets);
  }
  applyTableEntityHint(options?.tableName, options?.entityId, buckets);
  return buckets;
}
