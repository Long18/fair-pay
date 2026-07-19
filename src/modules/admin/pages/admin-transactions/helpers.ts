import type { FriendshipOption, RelationOne } from "./types";

export function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

export function relationOne<T>(value: RelationOne<T>): T | null {
  return Array.isArray(value) ? value[0] ?? null : value ?? null;
}

export function formatFriendshipName(friendship: FriendshipOption): string {
  return `${friendship.user_a_name} - ${friendship.user_b_name}`;
}
