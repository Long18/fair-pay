import { useMemo, useState, useCallback, useEffect } from "react";
import { toast } from "sonner";
import { supabaseClient } from "@/utility/supabaseClient";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { UserAvatar, UserGroupStack } from "@/components/user-display";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  UsersIcon,
  Loader2Icon,
  UserMinusIcon,
  PlusIcon,
  Trash2Icon,
  EyeIcon,
  EyeOffIcon,
  ShieldIcon,
  ShieldOffIcon,
  ArchiveIcon,
  ArchiveRestoreIcon,
} from "@/components/ui/icons";
import { formatDate } from "@/lib/locale-utils";
import type { AdminUserRow } from "../../types";
import { useAdminTranslation } from "../../i18n";
import type { GroupMemberWithGroup } from "./types";
import { formatSystemRole, getErrorMessage, relationOne } from "./utils";
import { UserSingleCombobox } from "./user-single-combobox";
import { DetailRow } from "./detail-helpers";

const TAB_TRIGGER_CLASS = "flex-none px-2.5 text-xs sm:text-sm";

/** Body of the user detail pane/sheet. Title, close and footer actions live in the parent shell. */
export function UserDetailPanel({
  user,
  onToggleRole,
  onToggleJourneyTracking,
  onDelete,
  onDeactivate,
  onReactivate,
  onMerge,
  onSetPrimaryEmail,
  onAddEmail,
  onRemoveEmail,
  isAddingEmail,
  settingPrimaryEmailId,
  removingEmailId,
  isSelf,
}: {
  user: AdminUserRow;
  onToggleRole: () => void;
  onToggleJourneyTracking: () => void;
  onDelete: () => void;
  onDeactivate: () => void;
  onReactivate: () => void;
  onMerge: () => void;
  onSetPrimaryEmail: (emailId: string) => void;
  onAddEmail: (email: string, makePrimary: boolean) => Promise<void>;
  onRemoveEmail: (emailId: string) => void;
  isAddingEmail: boolean;
  settingPrimaryEmailId: string | null;
  removingEmailId: string | null;
  isSelf: boolean;
}) {
  const { tAdmin } = useAdminTranslation();
  const userId = user.id;
  const [groups, setGroups] = useState<Array<{ id: string; name: string; role: string }>>([]);
  const [loadingGroups, setLoadingGroups] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [makePrimary, setMakePrimary] = useState(false);
  const attachedEmailCount = user.emails?.length ?? 0;
  const emailRows = attachedEmailCount > 0
    ? user.emails ?? []
    : [{ id: "primary", email: user.email, is_primary: true }];

  const [addGroupOpen, setAddGroupOpen] = useState(false);
  const [allGroups, setAllGroups] = useState<Array<{ id: string; name: string }>>([]);
  const [selectedGroupId, setSelectedGroupId] = useState("");
  const [addingToGroup, setAddingToGroup] = useState(false);
  const [removingGroupId, setRemovingGroupId] = useState<string | null>(null);

  const fetchGroups = useCallback(() => {
    setLoadingGroups(true);
    supabaseClient
      .from("group_members")
      .select("role, groups!group_members_group_id_fkey(id, name)")
      .eq("user_id", userId)
      .then(({ data, error }) => {
        if (!error && data) {
          setGroups(
            (data as unknown as GroupMemberWithGroup[]).map((m) => {
              const group = relationOne(m.groups);
              return {
                id: group?.id ?? "",
                name: group?.name ?? tAdmin("common.unknown"),
                role: m.role ?? "member",
              };
            }),
          );
        }
        setLoadingGroups(false);
      });
  }, [tAdmin, userId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchGroups();
  }, [fetchGroups]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reset email draft when user/email list changes
    setNewEmail("");
    setMakePrimary(attachedEmailCount === 0);
  }, [attachedEmailCount, userId]);

  useEffect(() => {
    if (!addGroupOpen) return;
    supabaseClient
      .from("groups")
      .select("id, name")
      .order("name")
      .then(({ data }) => {
        if (data) setAllGroups(data);
      });
  }, [addGroupOpen]);

  const availableGroups = useMemo(() => {
    const memberGroupIds = new Set(groups.map((g) => g.id));
    return allGroups.filter((g) => !memberGroupIds.has(g.id));
  }, [allGroups, groups]);

  const hasAttachedEmails = attachedEmailCount > 0;
  const emailBusy = settingPrimaryEmailId !== null || removingEmailId !== null || isAddingEmail;

  const handleAddEmail = useCallback(async () => {
    const email = newEmail.trim();
    if (!email) {
      toast.error(tAdmin("people.errors.validEmailRequired"));
      return;
    }

    try {
      await onAddEmail(email, makePrimary || !hasAttachedEmails);
      setNewEmail("");
      setMakePrimary(!hasAttachedEmails);
    } catch {
      // Parent handler owns the toast. Keep local state intact on failure.
    }
  }, [hasAttachedEmails, makePrimary, newEmail, onAddEmail, tAdmin]);

  const handleAddToGroup = useCallback(async () => {
    if (!selectedGroupId) return;
    setAddingToGroup(true);
    try {
      const { error } = await supabaseClient
        .from("group_members")
        .insert({ group_id: selectedGroupId, user_id: userId, role: "member" });
      if (error) {
        if (error.code === "23505") {
          toast.error(tAdmin("people.errors.alreadyGroupMember"));
        } else {
          throw error;
        }
      } else {
        toast.success(tAdmin("people.success.addedToGroup"));
        setAddGroupOpen(false);
        setSelectedGroupId("");
        fetchGroups();
      }
    } catch (err: unknown) {
      toast.error(tAdmin("common.errorWithMessage", { message: getErrorMessage(err, tAdmin("people.errors.updateUserFailed")) }));
    } finally {
      setAddingToGroup(false);
    }
  }, [userId, selectedGroupId, fetchGroups, tAdmin]);

  const handleRemoveFromGroup = useCallback(async (groupId: string) => {
    setRemovingGroupId(groupId);
    try {
      const { error } = await supabaseClient
        .from("group_members")
        .delete()
        .eq("group_id", groupId)
        .eq("user_id", userId);
      if (error) throw error;
      toast.success(tAdmin("people.success.removedFromGroup"));
      fetchGroups();
    } catch (err: unknown) {
      toast.error(tAdmin("common.errorWithMessage", { message: getErrorMessage(err, tAdmin("people.errors.updateUserFailed")) }));
    } finally {
      setRemovingGroupId(null);
    }
  }, [userId, fetchGroups, tAdmin]);

  return (
    <>
      <div className="flex items-center gap-3 pb-3">
        <UserAvatar user={{ full_name: user.full_name, avatar_url: user.avatar_url }} size="lg" />
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5">
          <Badge variant={user.role === "admin" ? "default" : "secondary"}>
            {formatSystemRole(user.role, tAdmin("common.user"))}
          </Badge>
          <Badge variant={user.deactivated_at ? "outline" : "secondary"}>
            {user.deactivated_at ? tAdmin("people.accountDeactivated") : tAdmin("people.accountActive")}
          </Badge>
          <Badge variant={user.journey_tracking_ignored ? "outline" : "secondary"}>
            {user.journey_tracking_ignored ? tAdmin("status.ignored") : tAdmin("status.tracked")}
          </Badge>
          <UserGroupStack userId={user.id} size="xs" />
        </div>
      </div>

      <Tabs defaultValue="overview" className="gap-3">
        <TabsList variant="underline" className="w-full justify-start overflow-x-auto scrollbar-none">
          <TabsTrigger value="overview" className={TAB_TRIGGER_CLASS}>
            {tAdmin("layout.people.overviewTab")}
          </TabsTrigger>
          <TabsTrigger value="emails" className={TAB_TRIGGER_CLASS}>
            {tAdmin("layout.people.emailsTab", { count: emailRows.length })}
          </TabsTrigger>
          <TabsTrigger value="groups" className={TAB_TRIGGER_CLASS}>
            {loadingGroups ? tAdmin("people.groupsLoading") : tAdmin("people.groupsWithCount", { count: groups.length })}
          </TabsTrigger>
          <TabsTrigger value="danger" className={TAB_TRIGGER_CLASS}>
            {tAdmin("layout.people.dangerTab")}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-3">
          <div>
            <DetailRow
              label={tAdmin("common.role")}
              value={formatSystemRole(user.role, tAdmin("common.user"))}
            />
            <DetailRow
              label={tAdmin("people.journeyTracking")}
              value={user.journey_tracking_ignored ? tAdmin("status.ignored") : tAdmin("status.tracked")}
            />
            <DetailRow
              label={tAdmin("people.accountStatus")}
              value={user.deactivated_at ? tAdmin("people.accountDeactivated") : tAdmin("people.accountActive")}
            />
            {user.deactivated_at ? (
              <DetailRow label={tAdmin("people.deactivateAccount")} value={formatDate(user.deactivated_at)} />
            ) : null}
            <DetailRow label={tAdmin("common.createdAt")} value={formatDate(user.created_at)} />
            <DetailRow
              label={tAdmin("layout.people.userId")}
              value={<span className="break-all font-mono text-xs">{user.id}</span>}
            />
          </div>
          <div className="space-y-2">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {tAdmin("layout.people.quickActions")}
            </p>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="outline" onClick={onToggleJourneyTracking}>
                {user.journey_tracking_ignored
                  ? <><EyeIcon className="mr-2 h-4 w-4" />{tAdmin("people.resumeTracking")}</>
                  : <><EyeOffIcon className="mr-2 h-4 w-4" />{tAdmin("people.ignoreTracking")}</>}
              </Button>
              <Button size="sm" variant="outline" onClick={onToggleRole} disabled={isSelf}>
                {user.role === "admin"
                  ? <><ShieldOffIcon className="mr-2 h-4 w-4" />{tAdmin("people.demoteToUser")}</>
                  : <><ShieldIcon className="mr-2 h-4 w-4" />{tAdmin("people.promoteToAdmin")}</>}
              </Button>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="emails" className="space-y-3">
          <div className="space-y-1.5">
            {emailRows.map((e) => (
              <div key={e.id} className="flex items-center justify-between gap-2 rounded-md border px-2.5 py-1.5">
                <div className="flex min-w-0 items-center gap-1.5">
                  <span className="truncate text-sm" translate="no">{e.email}</span>
                  {e.is_primary && (
                    <Badge variant="outline" className="h-4 shrink-0 px-1.5 py-0 text-[10px]">
                      {tAdmin("people.primaryEmail")}
                    </Badge>
                  )}
                </div>
                {!e.is_primary && e.id !== "primary" && (
                  <div className="flex shrink-0 items-center gap-1">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs"
                      disabled={emailBusy}
                      onClick={() => onSetPrimaryEmail(e.id)}
                    >
                      {settingPrimaryEmailId === e.id && <Loader2Icon className="mr-1.5 h-3 w-3 animate-spin" />}
                      {tAdmin("people.makePrimaryEmail")}
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs text-destructive hover:text-destructive"
                      disabled={emailBusy}
                      onClick={() => onRemoveEmail(e.id)}
                    >
                      {removingEmailId === e.id && <Loader2Icon className="mr-1.5 h-3 w-3 animate-spin" />}
                      {tAdmin("people.removeEmail")}
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
          <div className="space-y-2 rounded-md border bg-muted/20 p-2.5">
            <Label htmlFor="admin-add-email">{tAdmin("people.addEmail")}</Label>
            <div className="flex gap-2">
              <Input
                id="admin-add-email"
                type="email"
                placeholder="email@example.com"
                value={newEmail}
                onChange={(event) => setNewEmail(event.target.value)}
                disabled={isAddingEmail}
                className="h-9"
              />
              <Button
                type="button"
                size="sm"
                className="h-9 shrink-0"
                onClick={() => void handleAddEmail()}
                disabled={isAddingEmail || !newEmail.trim()}
              >
                {isAddingEmail && <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />}
                {tAdmin("common.add")}
              </Button>
            </div>
            {hasAttachedEmails ? (
              <label className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={makePrimary}
                  onCheckedChange={(checked) => setMakePrimary(checked === true)}
                  disabled={isAddingEmail}
                />
                <span>{tAdmin("people.makePrimaryEmail")}</span>
              </label>
            ) : (
              <p className="text-xs text-muted-foreground">{tAdmin("people.addFirstEmailPrimaryHint")}</p>
            )}
          </div>
        </TabsContent>

        <TabsContent value="groups" className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">{tAdmin("people.groupsCount", { count: groups.length })}</span>
            <Button size="sm" variant="outline" className="h-8" onClick={() => setAddGroupOpen(true)}>
              <PlusIcon className="mr-1.5 h-4 w-4" />
              {tAdmin("people.addToGroup")}
            </Button>
          </div>
          {loadingGroups ? (
            <div className="flex items-center justify-center py-6">
              <Loader2Icon className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : groups.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">{tAdmin("people.noGroups")}</p>
          ) : (
            <div className="divide-y rounded-md border">
              {groups.map((g) => (
                <div key={g.id} className="flex items-center justify-between gap-2 px-2.5 py-1.5">
                  <span className="truncate text-sm font-medium">{g.name}</span>
                  <div className="flex shrink-0 items-center gap-1.5">
                    <Badge variant={g.role === "admin" ? "default" : "secondary"} className="text-xs">
                      {g.role === "admin" ? tAdmin("common.admin") : tAdmin("common.member")}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-muted-foreground hover:text-destructive"
                      onClick={() => handleRemoveFromGroup(g.id)}
                      disabled={removingGroupId === g.id}
                      aria-label={tAdmin("layout.people.removeFromGroupAria", { name: g.name })}
                    >
                      {removingGroupId === g.id ? (
                        <Loader2Icon className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <UserMinusIcon className="h-3.5 w-3.5" />
                      )}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="danger" className="space-y-3">
          <p className="text-sm text-muted-foreground">{tAdmin("layout.people.dangerHint")}</p>
          <div className="flex flex-col gap-2 rounded-md border border-destructive/30 bg-destructive/[0.03] p-2.5 sm:flex-row sm:flex-wrap">
            <Button size="sm" variant="outline" onClick={onMerge} disabled={isSelf}>
              <UsersIcon className="mr-2 h-4 w-4" />
              {tAdmin("people.mergeProfile")}
            </Button>
            {user.deactivated_at ? (
              <Button size="sm" variant="outline" onClick={onReactivate} disabled={isSelf}>
                <ArchiveRestoreIcon className="mr-2 h-4 w-4" />
                {tAdmin("people.reactivateAccount")}
              </Button>
            ) : (
              <Button size="sm" variant="outline" onClick={onDeactivate} disabled={isSelf}>
                <ArchiveIcon className="mr-2 h-4 w-4" />
                {tAdmin("people.deactivateAccount")}
              </Button>
            )}
            <Button size="sm" variant="destructive" onClick={onDelete} disabled={isSelf}>
              <Trash2Icon className="mr-2 h-4 w-4" />
              {tAdmin("people.deleteUser")}
            </Button>
          </div>
        </TabsContent>
      </Tabs>

      <Dialog open={addGroupOpen} onOpenChange={setAddGroupOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{tAdmin("people.addToGroup")}</DialogTitle>
            <DialogDescription>
              {tAdmin("people.addToGroupDescription", { name: user.full_name })}
            </DialogDescription>
          </DialogHeader>
          <div className="mt-2 space-y-2">
            <Label>{tAdmin("people.selectGroup")}</Label>
            <UserSingleCombobox
              value={selectedGroupId}
              onChange={setSelectedGroupId}
              users={availableGroups.map((g) => ({ id: g.id, full_name: g.name }))}
              placeholder={availableGroups.length === 0 ? tAdmin("people.noGroupsLeft") : tAdmin("people.selectGroupPlaceholder")}
              disabled={availableGroups.length === 0}
            />
          </div>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setAddGroupOpen(false)} disabled={addingToGroup}>{tAdmin("common.cancel")}</Button>
            <Button onClick={handleAddToGroup} disabled={addingToGroup || !selectedGroupId}>
              {addingToGroup ? <Loader2Icon className="mr-2 h-4 w-4 animate-spin" /> : null}
              {tAdmin("common.add")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
