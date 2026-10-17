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

const EXPENSE_PREVIEW_LIMIT = 10;
const TAB_TRIGGER_CLASS = "flex-none px-2.5 text-xs sm:text-sm";

/** Body of the group detail pane/sheet. Title, close and the Edit action live in the parent shell. */
export function GroupDetailPanel({
  group,
  onDelete,
  onArchiveToggle,
}: {
  group: GroupRow;
  onDelete: () => void;
  onArchiveToggle?: () => void;
}) {
  const { tAdmin } = useAdminTranslation();
  const groupId = group.id;
  const [members, setMembers] = useState<Array<{ id: string; full_name: string; avatar_url: string | null; role: string }>>([]);
  const [expenses, setExpenses] = useState<Array<{ id: string; description: string; amount: number; expense_date: string; paid_by_name: string }>>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [loadingExpenses, setLoadingExpenses] = useState(false);

  const [addMemberOpen, setAddMemberOpen] = useState(false);
  const [allProfiles, setAllProfiles] = useState<Array<{ id: string; full_name: string; avatar_url: string | null }>>([]);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [addingMember, setAddingMember] = useState(false);
  const [removingMemberId, setRemovingMemberId] = useState<string | null>(null);
  const [togglingRoleId, setTogglingRoleId] = useState<string | null>(null);

  const fetchMembers = useCallback(() => {
    setLoadingMembers(true);
    supabaseClient
      .from("group_members")
      .select("role, profiles!group_members_user_id_fkey(id, full_name, avatar_url)")
      .eq("group_id", groupId)
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
  }, [groupId, tAdmin]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchMembers();

    setLoadingExpenses(true);
    supabaseClient
      .from("expenses")
      .select("id, description, amount, expense_date, profiles!expenses_paid_by_user_id_fkey(full_name)")
      .eq("group_id", groupId)
      .order("expense_date", { ascending: false })
      .limit(EXPENSE_PREVIEW_LIMIT)
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
  }, [groupId, fetchMembers, tAdmin]);

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
    if (!selectedUserId) return;
    setAddingMember(true);
    try {
      const { error } = await supabaseClient
        .from("group_members")
        .insert({ group_id: groupId, user_id: selectedUserId, role: "member" });
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
  }, [groupId, selectedUserId, fetchMembers, tAdmin]);

  const handleRemoveMember = useCallback(async (userId: string) => {
    setRemovingMemberId(userId);
    try {
      const { error } = await supabaseClient
        .from("group_members")
        .delete()
        .eq("group_id", groupId)
        .eq("user_id", userId);
      if (error) throw error;
      toast.success(tAdmin("people.success.removedMember"));
      fetchMembers();
    } catch (err: unknown) {
      toast.error(tAdmin("common.errorWithMessage", { message: getErrorMessage(err, tAdmin("people.errors.updateUserFailed")) }));
    } finally {
      setRemovingMemberId(null);
    }
  }, [groupId, fetchMembers, tAdmin]);

  const handleToggleRole = useCallback(async (userId: string, currentRole: string) => {
    setTogglingRoleId(userId);
    const newRole = currentRole === "admin" ? "member" : "admin";
    try {
      const { error } = await supabaseClient
        .from("group_members")
        .update({ role: newRole })
        .eq("group_id", groupId)
        .eq("user_id", userId);
      if (error) throw error;
      toast.success(newRole === "admin" ? tAdmin("people.success.promotedAdmin") : tAdmin("people.success.demotedMember"));
      fetchMembers();
    } catch (err: unknown) {
      toast.error(tAdmin("common.errorWithMessage", { message: getErrorMessage(err, tAdmin("people.errors.updateUserFailed")) }));
    } finally {
      setTogglingRoleId(null);
    }
  }, [groupId, fetchMembers, tAdmin]);

  return (
    <>
      <div className="flex items-center gap-3 pb-3">
        <Avatar className="h-10 w-10">
          <AvatarImage src={group.avatar_url ?? undefined} alt={group.name} />
          <AvatarFallback className="bg-primary/10 text-sm font-semibold text-primary">
            {group.name?.[0]?.toUpperCase() ?? "?"}
          </AvatarFallback>
        </Avatar>
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5">
          <Badge variant="secondary" className="tabular-nums">
            {tAdmin("people.membersCount", { count: members.length })}
          </Badge>
          <Badge variant="outline" className="font-mono tabular-nums">
            {formatNumber(group.total_expenses)}
          </Badge>
          {group.is_archived && (
            <Badge className="bg-[var(--status-warning-bg)] text-[var(--status-warning-foreground)]">
              {tAdmin("status.archived")}
            </Badge>
          )}
        </div>
      </div>

      <Tabs defaultValue="members" className="gap-3">
        <TabsList variant="underline" className="w-full justify-start overflow-x-auto scrollbar-none">
          <TabsTrigger value="members" className={TAB_TRIGGER_CLASS}>
            {tAdmin("layout.people.membersTab", { count: members.length })}
          </TabsTrigger>
          <TabsTrigger value="expenses" className={TAB_TRIGGER_CLASS}>
            {tAdmin("layout.people.expensesTab")}
          </TabsTrigger>
          <TabsTrigger value="settings" className={TAB_TRIGGER_CLASS}>
            {tAdmin("layout.people.settingsTab")}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="members" className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">{tAdmin("people.membersCount", { count: members.length })}</span>
            <Button size="sm" variant="outline" className="h-8" onClick={() => setAddMemberOpen(true)}>
              <UserPlusIcon className="mr-1.5 h-4 w-4" />
              {tAdmin("common.add")}
            </Button>
          </div>
          {loadingMembers ? (
            <div className="flex items-center justify-center py-6">
              <Loader2Icon className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : members.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">{tAdmin("people.noMembers")}</p>
          ) : (
            <div className="divide-y rounded-md border">
              {members.map((m) => (
                <GroupMemberRow
                  key={m.id}
                  member={m}
                  busy={removingMemberId === m.id || togglingRoleId === m.id}
                  onToggleRole={() => handleToggleRole(m.id, m.role)}
                  onRemove={() => handleRemoveMember(m.id)}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="expenses">
          <GroupExpensesList
            loading={loadingExpenses}
            expenses={expenses}
            totalExpenses={group.total_expenses}
          />
        </TabsContent>

        <TabsContent value="settings">
          <GroupSettingsSection group={group} onArchiveToggle={onArchiveToggle} onDelete={onDelete} />
        </TabsContent>
      </Tabs>

      <Dialog open={addMemberOpen} onOpenChange={setAddMemberOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{tAdmin("people.addMember")}</DialogTitle>
            <DialogDescription>{tAdmin("people.addMemberDescription", { name: group.name })}</DialogDescription>
          </DialogHeader>
          <div className="mt-2 space-y-2">
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

function GroupMemberRow({
  member,
  busy,
  onToggleRole,
  onRemove,
}: {
  member: { id: string; full_name: string; avatar_url: string | null; role: string };
  busy: boolean;
  onToggleRole: () => void;
  onRemove: () => void;
}) {
  const { tAdmin } = useAdminTranslation();
  const isAdmin = member.role === "admin";

  return (
    <div className="flex items-center gap-2.5 px-2.5 py-1.5">
      <Avatar className="h-7 w-7">
        <AvatarImage src={member.avatar_url ?? undefined} alt={member.full_name} />
        <AvatarFallback className="text-xs">{member.full_name?.[0]?.toUpperCase() ?? "?"}</AvatarFallback>
      </Avatar>
      <p className="min-w-0 flex-1 truncate text-sm font-medium">{member.full_name}</p>
      <Badge variant={isAdmin ? "default" : "secondary"} className="text-xs">
        {isAdmin ? tAdmin("common.admin") : tAdmin("common.member")}
      </Badge>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground"
            disabled={busy}
            aria-label={tAdmin("layout.people.memberActionsAria", { name: member.full_name })}
          >
            {busy ? (
              <Loader2Icon className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <MoreHorizontalIcon className="h-3.5 w-3.5" />
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={onToggleRole}>
            <StarIcon className="mr-2 h-4 w-4" />
            {isAdmin ? tAdmin("people.demoteToMember") : tAdmin("people.promoteToGroupAdmin")}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={onRemove} className="text-destructive focus:text-destructive">
            <UserMinusIcon className="mr-2 h-4 w-4" />
            {tAdmin("people.removeFromGroup")}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

function GroupExpensesList({
  loading,
  expenses,
  totalExpenses,
}: {
  loading: boolean;
  expenses: Array<{ id: string; description: string; amount: number; expense_date: string; paid_by_name: string }>;
  totalExpenses: number;
}) {
  const { tAdmin } = useAdminTranslation();

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">
          {tAdmin("layout.people.recentExpenses", { count: EXPENSE_PREVIEW_LIMIT })}
        </span>
        <span className="font-mono font-medium tabular-nums">{formatNumber(totalExpenses)}</span>
      </div>
      {loading ? (
        <div className="flex items-center justify-center py-6">
          <Loader2Icon className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : expenses.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">{tAdmin("people.noExpenses")}</p>
      ) : (
        <div className="divide-y rounded-md border">
          {expenses.map((e) => (
            <div key={e.id} className="flex items-center justify-between gap-3 px-2.5 py-1.5">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{e.description}</p>
                <p className="truncate text-xs text-muted-foreground">{e.paid_by_name} · {formatDate(e.expense_date)}</p>
              </div>
              <span className="font-mono text-sm tabular-nums">{formatNumber(e.amount)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function GroupSettingsSection({
  group,
  onArchiveToggle,
  onDelete,
}: {
  group: GroupRow;
  onArchiveToggle?: () => void;
  onDelete: () => void;
}) {
  const { tAdmin } = useAdminTranslation();

  return (
    <div className="space-y-3">
      <div>
        <p className="pb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {tAdmin("layout.people.groupInfo")}
        </p>
        {group.description ? (
          <DetailRow label={tAdmin("people.groupDescription")} value={group.description} />
        ) : null}
        <DetailRow label={tAdmin("people.creator")} value={group.creator_name} />
        <DetailRow label={tAdmin("common.createdAt")} value={formatDate(group.created_at)} />
        <DetailRow
          label={tAdmin("people.totalExpenses")}
          value={<span className="font-mono tabular-nums">{formatNumber(group.total_expenses)}</span>}
        />
        <DetailRow
          label={tAdmin("common.status")}
          value={group.is_archived ? tAdmin("status.archived") : tAdmin("status.active")}
        />
      </div>
      <div className="flex flex-col gap-2 rounded-md border border-destructive/30 bg-destructive/[0.03] p-2.5 sm:flex-row sm:flex-wrap">
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
    </div>
  );
}
