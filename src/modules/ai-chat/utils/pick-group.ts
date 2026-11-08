import { normalizeGroupsListPayload } from "./format-group-list";

export interface GroupRow {
  id: string;
  name?: string;
}

function normalizeName(value: string): string {
  return value.normalize("NFKC").trim().toLowerCase().replace(/\s+/g, " ");
}

export function groupsFromListPayload(data: unknown): GroupRow[] {
  return normalizeGroupsListPayload(data).groups;
}

export type PickGroupResult =
  | { groupId: string }
  | { ask: true }
  | { ambiguous: GroupRow[] };

export function pickGroupId(
  groups: GroupRow[],
  groupNameHint: string | null,
  selectedGroupId?: string,
): PickGroupResult {
  if (selectedGroupId) return { groupId: selectedGroupId };

  if (groupNameHint) {
    const hint = normalizeName(groupNameHint);
    const matches = groups.filter((g) => normalizeName(g.name ?? "") === hint);
    if (matches.length === 1) return { groupId: matches[0].id };
    const partial = groups.filter((g) => normalizeName(g.name ?? "").includes(hint));
    if (partial.length === 1) return { groupId: partial[0].id };
    if (partial.length > 1) return { ambiguous: partial };
  }

  if (groups.length === 1) return { groupId: groups[0].id };
  if (groups.length === 0) return { ask: true };
  return { ask: true };
}
