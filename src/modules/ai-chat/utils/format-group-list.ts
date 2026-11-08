export interface GroupListRow {
  id: string;
  name?: string | null;
  description?: string | null;
}

type LegacyMembershipRow = {
  group_id?: string;
  role?: string;
  groups?: { id?: string; name?: string | null; description?: string | null };
};

/** Normalize MCP Agent API, legacy ai-chat get_groups, or raw arrays into `{ groups }`. */
export function normalizeGroupsListPayload(data: unknown): { groups: GroupListRow[] } {
  if (typeof data === "object" && data !== null && "error" in data) {
    return { groups: [] };
  }

  const direct = extractGroups(data);
  if (direct.length > 0) {
    return { groups: direct };
  }

  if (Array.isArray(data)) {
    const groups: GroupListRow[] = [];
    const seen = new Set<string>();
    for (const row of data) {
      if (typeof row !== "object" || row === null) continue;
      const membership = row as LegacyMembershipRow;
      const nested = membership.groups;
      const id = nested?.id ?? membership.group_id;
      if (!id || seen.has(id)) continue;
      seen.add(id);
      groups.push({
        id,
        name: nested?.name ?? null,
        description: nested?.description ?? null,
      });
    }
    return { groups };
  }

  return { groups: [] };
}

export function extractGroups(data: unknown): GroupListRow[] {
  if (Array.isArray(data)) {
    return data.filter(
      (g): g is GroupListRow =>
        typeof g === "object" && g !== null && typeof (g as GroupListRow).id === "string",
    );
  }
  if (typeof data === "object" && data !== null) {
    const obj = data as { groups?: unknown; data?: unknown };
    for (const candidate of [obj.groups, obj.data]) {
      if (Array.isArray(candidate)) {
        return extractGroups(candidate);
      }
    }
  }
  return [];
}

export function formatGroupListResponse(data: unknown, language?: string): string {
  const vi = language?.startsWith("vi") ?? false;
  const groups = extractGroups(data);

  if (groups.length === 0) {
    return vi
      ? "Bạn chưa tham gia nhóm nào trên FairPay."
      : "You are not in any FairPay groups yet.";
  }

  const lines = groups.map((g) => {
    const name = g.name?.trim() || g.id;
    const desc = g.description?.trim();
    return desc ? `• ${name} — ${desc}` : `• ${name}`;
  });

  const header = vi ? "Các nhóm bạn đang tham gia:" : "Groups you belong to:";
  return [header, ...lines].join("\n");
}
