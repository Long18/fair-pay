import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabaseClient } from "@/utility/supabaseClient";
import { useAdminTranslation } from "../i18n";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Loader2Icon, GroupIcon, PencilIcon, UsersIcon } from "@/components/ui/icons";
import { formatDate } from "@/lib/locale-utils";
import { matchesSearchFields } from "@/lib/search-utils";
import { AdminPageHeader } from "../components/AdminPageHeader";
import { AdminPageToolbar } from "../components/AdminPageToolbar";
import { AdminTabs, AdminTabsContent } from "../components/AdminTabs";
import { useAdminTabParam } from "../hooks/use-admin-tab-param";
import { useHaptics } from "@/hooks/use-haptics";
import { formatSystemRole, relationOne, type RelationOne } from "./admin-people/utils";

const MODERATOR_LIST_CLASS =
  "max-h-[calc(100dvh-14rem)] min-h-[12rem] divide-y overflow-y-auto rounded-md border";

type ModeratorUserRow = {
  id: string;
  full_name: string;
  email: string;
  avatar_url: string | null;
  role: "admin" | "moderator" | "user";
  created_at: string;
};

type ModeratorGroupRecord = {
  id: string;
  name: string;
  description: string | null;
  avatar_url: string | null;
  created_at: string;
  is_archived: boolean | null;
  profiles: RelationOne<{ full_name: string | null }>;
};

type ModeratorGroupRow = {
  id: string;
  name: string;
  description: string | null;
  avatar_url: string | null;
  creator_name: string;
  is_archived: boolean;
  created_at: string;
};

