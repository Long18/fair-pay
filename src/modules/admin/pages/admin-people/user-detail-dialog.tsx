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
  ActivityIcon,
  UserMinusIcon,
  PencilIcon,
  PlusIcon,
  Trash2Icon,
  EyeIcon,
  EyeOffIcon,
  ShieldIcon,
  ShieldOffIcon,
} from "@/components/ui/icons";
import { formatDate } from "@/lib/locale-utils";
import type { AdminUserRow } from "../../types";
import { useAdminTranslation } from "../../i18n";
import type { GroupMemberWithGroup } from "./types";
import { formatSystemRole, getErrorMessage, relationOne } from "./utils";
import { UserSingleCombobox } from "./user-single-combobox";
import { DetailRow } from "./detail-helpers";

export function UserDetailDialog({
  user,
  open,
  onOpenChange,
  onEdit,
  onToggleRole,
  onToggleJourneyTracking,
  onDelete,
  onMerge,
  onViewJourney,
  onSetPrimaryEmail,
  onAddEmail,
  onRemoveEmail,
  isAddingEmail,
  settingPrimaryEmailId,
  removingEmailId,
  isSelf,
}: {
  user: AdminUserRow | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit: () => void;
  onToggleRole: () => void;
  onToggleJourneyTracking: () => void;
  onDelete: () => void;
  onMerge: () => void;
  onViewJourney: () => void;
  onSetPrimaryEmail: (emailId: string) => void;
  onAddEmail: (email: string, makePrimary: boolean) => Promise<void>;
  onRemoveEmail: (emailId: string) => void;
  isAddingEmail: boolean;
  settingPrimaryEmailId: string | null;
  removingEmailId: string | null;
  isSelf: boolean;
}) {
  const { tAdmin } = useAdminTranslation();
  const [groups, setGroups] = useState<Array<{ id: string; name: string; role: string }>>([]);
  const [loadingGroups, setLoadingGroups] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [makePrimary, setMakePrimary] = useState(false);
  const attachedEmailCount = user?.emails?.length ?? 0;

  // Add to group state
  const [addGroupOpen, setAddGroupOpen] = useState(false);
  const [allGroups, setAllGroups] = useState<Array<{ id: string; name: string }>>([]);
  const [selectedGroupId, setSelectedGroupId] = useState("");
  const [addingToGroup, setAddingToGroup] = useState(false);
  const [removingGroupId, setRemovingGroupId] = useState<string | null>(null);

  const fetchGroups = useCallback(() => {
    if (!user) return;
    setLoadingGroups(true);
    supabaseClient
      .from("group_members")
      .select("role, groups!group_members_group_id_fkey(id, name)")
      .eq("user_id", user.id)
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
  }, [tAdmin, user]);

  useEffect(() => {
    if (!user || !open) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchGroups();
  }, [user, open, fetchGroups]);

  useEffect(() => {
    if (!user?.id) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reset email draft when user/email list changes
    setNewEmail("");
    setMakePrimary(attachedEmailCount === 0);
  }, [attachedEmailCount, user?.id]);

  // Fetch all groups when add dialog opens
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
    if (!user || !selectedGroupId) return;
    setAddingToGroup(true);
    try {
      const { error } = await supabaseClient
        .from("group_members")
        .insert({ group_id: selectedGroupId, user_id: user.id, role: "member" });
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
  }, [user, selectedGroupId, fetchGroups, tAdmin]);

  const handleRemoveFromGroup = useCallback(async (groupId: string) => {
    if (!user) return;
    setRemovingGroupId(groupId);
    try {
      const { error } = await supabaseClient
        .from("group_members")
        .delete()
        .eq("group_id", groupId)
        .eq("user_id", user.id);
      if (error) throw error;
      toast.success(tAdmin("people.success.removedFromGroup"));
      fetchGroups();
    } catch (err: unknown) {
      toast.error(tAdmin("common.errorWithMessage", { message: getErrorMessage(err, tAdmin("people.errors.updateUserFailed")) }));
    } finally {
      setRemovingGroupId(null);
    }
  }, [user, fetchGroups, tAdmin]);

  if (!user) return null;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[540px] max-h-[90vh] flex flex-col p-0 gap-0">
          <DialogHeader className="px-6 pt-6 pb-4 border-b shrink-0">
            <div className="flex items-center gap-3">
              <UserAvatar
                user={{
                  full_name: user.full_name,
                  avatar_url: user.avatar_url,
                }}
                size="lg"
              />
              <div className="flex-1 min-w-0">
                <DialogTitle className="flex items-center gap-2 text-base font-semibold">
                  <span>{user.full_name}</span>
                  <UserGroupStack userId={user.id} size="xs" />
                </DialogTitle>
                <DialogDescription className="space-y-0.5">
                  <span className="inline-flex items-center gap-1.5">
                    <span translate="no">{user.email}</span>
                    <Badge variant="outline" className="h-4 shrink-0 px-1.5 py-0 text-[10px]">
                      {tAdmin("people.primaryEmail")}
                    </Badge>
                  </span>
                  {(user.emails ?? []).flatMap((e) =>
                    e.is_primary
                      ? []
                      : [
                          <span key={e.id} className="block text-xs opacity-70" translate="no">
                            {e.email}
                          </span>,
                        ],
                  )}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="flex-1 overflow-hidden flex flex-col">
            <Tabs defaultValue="profile" className="flex-1 overflow-hidden flex flex-col">
              <TabsList className="w-full mx-0 rounded-none border-b">
                <TabsTrigger value="profile" className="flex-1">{tAdmin("people.profile")}</TabsTrigger>
                <TabsTrigger value="groups" className="flex-1">
                  {loadingGroups ? tAdmin("people.groupsLoading") : tAdmin("people.groupsWithCount", { count: groups.length })}
                </TabsTrigger>
              </TabsList>

              <TabsContent value="profile" className="mt-4 space-y-4 overflow-y-auto flex-1 px-6 pb-6">
                <div className="space-y-3">
                  <DetailRow
                    label="Email"
                    value={
                      <div className="space-y-3">
                        <div className="space-y-1">
                          {(user.emails && user.emails.length > 0
                            ? user.emails
                            : [{ id: "primary", email: user.email, is_primary: true }]
                          ).map((e) => (
                            <div key={e.id} className="flex items-center justify-between gap-2 rounded-md border px-2.5 py-2">
                              <div className="min-w-0">
                                <span className="block break-all text-sm" translate="no">{e.email}</span>
                                {e.is_primary && (
                                  <Badge variant="outline" className="mt-1 h-4 shrink-0 px-1.5 py-0 text-[10px]">
                                    {tAdmin("people.primaryEmail")}
                                  </Badge>
                                )}
                              </div>
                              {!e.is_primary && e.id !== "primary" && (
                                <div className="flex shrink-0 items-center gap-2">
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    className="h-7 text-xs"
                                    disabled={settingPrimaryEmailId !== null || removingEmailId !== null || isAddingEmail}
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
                                    disabled={settingPrimaryEmailId !== null || removingEmailId !== null || isAddingEmail}
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
                        <div className="rounded-md border bg-muted/20 p-3">
                          <div className="space-y-2">
                            <Label htmlFor="admin-add-email">{tAdmin("people.addEmail")}</Label>
                            <div className="flex gap-2">
                              <Input
                                id="admin-add-email"
                                type="email"
                                placeholder="email@example.com"
                                value={newEmail}
                                onChange={(event) => setNewEmail(event.target.value)}
                                disabled={isAddingEmail}
                              />
                              <Button
                                type="button"
                                className="shrink-0"
                                onClick={() => void handleAddEmail()}
                                disabled={isAddingEmail || !newEmail.trim()}
                              >
                                {isAddingEmail && <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />}
                                {tAdmin("people.addEmail")}
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
                              <p className="text-xs text-muted-foreground">
                                {tAdmin("people.addFirstEmailPrimaryHint")}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    }
                  />
                  <DetailRow
                    label={tAdmin("common.role")}
                    value={
                      <Badge variant={user.role === "admin" ? "default" : "secondary"}>
                        {formatSystemRole(user.role, tAdmin("common.user"))}
                      </Badge>
                    }
                  />
                  <DetailRow
                    label={tAdmin("people.journeyTracking")}
                    value={
                      <Badge variant={user.journey_tracking_ignored ? "outline" : "secondary"}>
                        {user.journey_tracking_ignored ? tAdmin("status.ignored") : tAdmin("status.tracked")}
                      </Badge>
                    }
                  />
                  <DetailRow label={tAdmin("common.createdAt")} value={formatDate(user.created_at)} />
                  <DetailRow label="ID" value={<span className="text-xs font-mono">{user.id}</span>} />
                </div>

                {/* Actions inside sheet */}
                <div className="flex flex-wrap gap-2 pt-2 border-t">
                  <Button size="sm" variant="outline" onClick={onViewJourney}>
                    <ActivityIcon className="mr-2 h-4 w-4" />
                    {tAdmin("people.viewJourney")}
                  </Button>
                  <Button size="sm" variant="outline" onClick={onToggleJourneyTracking}>
                    {user.journey_tracking_ignored
                      ? <><EyeIcon className="mr-2 h-4 w-4" />{tAdmin("people.resumeTracking")}</>
                      : <><EyeOffIcon className="mr-2 h-4 w-4" />{tAdmin("people.ignoreTracking")}</>}
                  </Button>
                  <Button size="sm" variant="outline" onClick={onEdit}>
                    <PencilIcon className="mr-2 h-4 w-4" />
                    {tAdmin("common.edit")}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={onToggleRole}
                    disabled={isSelf}
                  >
                    {user.role === "admin"
                      ? <><ShieldOffIcon className="mr-2 h-4 w-4" />{tAdmin("people.demoteToUser")}</>
                      : <><ShieldIcon className="mr-2 h-4 w-4" />{tAdmin("people.promoteToAdmin")}</>}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={onMerge}
                    disabled={isSelf}
                  >
                    <UsersIcon className="mr-2 h-4 w-4" />
                    {tAdmin("people.mergeProfile")}
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={onDelete}
                    disabled={isSelf}
                  >
                    <Trash2Icon className="mr-2 h-4 w-4" />
                    {tAdmin("people.deleteUser")}
                  </Button>
                </div>
              </TabsContent>

              <TabsContent value="groups" className="mt-4 overflow-y-auto flex-1 px-6 pb-6">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm text-muted-foreground">{tAdmin("people.groupsCount", { count: groups.length })}</span>
                  <Button size="sm" variant="outline" onClick={() => setAddGroupOpen(true)}>
                    <PlusIcon className="mr-2 h-4 w-4" />
                    {tAdmin("people.addToGroup")}
                  </Button>
                </div>
                {loadingGroups ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2Icon className="h-5 w-5 animate-spin text-muted-foreground" />
                  </div>
                ) : groups.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    {tAdmin("people.noGroups")}
                  </p>
                ) : (
                  <div className="space-y-2">
                    {groups.map((g) => (
                      <div key={g.id} className="flex items-center justify-between rounded-lg border p-3">
                        <span className="text-sm font-medium">{g.name}</span>
                        <div className="flex items-center gap-2">
                          <Badge variant={g.role === "admin" ? "default" : "secondary"} className="text-xs">
                            {g.role === "admin" ? "Admin" : tAdmin("common.member")}
                          </Badge>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-muted-foreground hover:text-destructive"
                            onClick={() => handleRemoveFromGroup(g.id)}
                            disabled={removingGroupId === g.id}
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
            </Tabs>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add to Group Dialog */}
      <Dialog open={addGroupOpen} onOpenChange={setAddGroupOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{tAdmin("people.addToGroup")}</DialogTitle>
            <DialogDescription>
              {tAdmin("people.addToGroupDescription", { name: user.full_name })}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 mt-2">
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
