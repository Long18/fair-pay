export interface GroupListRow {
  id: string;
  name?: string | null;
  description?: string | null;
}

function extractGroups(data: unknown): GroupListRow[] {
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
