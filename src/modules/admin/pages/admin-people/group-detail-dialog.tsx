import { useMemo, useState, useCallback, useEffect } from "react";
import { toast } from "sonner";
import { supabaseClient } from "@/utility/supabaseClient";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  MoreHorizontalIcon,
  Loader2Icon,
  UserPlusIcon,
  UserMinusIcon,
  PencilIcon,
  Trash2Icon,
  ArchiveIcon,
  ArchiveRestoreIcon,
  StarIcon,
} from "@/components/ui/icons";
import { formatDate, formatNumber } from "@/lib/locale-utils";
import { useAdminTranslation } from "../../i18n";
import type { GroupRow, GroupMemberWithProfile, GroupExpensePreview } from "./types";
import { getErrorMessage, relationOne } from "./utils";
import { UserSingleCombobox } from "./user-single-combobox";
import { DetailRow } from "./detail-helpers";

export function GroupDetailDialog({
  group,
  open,
  onOpenChange,
  onEdit,
  onDelete,
  onArchiveToggle,
}: {
  group: GroupRow | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit: () => void;
  onDelete: () => void;
  onArchiveToggle?: () => void;
}) {
  const { tAdmin } = useAdminTranslation();
  const [members, setMembers] = useState<Array<{ id: string; full_name: string; avatar_url: string | null; role: string }>>([]);
  const [expenses, setExpenses] = useState<Array<{ id: string; description: string; amount: number; expense_date: string; paid_by_name: string }>>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [loadingExpenses, setLoadingExpenses] = useState(false);

  // Add member state
  const [addMemberOpen, setAddMemberOpen] = useState(false);
  const [allProfiles, setAllProfiles] = useState<Array<{ id: string; full_name: string; avatar_url: string | null }>>([]);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [addingMember, setAddingMember] = useState(false);
  const [removingMemberId, setRemovingMemberId] = useState<string | null>(null);
  const [togglingRoleId, setTogglingRoleId] = useState<string | null>(null);

  const fetchMembers = useCallback(() => {
    if (!group) return;
    setLoadingMembers(true);
    supabaseClient
      .from("group_members")
      .select("role, profiles!group_members_user_id_fkey(id, full_name, avatar_url)")
      .eq("group_id", group.id)
      .then(({ data, error }) => {
        if (!error && data) {
          setMembers(
            (data as unknown as GroupMemberWithProfile[]).map((m) => {
              const profile = relationOne(m.profiles);
              return {
                id: profile?.id ?? "",
                full_name: profile?.full_name ?? tAdmin("common.unknown"),
                avatar_url: profile?.avatar_url ?? null,
                role: m.role ?? "member",
              };
            }),
          );
        }
        setLoadingMembers(false);
      });
  }, [group, tAdmin]);

  useEffect(() => {
    if (!group || !open) return;

    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchMembers();

    setLoadingExpenses(true);
    supabaseClient
      .from("expenses")
      .select("id, description, amount, expense_date, profiles!expenses_paid_by_user_id_fkey(full_name)")
      .eq("group_id", group.id)
      .order("expense_date", { ascending: false })
      .limit(10)
      .then(({ data, error }) => {
        if (!error && data) {
          setExpenses(
            (data as unknown as GroupExpensePreview[]).map((e) => {
              const profile = relationOne(e.profiles);
              return {
                id: e.id,
                description: e.description ?? "",
                amount: e.amount ?? 0,
                expense_date: e.expense_date,
                paid_by_name: profile?.full_name ?? tAdmin("common.unknown"),
              };
            }),
          );
        }
        setLoadingExpenses(false);
      });
  }, [group, open, fetchMembers, tAdmin]);

  useEffect(() => {
    if (!addMemberOpen) return;
    supabaseClient
      .from("profiles")
      .select("id, full_name, avatar_url")
      .order("full_name")
      .then(({ data }) => {
        if (data) setAllProfiles(data);
      });
  }, [addMemberOpen]);

  const availableProfiles = useMemo(() => {
    const memberIds = new Set(members.map((m) => m.id));
    return allProfiles.filter((p) => !memberIds.has(p.id));
  }, [allProfiles, members]);

  const handleAddMember = useCallback(async () => {
    if (!group || !selectedUserId) return;
    setAddingMember(true);
    try {
      const { error } = await supabaseClient
        .from("group_members")
        .insert({ group_id: group.id, user_id: selectedUserId, role: "member" });
      if (error) {
        if (error.code === "23505") {
          toast.error(tAdmin("people.errors.alreadyGroupMember"));
        } else {
          throw error;
        }
      } else {
        toast.success(tAdmin("people.success.addedMember"));
        setAddMemberOpen(false);
        setSelectedUserId("");
        fetchMembers();
      }
    } catch (err: unknown) {
      toast.error(tAdmin("common.errorWithMessage", { message: getErrorMessage(err, tAdmin("people.errors.updateUserFailed")) }));
    } finally {
      setAddingMember(false);
    }
  }, [group, selectedUserId, fetchMembers, tAdmin]);

  const handleRemoveMember = useCallback(async (userId: string) => {
    if (!group) return;
    setRemovingMemberId(userId);
    try {
      const { error } = await supabaseClient
        .from("group_members")
        .delete()
        .eq("group_id", group.id)
        .eq("user_id", userId);
      if (error) throw error;
      toast.success(tAdmin("people.success.removedMember"));
      fetchMembers();
    } catch (err: unknown) {
      toast.error(tAdmin("common.errorWithMessage", { message: getErrorMessage(err, tAdmin("people.errors.updateUserFailed")) }));
    } finally {
      setRemovingMemberId(null);
    }
  }, [group, fetchMembers, tAdmin]);

  const handleToggleRole = useCallback(async (userId: string, currentRole: string) => {
    if (!group) return;
    setTogglingRoleId(userId);
    const newRole = currentRole === "admin" ? "member" : "admin";
    try {
      const { error } = await supabaseClient
        .from("group_members")
        .update({ role: newRole })
        .eq("group_id", group.id)
        .eq("user_id", userId);
      if (error) throw error;
      toast.success(newRole === "admin" ? tAdmin("people.success.promotedAdmin") : tAdmin("people.success.demotedMember"));
      fetchMembers();
    } catch (err: unknown) {
      toast.error(tAdmin("common.errorWithMessage", { message: getErrorMessage(err, tAdmin("people.errors.updateUserFailed")) }));
    } finally {
      setTogglingRoleId(null);
    }
  }, [group, fetchMembers, tAdmin]);

  if (!group) return null;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-2xl max-h-[85vh] flex flex-col">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <Avatar className="h-12 w-12">
                <AvatarImage src={group.avatar_url ?? undefined} alt={group.name} />
                <AvatarFallback className="text-sm font-semibold bg-primary/10 text-primary">
                  {group.name?.[0]?.toUpperCase() ?? "?"}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <DialogTitle className="truncate text-base font-semibold">{group.name}</DialogTitle>
                  {group.is_archived && (
                    <Badge className="bg-[var(--status-warning-bg)] text-[var(--status-warning-foreground)] text-xs shrink-0">
                      {tAdmin("status.archived")}
                    </Badge>
                  )}
                </div>
                <DialogDescription>
                  {tAdmin("people.createdBy", { name: group.creator_name, date: formatDate(group.created_at) })}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <Tabs defaultValue="members" className="flex-1 overflow-hidden flex flex-col">
            <TabsList className="w-full">
              <TabsTrigger value="members" className="flex-1">{tAdmin("people.membersCount", { count: members.length })}</TabsTrigger>
              <TabsTrigger value="expenses" className="flex-1">{tAdmin("transactions.expensesTab")}</TabsTrigger>
            </TabsList>

            <TabsContent value="members" className="mt-4 overflow-y-auto flex-1">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm text-muted-foreground">{tAdmin("people.membersCount", { count: members.length })}</span>
                <Button size="sm" variant="outline" onClick={() => setAddMemberOpen(true)}>
                  <UserPlusIcon className="mr-2 h-4 w-4" />
                  {tAdmin("common.add")}
                </Button>
              </div>
              {loadingMembers ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2Icon className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : members.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">{tAdmin("people.noMembers")}</p>
              ) : (
                <div className="space-y-2">
                  {members.map((m) => (
                    <div key={m.id} className="flex items-center gap-3 rounded-lg border p-3">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={m.avatar_url ?? undefined} alt={m.full_name} />
                        <AvatarFallback className="text-xs">{m.full_name?.[0]?.toUpperCase() ?? "?"}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{m.full_name}</p>
                      </div>
                      <Badge variant={m.role === "admin" ? "default" : "secondary"} className="text-xs">
                        {m.role === "admin" ? "Admin" : tAdmin("common.member")}
                      </Badge>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-muted-foreground"
                            disabled={removingMemberId === m.id || togglingRoleId === m.id}
                          >
                            {(removingMemberId === m.id || togglingRoleId === m.id) ? (
                              <Loader2Icon className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <MoreHorizontalIcon className="h-3.5 w-3.5" />
                            )}
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleToggleRole(m.id, m.role)}>
                            <StarIcon className="mr-2 h-4 w-4" />
                            {m.role === "admin" ? tAdmin("people.demoteToMember") : tAdmin("people.promoteToGroupAdmin")}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => handleRemoveMember(m.id)}
                            className="text-destructive focus:text-destructive"
                          >
                            <UserMinusIcon className="mr-2 h-4 w-4" />
                            {tAdmin("people.removeFromGroup")}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="expenses" className="mt-4 overflow-y-auto flex-1">
              <div className="space-y-3">
                <DetailRow label={tAdmin("people.totalExpenses")} value={formatNumber(group.total_expenses)} />
                {loadingExpenses ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2Icon className="h-5 w-5 animate-spin text-muted-foreground" />
                  </div>
                ) : expenses.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">{tAdmin("people.noExpenses")}</p>
                ) : (
                  <div className="space-y-2">
                    {expenses.map((e) => (
                      <div key={e.id} className="flex items-center justify-between rounded-lg border p-3">
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium truncate">{e.description}</p>
                          <p className="text-xs text-muted-foreground">{e.paid_by_name} · {formatDate(e.expense_date)}</p>
                        </div>
                        <span className="text-sm font-mono tabular-nums ml-3">{formatNumber(e.amount)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>

          {/* Actions inside modal */}
          <div className="flex flex-wrap gap-2 pt-2 border-t">
            <Button size="sm" variant="outline" onClick={onEdit}>
              <PencilIcon className="mr-2 h-4 w-4" />
              {tAdmin("people.editGroup")}
            </Button>
            {onArchiveToggle && (
              <Button size="sm" variant="outline" onClick={onArchiveToggle}>
                {group.is_archived ? (
                  <><ArchiveRestoreIcon className="mr-2 h-4 w-4" />{tAdmin("people.restore")}</>
                ) : (
                  <><ArchiveIcon className="mr-2 h-4 w-4" />{tAdmin("people.archive")}</>
                )}
              </Button>
            )}
            <Button size="sm" variant="destructive" onClick={onDelete}>
              <Trash2Icon className="mr-2 h-4 w-4" />
              {tAdmin("people.deleteGroup")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Member Dialog */}
      <Dialog open={addMemberOpen} onOpenChange={setAddMemberOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{tAdmin("people.addMember")}</DialogTitle>
            <DialogDescription>{tAdmin("people.addMemberDescription", { name: group.name })}</DialogDescription>
          </DialogHeader>
          <div className="space-y-2 mt-2">
            <Label>{tAdmin("people.selectUser")}</Label>
            <UserSingleCombobox
              value={selectedUserId}
              onChange={setSelectedUserId}
              users={availableProfiles}
              placeholder={availableProfiles.length === 0 ? tAdmin("people.noUsersLeft") : tAdmin("people.selectUser")}
              disabled={availableProfiles.length === 0}
            />
          </div>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setAddMemberOpen(false)} disabled={addingMember}>{tAdmin("common.cancel")}</Button>
            <Button onClick={handleAddMember} disabled={addingMember || !selectedUserId}>
              {addingMember ? <Loader2Icon className="mr-2 h-4 w-4 animate-spin" /> : null}
              {tAdmin("common.add")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
