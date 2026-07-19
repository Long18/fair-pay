import { useGetIdentity } from "@refinedev/core";
import type { Profile } from "@/modules/profile/types";
import { InviteUsersCard } from "./invite-users-card";

export function InviteFriendsTab() {
  const { data: identity } = useGetIdentity<Profile>();

  return <InviteUsersCard inviterName={identity?.full_name || identity?.email} />;
}