function EditProfileBasicsDialog({
  user,
  open,
  onOpenChange,
}: {
  user: ModeratorUserRow | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { tAdmin } = useAdminTranslation();
  const queryClient = useQueryClient();
  const [fullName, setFullName] = useState(user?.full_name ?? "");
  const [avatarUrl, setAvatarUrl] = useState(user?.avatar_url ?? "");
  const [isSaving, setIsSaving] = useState(false);

  if (!user) return null;

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const { error } = await supabaseClient.rpc("moderator_update_profile_basic", {
        p_user_id: user.id,
        p_full_name: fullName,
        p_avatar_url: avatarUrl || null,
      });
      if (error) throw error;
      await queryClient.invalidateQueries({ queryKey: ["moderator", "users"] });
      toast.success(tAdmin("people.success.userUpdated", { name: fullName }));
      onOpenChange(false);
    } catch (error) {
      toast.error(tAdmin("common.errorWithMessage", {
        message: error instanceof Error ? error.message : tAdmin("people.errors.updateUserFailed"),
      }));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{tAdmin("common.edit")}</DialogTitle>
          <DialogDescription>{user.email}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="moderator-user-name">{tAdmin("people.fullName")}</Label>
            <Input
              id="moderator-user-name"
              value={fullName}
              onChange={(event) => setFullName(event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="moderator-user-avatar">{tAdmin("people.avatarUrl")}</Label>
            <Input
              id="moderator-user-avatar"
              value={avatarUrl}
              onChange={(event) => setAvatarUrl(event.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>
            {tAdmin("common.cancel")}
          </Button>
          <Button onClick={handleSave} disabled={isSaving || !fullName.trim()}>
            {isSaving ? <Loader2Icon className="mr-2 h-4 w-4 animate-spin" /> : null}
            {tAdmin("common.save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ModeratorUsersTab() {
  const { tAdmin } = useAdminTranslation();
  const [search, setSearch] = useState("");
  const [editingUser, setEditingUser] = useState<ModeratorUserRow | null>(null);

  const { data = [], isLoading } = useQuery({
    queryKey: ["moderator", "users"],
    queryFn: async () => {
      const { data, error } = await supabaseClient.rpc("get_moderator_users");
      if (error) throw error;
      return (data ?? []) as ModeratorUserRow[];
    },
  });

  const visibleUsers = useMemo(() => {
    return data.filter((user) =>
      matchesSearchFields(search, user.full_name, user.email, user.role),
    );
  }, [data, search]);

  return (
    <>
      <div className="flex min-w-0 flex-col gap-3">
        <AdminPageToolbar
          search={search}
          onSearchChange={setSearch}
          searchPlaceholder={tAdmin("people.userSearchPlaceholder")}
        />
        {isLoading ? (
          <div className="flex justify-center py-10">
            <Loader2Icon className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className={MODERATOR_LIST_CLASS}>
            {visibleUsers.map((user) => (
              <div key={user.id} className="flex items-center justify-between gap-3 px-3 py-2">
                <div className="flex min-w-0 items-center gap-2.5">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={user.avatar_url ?? undefined} alt={user.full_name} />
                    <AvatarFallback className="text-xs">{user.full_name?.[0]?.toUpperCase() ?? "?"}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{user.full_name}</p>
                    <p className="truncate text-xs text-muted-foreground" translate="no">{user.email}</p>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Badge variant={user.role === "admin" ? "default" : "secondary"}>
                    {formatSystemRole(user.role, tAdmin("common.user"))}
                  </Badge>
                  <Button size="sm" variant="outline" className="h-8" onClick={() => setEditingUser(user)}>
                    <PencilIcon className="mr-1.5 h-4 w-4" />
                    {tAdmin("common.edit")}
                  </Button>
                </div>
              </div>
            ))}
            {visibleUsers.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">{tAdmin("common.noData")}</p>
            ) : null}
          </div>
        )}
      </div>
      <EditProfileBasicsDialog
        key={editingUser?.id ?? "moderator-edit-empty"}
        user={editingUser}
        open={!!editingUser}
        onOpenChange={(open) => {
          if (!open) setEditingUser(null);
        }}
      />
    </>
  );
}

function ModeratorGroupsTab() {
  const { tAdmin } = useAdminTranslation();
  const [search, setSearch] = useState("");

  const { data = [], isLoading } = useQuery({
    queryKey: ["moderator", "groups"],
    queryFn: async () => {
      const { data, error } = await supabaseClient
        .from("groups")
        .select("id, name, description, avatar_url, created_at, is_archived, profiles!groups_created_by_fkey(full_name)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return ((data ?? []) as unknown as ModeratorGroupRecord[]).map((group) => ({
        id: group.id,
        name: group.name,
        description: group.description,
        avatar_url: group.avatar_url,
        creator_name: relationOne(group.profiles)?.full_name ?? tAdmin("common.unknown"),
        is_archived: group.is_archived ?? false,
        created_at: group.created_at,
      })) as ModeratorGroupRow[];
    },
  });

  const visibleGroups = useMemo(() => {
    return data.filter((group) =>
      matchesSearchFields(search, group.name, group.description, group.creator_name),
    );
  }, [data, search]);

  return (
    <div className="flex min-w-0 flex-col gap-3">
      <AdminPageToolbar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder={tAdmin("people.groupSearchPlaceholder")}
      />
      {isLoading ? (
        <div className="flex justify-center py-10">
          <Loader2Icon className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className={MODERATOR_LIST_CLASS}>
          {visibleGroups.map((group) => (
            <div key={group.id} className="flex items-center justify-between gap-3 px-3 py-2">
              <div className="flex min-w-0 items-center gap-2.5">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={group.avatar_url ?? undefined} alt={group.name} />
                  <AvatarFallback className="text-xs">{group.name?.[0]?.toUpperCase() ?? "?"}</AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{group.name}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {group.creator_name} · {formatDate(group.created_at)}
                  </p>
                </div>
              </div>
              {group.is_archived ? (
                <Badge variant="outline">{tAdmin("status.archived")}</Badge>
              ) : null}
            </div>
          ))}
          {visibleGroups.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">{tAdmin("common.noData")}</p>
          ) : null}
        </div>
      )}
    </div>
  );
}

const MODERATOR_PEOPLE_TABS = ["users", "groups"] as const;

export function ModeratorPeople() {
  const { tAdmin } = useAdminTranslation();
  const { tap } = useHaptics();
  const [activeTab, setActiveTab] = useAdminTabParam("users", MODERATOR_PEOPLE_TABS);

  const handleTabChange = (value: string) => {
    tap();
    setActiveTab(value);
  };

  return (
    <AdminTabs
      value={activeTab}
      onValueChange={handleTabChange}
      header={
        <AdminPageHeader
          title={tAdmin("people.title")}
          description={tAdmin("people.subtitle")}
        />
      }
      items={[
        { value: "users", label: tAdmin("people.usersTab"), icon: UsersIcon },
        { value: "groups", label: tAdmin("people.groupsTab"), icon: GroupIcon },
      ]}
    >
      <AdminTabsContent value="users">
        <ModeratorUsersTab />
      </AdminTabsContent>
      <AdminTabsContent value="groups">
        <ModeratorGroupsTab />
      </AdminTabsContent>
    </AdminTabs>
  );
}
