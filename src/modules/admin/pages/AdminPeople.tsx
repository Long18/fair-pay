import { useHaptics } from "@/hooks/use-haptics";
import {
  UsersIcon,
  GroupIcon,
  HeartHandshakeIcon,
  MailIcon,
} from "@/components/ui/icons";
import { useAdminTranslation } from "../i18n";
import { useAdminAccess } from "../hooks/use-admin-access";
import { AdminPageHeader } from "../components/AdminPageHeader";
import { AdminTabs, AdminTabsContent } from "../components/AdminTabs";
import { useAdminTabParam } from "../hooks/use-admin-tab-param";
import { ModeratorPeople } from "./ModeratorPeople";
import { UsersTab } from "./admin-people/users-tab";
import { GroupsTab } from "./admin-people/groups-tab";
import { FriendshipsTab } from "./admin-people/friendships-tab";
import { InviteFriendsTab } from "./admin-people/invite-friends-tab";

const PEOPLE_TABS = ["users", "groups", "friendships", "invite"] as const;

export function AdminPeople() {
  const { tap } = useHaptics();
  const { tAdmin } = useAdminTranslation();
  const { isModerator } = useAdminAccess();
  const [activeTab, setActiveTab] = useAdminTabParam("users", PEOPLE_TABS);

  if (isModerator) {
    return <ModeratorPeople />;
  }

  const handleTabChange = (value: string) => {
    tap();
    setActiveTab(value);
  };

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title={tAdmin("people.title")}
        description={tAdmin("people.subtitle")}
      />
      <AdminTabs
        value={activeTab}
        onValueChange={handleTabChange}
        listClassName="sm:grid-cols-4"
        items={[
          { value: "users", label: tAdmin("people.usersTab"), icon: UsersIcon },
          { value: "groups", label: tAdmin("people.groupsTab"), icon: GroupIcon },
          { value: "friendships", label: tAdmin("people.friendshipsTab"), icon: HeartHandshakeIcon },
          { value: "invite", label: tAdmin("people.inviteTab"), icon: MailIcon },
        ]}
      >
        <AdminTabsContent value="users" className="mt-4">
          <UsersTab />
        </AdminTabsContent>
        <AdminTabsContent value="groups" className="mt-4">
          <GroupsTab />
        </AdminTabsContent>
        <AdminTabsContent value="friendships" className="mt-4">
          <FriendshipsTab />
        </AdminTabsContent>
        <AdminTabsContent value="invite" className="mt-4">
          <InviteFriendsTab />
        </AdminTabsContent>
      </AdminTabs>
    </div>
  );
}
