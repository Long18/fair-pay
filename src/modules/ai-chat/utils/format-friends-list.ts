export interface FriendRow {
  id: string;
  full_name?: string | null;
  email?: string | null;
}

export function friendsFromPayload(data: unknown, viewerId: string): FriendRow[] {
  if (!Array.isArray(data)) return [];

  return data
    .map((row) => {
      const r = row as {
        user_a?: string;
        user_b?: string;
        user_a_profile?: { id?: string; full_name?: string | null; email?: string | null };
        user_b_profile?: { id?: string; full_name?: string | null; email?: string | null };
      };
      const profile =
        r.user_a === viewerId
          ? r.user_b_profile
          : r.user_b === viewerId
            ? r.user_a_profile
            : null;
      if (!profile?.id) return null;
      return {
        id: profile.id,
        full_name: profile.full_name,
        email: profile.email,
      } satisfies FriendRow;
    })
    .filter((f): f is FriendRow => f !== null);
}

export function formatFriendsListResponse(
  data: unknown,
  viewerId: string,
  language?: string,
): string {
  const vi = language?.startsWith("vi") ?? false;
  const friends = friendsFromPayload(data, viewerId);

  if (friends.length === 0) {
    return vi
      ? "Bạn chưa có bạn bè nào trên FairPay. Mở mục Friends / Connections để mời hoặc chấp nhận lời mời."
      : "You have no FairPay friends yet. Open Friends / Connections to invite or accept requests.";
  }

  const lines = friends.map((f) => {
    const name = f.full_name?.trim() || f.email?.trim() || f.id.slice(0, 8);
    return `• ${name}`;
  });

  const header = vi ? "Bạn bè FairPay của bạn:" : "Your FairPay friends:";
  return [header, ...lines].join("\n");
}
