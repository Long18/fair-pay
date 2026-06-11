import { useMemo, useState, useCallback, useEffect } from "react";
import { useGetIdentity, useGo, type CrudFilters } from "@refinedev/core";
import { useInstantUpdate, useInstantDelete } from "@/hooks/use-instant-mutation";
import { useHaptics } from "@/hooks/use-haptics";
import { useTable } from "@refinedev/react-table";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  useReactTable,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
} from "@tanstack/react-table";
import { toast } from "sonner";

import { AnimatedList } from "@/components/ui/animated-list";
import { AnimatedRow } from "@/components/ui/animated-row";
import { supabaseClient } from "@/utility/supabaseClient";
import { DataTable } from "@/components/refine-ui/data-table/data-table";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { UserAvatar, UserGroupStack } from "@/components/user-display";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  UsersIcon,
  GroupIcon,
  HeartHandshakeIcon,
  MoreHorizontalIcon,
  AlertTriangleIcon,
  Loader2Icon,
  ActivityIcon,
  UserPlusIcon,
  UserMinusIcon,
  PencilIcon,
  PlusIcon,
  ChevronDownIcon,
  ArchiveIcon,
  ArchiveRestoreIcon,
  StarIcon,
  MailIcon,
  SendIcon,
  ChevronsUpDownIcon,
  CheckIcon,
  Trash2Icon,
  EyeIcon,
  EyeOffIcon,
  ShieldIcon,
  ShieldOffIcon,
} from "@/components/ui/icons";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { formatDate, formatNumber } from "@/lib/locale-utils";
import { buildInviteEmailPreview, normalizeInviteEmails } from "@/modules/admin/email/invite-email";
import type { Profile } from "@/modules/profile/types";
import type { AdminUserRow } from "../types";
import { AdminPageToolbar } from "../components/AdminPageToolbar";
import { AdminFilterChips } from "../components/AdminFilterChips";
import { AdminTableSkeleton } from "../components/AdminTableSkeleton";
import { AdminEmptyState } from "../components/AdminEmptyState";
import { AdminCrudDialog } from "../components/AdminCrudSheet";
import {
  AdminMobileCard,
  AdminMobileCards,
  AdminMobilePagination,
} from "../components/AdminMobileCards";
import { useIsMobile } from "@/hooks/ui/use-mobile";
import { useAdminTranslation } from "../i18n";
import { useAdminAccess } from "../hooks/use-admin-access";
import { ModeratorPeople } from "./ModeratorPeople";

// ─── Shared Types ───────────────────────────────────────────────────

interface GroupRow {
  id: string;
  name: string;
  description: string | null;
  avatar_url: string | null;
  created_by: string;
  creator_name: string;
  creator_avatar: string | null;
  member_count: number;
  total_expenses: number;
  is_archived: boolean;
  created_at: string;
}

interface FriendshipRow {
  id: string;
  user_a_id: string;
  user_a_name: string;
  user_a_avatar: string | null;
  user_b_id: string;
  user_b_name: string;
  user_b_avatar: string | null;
  status: "pending" | "accepted" | "rejected";
  created_at: string;
}

interface InviteEmailResponse {
  success: boolean;
  sent?: number;
  failed?: number;
  errors?: string[];
  message?: string;
  error?: string;
}

interface CreateUserFormValues {
  full_name: string;
  email: string;
  role: "admin" | "moderator" | "user";
  avatar_url?: string;
}

function formatSystemRole(role: "admin" | "moderator" | "user", userLabel: string) {
  if (role === "admin") return "Admin";
  if (role === "moderator") return "Moderator";
  return userLabel;
}

type GroupMemberWithGroup = {
  role: string | null;
  groups?: RelationOne<{ id: string | null; name: string | null }>;
};

type GroupMemberWithProfile = {
  role: string | null;
  profiles?: RelationOne<{ id: string | null; full_name: string | null; avatar_url: string | null }>;
};

type GroupExpensePreview = {
  id: string;
  description: string | null;
  amount: number | null;
  expense_date: string;
  profiles?: RelationOne<{ full_name: string | null }>;
};

type GroupListRecord = {
  id: string;
  name: string | null;
  description: string | null;
  avatar_url: string | null;
  created_by: string | null;
  total_expenses: number | null;
  is_archived: boolean | null;
  created_at: string;
  profiles?: { full_name: string | null; avatar_url: string | null } | null;
  group_members?: Array<{ count: number | null }> | null;
};

type FriendshipListRecord = {
  id: string;
  user_a: string;
  user_b: string;
  status: "pending" | "accepted" | "rejected";
  created_at: string;
  user_a_profile?: RelationOne<{ full_name: string | null; avatar_url: string | null }>;
  user_b_profile?: RelationOne<{ full_name: string | null; avatar_url: string | null }>;
};

type RelationOne<T> = T | T[] | null | undefined;

const ADMIN_PEOPLE_RENDER_TIME = Date.now();

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

function relationOne<T>(value: RelationOne<T>): T | null {
  return Array.isArray(value) ? value[0] ?? null : value ?? null;
}

async function sendInviteEmails(emails: string[], inviterName?: string): Promise<InviteEmailResponse> {
  const { data, error } = await supabaseClient.auth.getSession();
  if (error || !data.session?.access_token) {
    throw new Error("admin-session-missing");
  }

  const response = await fetch("/api/admin/email/send-invite", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${data.session.access_token}`,
    },
    body: JSON.stringify({
      emails,
      inviter_name: inviterName,
    }),
  });

  const raw = await response.text();
  const payload = raw ? (JSON.parse(raw) as InviteEmailResponse) : { success: response.ok };

  if (!response.ok || payload.success === false) {
    throw new Error(payload.error || payload.message || `HTTP ${response.status}`);
  }

  return payload;
}

// ─── Debounce Hook ──────────────────────────────────────────────────

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

// ─── Reusable single-select combobox with search ────────────────────

function UserSingleCombobox({
  value,
  onChange,
  users,
  placeholder,
  disabled,
}: {
  value: string;
  onChange: (id: string) => void;
  users: Array<{ id: string; full_name: string }>;
  placeholder: string;
  disabled?: boolean;
}) {
  const { tAdmin } = useAdminTranslation();
  const [open, setOpen] = useState(false);
  const selected = users.find((u) => u.id === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between font-normal"
          disabled={disabled}
        >
          {selected
            ? <span className="truncate">{selected.full_name}</span>
            : <span className="text-muted-foreground truncate">{placeholder}</span>}
          <ChevronsUpDownIcon className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <Command>
          <CommandInput placeholder={tAdmin("toolbar.searchPlaceholder")} />
          <CommandList>
            <CommandEmpty>{tAdmin("common.noData")}</CommandEmpty>
            <CommandGroup>
              {users.map((user) => (
                <CommandItem
                  key={user.id}
                  value={user.full_name}
                  onSelect={() => { onChange(user.id); setOpen(false); }}
                  className="cursor-pointer"
                >
                  <CheckIcon className={cn("mr-2 h-4 w-4 shrink-0", value === user.id ? "opacity-100" : "opacity-0")} />
                  {user.full_name}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

// ─── User Detail Dialog (replaces Sheet) ────────────────────────────

function UserDetailDialog({
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
                  {(user.emails ?? []).filter((e) => !e.is_primary).map((e) => (
                    <span key={e.id} className="block text-xs opacity-70" translate="no">{e.email}</span>
                  ))}
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

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between py-2 border-b last:border-b-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-medium">{value}</span>
    </div>
  );
}

function DetailItem({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="min-w-0 space-y-1">
      <span className="text-xs text-muted-foreground">{label}</span>
      <div className="min-w-0 truncate text-sm font-medium">{value}</div>
    </div>
  );
}

// ─── Group Detail Dialog (replaces Sheet) ───────────────────────────

function GroupDetailDialog({
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

// ─── Shared Confirmation Dialogs ────────────────────────────────────

function DeleteConfirmDialog({
  title,
  description,
  open,
  onOpenChange,
  onConfirm,
  isDeleting,
}: {
  title: string;
  description: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  isDeleting: boolean;
}) {
  const { tAdmin } = useAdminTranslation();

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <div className="flex items-center gap-2">
            <AlertTriangleIcon className="h-5 w-5 text-destructive" />
            <AlertDialogTitle>{title}</AlertDialogTitle>
          </div>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>{tAdmin("common.cancel")}</AlertDialogCancel>
          <AlertDialogAction
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            onClick={(e) => { e.preventDefault(); onConfirm(); }}
            disabled={isDeleting}
          >
            {isDeleting ? <Loader2Icon className="mr-2 h-4 w-4 animate-spin" /> : null}
            {tAdmin("common.delete")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function MergeUserDialog({
  sourceUser,
  users,
  open,
  onOpenChange,
  onConfirm,
  isMerging,
}: {
  sourceUser: AdminUserRow | null;
  users: AdminUserRow[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (targetUserId: string) => void;
  isMerging: boolean;
}) {
  const { tAdmin } = useAdminTranslation();
  const [targetUserId, setTargetUserId] = useState("");

  useEffect(() => {
    if (open) setTargetUserId("");
  }, [open, sourceUser?.id]);

  const targetUsers = useMemo(
    () => users.filter((user) => user.id !== sourceUser?.id),
    [sourceUser?.id, users],
  );

  if (!sourceUser) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>{tAdmin("people.mergeProfileTitle")}</DialogTitle>
          <DialogDescription>
            {tAdmin("people.mergeProfileDescription", {
              name: sourceUser.full_name,
              email: sourceUser.email,
            })}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-lg border bg-muted/20 p-3 text-sm">
            <DetailRow
              label={tAdmin("people.mergeSource")}
              value={<span className="font-medium">{sourceUser.full_name}</span>}
            />
            <DetailRow
              label={tAdmin("common.email")}
              value={
                <div className="space-y-0.5">
                  <span translate="no">{sourceUser.email}</span>
                  {(sourceUser.emails ?? []).filter((e) => !e.is_primary).map((e) => (
                    <p key={e.id} className="text-xs text-muted-foreground" translate="no">{e.email}</p>
                  ))}
                </div>
              }
            />
          </div>

          <div className="space-y-2">
            <Label>{tAdmin("people.mergeTarget")}</Label>
            <UserSingleCombobox
              value={targetUserId}
              onChange={setTargetUserId}
              users={targetUsers}
              placeholder={tAdmin("people.selectMergeTarget")}
              disabled={isMerging || targetUsers.length === 0}
            />
          </div>

          <p className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
            {tAdmin("people.mergeProfileWarning")}
          </p>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isMerging}>
            {tAdmin("common.cancel")}
          </Button>
          <Button
            onClick={() => onConfirm(targetUserId)}
            disabled={isMerging || !targetUserId}
          >
            {isMerging ? <Loader2Icon className="mr-2 h-4 w-4 animate-spin" /> : null}
            {tAdmin("people.mergeProfileSubmit")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Create User Dialog ──────────────────────────────────────────────

function CreateUserDialog({
  open,
  onOpenChange,
  onSubmit,
  isCreating,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: CreateUserFormValues) => void;
  isCreating: boolean;
}) {
  const { tAdmin } = useAdminTranslation();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [role, setRole] = useState<"admin" | "moderator" | "user">("user");

  const handleSubmit = () => {
    if (!fullName.trim() || !email.trim()) {
      toast.error(tAdmin("people.errors.requiredFields"));
      return;
    }
    onSubmit({ full_name: fullName.trim(), email: email.trim(), role, avatar_url: avatarUrl.trim() || undefined });
  };

  return (
    <AdminCrudDialog
      open={open}
      onOpenChange={onOpenChange}
      title={tAdmin("people.createUserTitle")}
      description={tAdmin("people.createUserDescription")}
      isSubmitting={isCreating}
      submitLabel={tAdmin("people.createUserSubmit")}
      onSubmit={handleSubmit}
    >
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="user-name">{tAdmin("people.fullName")}</Label>
          <Input id="user-name" placeholder={tAdmin("people.fullNamePlaceholder")} value={fullName} onChange={(e) => setFullName(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="user-email">Email</Label>
          <Input id="user-email" type="email" placeholder="email@example.com" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="user-avatar">Avatar URL</Label>
          <Input id="user-avatar" type="url" placeholder="https://..." value={avatarUrl} onChange={(e) => setAvatarUrl(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="user-role">{tAdmin("common.role")}</Label>
          <Select value={role} onValueChange={(value) => setRole(value as typeof role)}>
            <SelectTrigger id="user-role"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="user">{tAdmin("common.user")}</SelectItem>
              <SelectItem value="moderator">Moderator</SelectItem>
              <SelectItem value="admin">Admin</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </AdminCrudDialog>
  );
}

// ─── Edit User Dialog ───────────────────────────────────────────────

function EditUserDialog({
  user,
  open,
  onOpenChange,
  onSubmit,
  isUpdating,
  isSelf,
}: {
  user: AdminUserRow | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: {
    full_name: string;
    primary_email_id: string | null;
    avatar_url: string | null;
    role: "admin" | "moderator" | "user";
    journey_tracking_ignored: boolean;
  }) => void;
  isUpdating: boolean;
  isSelf: boolean;
}) {
  const { tAdmin } = useAdminTranslation();
  const [fullName, setFullName] = useState(user?.full_name ?? "");
  const [primaryEmailId, setPrimaryEmailId] = useState(
    user?.emails?.find((email) => email.is_primary)?.id ?? null,
  );
  const [avatarUrl, setAvatarUrl] = useState(user?.avatar_url ?? "");
  const [role, setRole] = useState<"admin" | "moderator" | "user">(user?.role ?? "user");
  const [journeyTracking, setJourneyTracking] = useState<"tracked" | "ignored">(
    user?.journey_tracking_ignored ? "ignored" : "tracked",
  );

  if (!user) return null;

  return (
    <AdminCrudDialog
      open={open}
      onOpenChange={onOpenChange}
      title={tAdmin("people.editUserTitle")}
      description={tAdmin("people.editUserDescription", { name: user.full_name })}
      isSubmitting={isUpdating}
      submitLabel={tAdmin("common.save")}
      contentClassName="sm:max-w-[640px]"
      onSubmit={() => onSubmit({
        full_name: fullName.trim(),
        primary_email_id: primaryEmailId,
        avatar_url: avatarUrl.trim() || null,
        role,
        journey_tracking_ignored: journeyTracking === "ignored",
      })}
    >
      <div className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="edit-user-name">{tAdmin("people.fullName")}</Label>
            <Input id="edit-user-name" value={fullName} onChange={(e) => setFullName(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-user-email">{tAdmin("people.primaryEmail")}</Label>
            {user.emails?.length ? (
              <Select value={primaryEmailId ?? undefined} onValueChange={setPrimaryEmailId}>
                <SelectTrigger id="edit-user-email">
                  <SelectValue placeholder={tAdmin("people.selectPrimaryEmail")} />
                </SelectTrigger>
                <SelectContent>
                  {user.emails.map((userEmail) => (
                    <SelectItem key={userEmail.id} value={userEmail.id}>
                      {userEmail.email}{userEmail.is_primary ? ` (${tAdmin("people.currentPrimaryEmail")})` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <div className="rounded-md border bg-muted/20 p-3 text-sm">
                <p className="text-muted-foreground">{tAdmin("people.noEmailAddresses")}</p>
                <p className="mt-1 break-all font-medium" translate="no">{user.email}</p>
              </div>
            )}
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="edit-user-avatar">Avatar URL</Label>
            <Input id="edit-user-avatar" type="url" placeholder="https://..." value={avatarUrl} onChange={(e) => setAvatarUrl(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-user-role">{tAdmin("common.role")}</Label>
            <Select value={role} onValueChange={(v) => setRole(v as typeof role)} disabled={isSelf}>
              <SelectTrigger id="edit-user-role">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="user">{tAdmin("common.user")}</SelectItem>
                <SelectItem value="moderator">Moderator</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-user-journey">{tAdmin("people.journeyTracking")}</Label>
            <Select value={journeyTracking} onValueChange={(v) => setJourneyTracking(v as typeof journeyTracking)}>
              <SelectTrigger id="edit-user-journey">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="tracked">{tAdmin("status.tracked")}</SelectItem>
                <SelectItem value="ignored">{tAdmin("status.ignored")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="grid gap-3 rounded-lg border bg-muted/20 p-3 text-sm sm:grid-cols-2">
          <DetailItem label="ID" value={<span className="font-mono text-xs">{user.id}</span>} />
          <DetailItem label={tAdmin("common.createdAt")} value={formatDate(user.created_at)} />
        </div>
      </div>
    </AdminCrudDialog>
  );
}

// ─── Edit Group Name Dialog ─────────────────────────────────────────

function EditGroupDialog({
  group,
  open,
  onOpenChange,
  onConfirm,
  isUpdating,
}: {
  group: GroupRow | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (data: { name: string; description: string; avatar_url: string | null }) => void;
  isUpdating: boolean;
}) {
  const { tAdmin } = useAdminTranslation();
  const [name, setName] = useState(group?.name ?? "");
  const [description, setDescription] = useState(group?.description ?? "");
  const [avatarUrl, setAvatarUrl] = useState(group?.avatar_url ?? "");

  if (!group) return null;

  return (
    <AdminCrudDialog
      open={open}
      onOpenChange={onOpenChange}
      title={tAdmin("people.editGroupTitle")}
      description={tAdmin("people.editGroupDescription", { name: group.name })}
      isSubmitting={isUpdating}
      submitLabel={tAdmin("common.save")}
      contentClassName="sm:max-w-[640px]"
      onSubmit={() => onConfirm({
        name: name.trim(),
        description: description.trim(),
        avatar_url: avatarUrl.trim() || null,
      })}
    >
      <div className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="group-name">{tAdmin("people.groupName")}</Label>
            <Input id="group-name" value={name} onChange={(e) => setName(e.target.value)} placeholder={tAdmin("people.groupNamePlaceholder")} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="group-avatar">Avatar URL</Label>
            <Input id="group-avatar" type="url" value={avatarUrl} onChange={(e) => setAvatarUrl(e.target.value)} placeholder="https://..." />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="group-description">{tAdmin("people.groupDescription")}</Label>
            <Textarea id="group-description" value={description} onChange={(e) => setDescription(e.target.value)} placeholder={tAdmin("people.groupDescriptionPlaceholder")} rows={3} />
          </div>
        </div>
        <div className="grid gap-3 rounded-lg border bg-muted/20 p-3 text-sm sm:grid-cols-2">
          <DetailItem label="ID" value={<span className="font-mono text-xs">{group.id}</span>} />
          <DetailItem label={tAdmin("common.createdAt")} value={formatDate(group.created_at)} />
        </div>
      </div>
    </AdminCrudDialog>
  );
}

// ─── Create Group Sheet ─────────────────────────────────────────────

function CreateGroupSheet({
  open,
  onOpenChange,
  onCreated,
  createdBy,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
  createdBy: string;
}) {
  const { tAdmin } = useAdminTranslation();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const reset = () => {
    setName("");
    setDescription("");
    setAvatarUrl("");
  };

  const handleSubmit = async () => {
    if (!name.trim()) {
      toast.error(tAdmin("people.errors.groupNameRequired"));
      return;
    }
    setSubmitting(true);
    try {
      const { error } = await supabaseClient.from("groups").insert({
        name: name.trim(),
        description: description.trim() || null,
        avatar_url: avatarUrl.trim() || null,
        created_by: createdBy,
      });
      if (error) throw error;
      toast.success(tAdmin("people.success.groupCreated"));
      reset();
      onOpenChange(false);
      onCreated();
    } catch (err: unknown) {
      toast.error(tAdmin("common.errorWithMessage", { message: getErrorMessage(err, tAdmin("people.errors.groupNameRequired")) }));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AdminCrudDialog
      open={open}
      onOpenChange={(v) => { if (!v) reset(); onOpenChange(v); }}
      title={tAdmin("people.createGroupTitle")}
      description={tAdmin("people.createGroupDescription")}
      isSubmitting={submitting}
      submitLabel={tAdmin("people.createGroupSubmit")}
      onSubmit={handleSubmit}
      contentClassName="sm:max-w-[640px]"
    >
      <div className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="new-group-name">{tAdmin("people.groupName")} *</Label>
            <Input
              id="new-group-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={tAdmin("people.createGroupNamePlaceholder")}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="new-group-avatar">Avatar URL</Label>
            <Input
              id="new-group-avatar"
              type="url"
              value={avatarUrl}
              onChange={(e) => setAvatarUrl(e.target.value)}
              placeholder="https://..."
            />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="new-group-desc">{tAdmin("people.groupDescription")}</Label>
            <Textarea
              id="new-group-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={tAdmin("people.groupDescriptionPlaceholder")}
              rows={3}
            />
          </div>
        </div>
      </div>
    </AdminCrudDialog>
  );
}

// ─── Create Friendship Sheet ────────────────────────────────────────

function CreateFriendshipSheet({
  open,
  onOpenChange,
  onCreated,
  createdBy,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
  createdBy: string;
}) {
  const { tAdmin } = useAdminTranslation();
  const [userA, setUserA] = useState("");
  const [userB, setUserB] = useState("");
  const [status, setStatus] = useState<"pending" | "accepted" | "rejected">("accepted");
  const [submitting, setSubmitting] = useState(false);

  const { data: profiles } = useQuery({
    queryKey: ["admin", "profiles-for-friendship"],
    queryFn: async () => {
      const { data, error } = await supabaseClient
        .from("profiles")
        .select("id, full_name")
        .order("full_name");
      if (error) throw error;
      return (data ?? []) as Array<{ id: string; full_name: string }>;
    },
    enabled: open,
    staleTime: 60_000,
  });

  const reset = () => {
    setUserA("");
    setUserB("");
    setStatus("accepted");
  };

  const handleSubmit = async () => {
    if (!userA || !userB) {
      toast.error(tAdmin("people.errors.selectBothUsers"));
      return;
    }
    if (userA === userB) {
      toast.error(tAdmin("people.errors.usersMustDiffer"));
      return;
    }
    setSubmitting(true);
    try {
      const { data: existing, error: checkError } = await supabaseClient
        .from("friendships")
        .select("id")
        .or(`and(user_a.eq.${userA},user_b.eq.${userB}),and(user_a.eq.${userB},user_b.eq.${userA})`);
      if (checkError) throw checkError;
      if (existing && existing.length > 0) {
        toast.error(tAdmin("people.errors.friendshipExists"));
        return;
      }
      const { error } = await supabaseClient.from("friendships").insert({
        user_a: userA,
        user_b: userB,
        status,
        created_by: createdBy,
      });
      if (error) throw error;
      toast.success(tAdmin("people.success.friendshipCreated"));
      reset();
      onOpenChange(false);
      onCreated();
    } catch (err: unknown) {
      toast.error(tAdmin("common.errorWithMessage", { message: getErrorMessage(err, tAdmin("people.errors.friendshipExists")) }));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AdminCrudDialog
      open={open}
      onOpenChange={(v) => { if (!v) reset(); onOpenChange(v); }}
      title={tAdmin("people.createFriendshipTitle")}
      description={tAdmin("people.createFriendshipDescription")}
      isSubmitting={submitting}
      submitLabel={tAdmin("people.createFriendshipSubmit")}
      onSubmit={handleSubmit}
    >
      <div className="space-y-4">
        <div className="space-y-2">
          <Label>{tAdmin("people.userA")} *</Label>
          <UserSingleCombobox
            value={userA}
            onChange={setUserA}
            users={profiles ?? []}
            placeholder={tAdmin("people.selectUser")}
          />
        </div>
        <div className="space-y-2">
          <Label>{tAdmin("people.userB")} *</Label>
          <UserSingleCombobox
            value={userB}
            onChange={setUserB}
            users={(profiles ?? []).filter((u) => u.id !== userA)}
            placeholder={tAdmin("people.selectUser")}
          />
        </div>
        <div className="space-y-2">
          <Label>{tAdmin("common.status")}</Label>
          <Select value={status} onValueChange={(v) => setStatus(v as typeof status)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="accepted">{tAdmin("status.accepted")}</SelectItem>
              <SelectItem value="pending">{tAdmin("status.pending")}</SelectItem>
              <SelectItem value="rejected">{tAdmin("status.rejected")}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </AdminCrudDialog>
  );
}

// ─── Edit Friendship Sheet ──────────────────────────────────────────

function EditFriendshipSheet({
  friendship,
  open,
  onOpenChange,
  onUpdated,
}: {
  friendship: FriendshipRow | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdated: () => void;
}) {
  const { tAdmin } = useAdminTranslation();
  const [status, setStatus] = useState<"pending" | "accepted" | "rejected">(friendship?.status ?? "accepted");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!friendship) return;
    setSubmitting(true);
    try {
      const { error } = await supabaseClient
        .from("friendships")
        .update({ status })
        .eq("id", friendship.id);
      if (error) throw error;
      toast.success(tAdmin("people.success.friendshipUpdated"));
      onOpenChange(false);
      onUpdated();
    } catch (err: unknown) {
      toast.error(tAdmin("common.errorWithMessage", { message: getErrorMessage(err, tAdmin("people.errors.acceptFriendshipFailed")) }));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AdminCrudDialog
      open={open}
      onOpenChange={onOpenChange}
      title={tAdmin("people.editFriendshipTitle")}
      description={friendship ? `${friendship.user_a_name} ↔ ${friendship.user_b_name}` : undefined}
      isSubmitting={submitting}
      submitLabel={tAdmin("common.save")}
      onSubmit={handleSubmit}
    >
      <div className="space-y-4">
        <div className="space-y-2">
          <Label>{tAdmin("common.status")}</Label>
          <Select value={status} onValueChange={(v) => setStatus(v as typeof status)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="accepted">{tAdmin("status.accepted")}</SelectItem>
              <SelectItem value="pending">{tAdmin("status.pending")}</SelectItem>
              <SelectItem value="rejected">{tAdmin("status.rejected")}</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <p className="text-sm text-muted-foreground">
          {tAdmin("people.cannotChangeUsersAfterCreate")}
        </p>
      </div>
    </AdminCrudDialog>
  );
}

// ─── Friendship Status Badge ────────────────────────────────────────

const FRIENDSHIP_STATUS = {
  accepted: { labelKey: "status.accepted", className: "bg-[var(--status-success-bg)] text-[var(--status-success-foreground)]" },
  pending: { labelKey: "status.pending", className: "bg-[var(--status-warning-bg)] text-[var(--status-warning-foreground)]" },
  rejected: { labelKey: "status.rejected", className: "bg-[var(--status-error-bg)] text-[var(--status-error-foreground)]" },
} as const;

function FriendshipStatusBadge({ status }: { status: keyof typeof FRIENDSHIP_STATUS }) {
  const { tAdmin } = useAdminTranslation();
  const config = FRIENDSHIP_STATUS[status];
  return <Badge className={config.className}>{tAdmin(config.labelKey)}</Badge>;
}

// ─── New Registration Card ──────────────────────────────────────────

function NewRegistrationCard({
  user,
  onViewDetail,
}: {
  user: AdminUserRow;
  onViewDetail: () => void;
}) {
  const { tAdmin } = useAdminTranslation();
  const daysSinceRegistration = Math.floor(
    (ADMIN_PEOPLE_RENDER_TIME - new Date(user.created_at).getTime()) / (1000 * 60 * 60 * 24),
  );

  return (
    <div
      className="flex items-center gap-3 rounded-lg border p-4 cursor-pointer hover:bg-accent/50 transition-colors"
      onClick={onViewDetail}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") onViewDetail(); }}
    >
      <Avatar className="h-10 w-10">
        <AvatarImage src={user.avatar_url ?? undefined} alt={user.full_name} />
        <AvatarFallback>{user.full_name?.[0]?.toUpperCase() ?? "?"}</AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{user.full_name}</p>
        <p className="text-xs text-muted-foreground truncate" translate="no">{user.email}</p>
        {(user.emails ?? []).filter((e) => !e.is_primary).length > 0 && (
          <p className="text-xs text-muted-foreground/60 truncate">
            +{(user.emails ?? []).filter((e) => !e.is_primary).length} more
          </p>
        )}
      </div>
      <div className="text-right shrink-0">
        <p className="text-xs text-muted-foreground">{formatDate(user.created_at)}</p>
        <Badge
          variant="secondary"
          className={
            daysSinceRegistration <= 1
              ? "bg-[var(--status-success-bg)] text-[var(--status-success-foreground)] text-xs mt-1"
              : daysSinceRegistration <= 7
                ? "bg-[var(--status-info-bg)] text-[var(--status-info-foreground)] text-xs mt-1"
                : "text-xs mt-1"
          }
        >
          {daysSinceRegistration === 0
            ? tAdmin("common.today")
            : daysSinceRegistration === 1
              ? tAdmin("common.yesterday")
              : tAdmin("overview.relative.daysAgo", { count: daysSinceRegistration })}
        </Badge>
      </div>
    </div>
  );
}

function InviteUsersCard({
  inviterName,
}: {
  inviterName?: string | null;
}) {
  const { tAdmin } = useAdminTranslation();
  const { tap, success, warning } = useHaptics();
  const [emailInput, setEmailInput] = useState("");
  const [isSendingInvite, setIsSendingInvite] = useState(false);

  const inviteEmails = useMemo(() => normalizeInviteEmails(emailInput), [emailInput]);
  const invitePreview = useMemo(
    () => buildInviteEmailPreview({
      emails: inviteEmails,
      inviterName,
      appUrl: window.location.origin,
    }),
    [inviteEmails, inviterName],
  );
  const invalidEmailCount = useMemo(() => {
    if (!emailInput.trim()) return 0;
    const rawItems = emailInput.split(/[\s,;]+/).filter(Boolean);
    return Math.max(rawItems.length - inviteEmails.length, 0);
  }, [emailInput, inviteEmails.length]);

  const handleSendInvite = useCallback(async () => {
    if (!inviteEmails.length) {
      warning();
      toast.error(tAdmin("people.errors.validEmailRequired"));
      return;
    }

    tap();
    setIsSendingInvite(true);
    try {
      const result = await sendInviteEmails(inviteEmails, inviterName || undefined);
      success();
      toast.success(result.message || tAdmin("people.success.inviteSent", { count: result.sent ?? inviteEmails.length }));
      setEmailInput("");
    } catch (error) {
      warning();
      const message = error instanceof Error && error.message === "admin-session-missing"
        ? tAdmin("people.errors.adminSessionMissing")
        : error instanceof Error ? error.message : tAdmin("people.errors.inviteFailed");
      toast.error(message);
    } finally {
      setIsSendingInvite(false);
    }
  }, [inviteEmails, inviterName, success, tAdmin, tap, warning]);

  return (
    <Card className="overflow-hidden rounded-xl border shadow-sm">
      <CardHeader className="border-b bg-muted/30">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="inline-flex size-9 items-center justify-center rounded-lg border bg-background text-primary">
                <MailIcon className="h-4 w-4" />
              </span>
              <CardTitle>{tAdmin("people.inviteTitle")}</CardTitle>
            </div>
            <CardDescription>
              {tAdmin("people.inviteDescription")}
            </CardDescription>
          </div>
          <Badge variant="secondary" className="w-fit">
            {tAdmin("common.preview")}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="grid gap-0 p-0 lg:grid-cols-[380px_minmax(0,1fr)]">
        <div className="space-y-4 border-b bg-muted/10 p-4 lg:border-b-0 lg:border-r">
          <div className="space-y-2">
            <Label htmlFor="invite-emails">{tAdmin("people.inviteRecipients")}</Label>
            <Textarea
              id="invite-emails"
              value={emailInput}
              onChange={(event) => setEmailInput(event.target.value)}
              placeholder="friend@example.com, teammate@example.com"
              className="min-h-32 resize-none rounded-xl font-mono text-sm"
            />
            <p className="text-xs text-muted-foreground">
              {tAdmin("people.inviteHelp")}
            </p>
          </div>

          <div className="flex flex-wrap gap-2 rounded-xl border bg-background p-3">
            {inviteEmails.length ? (
              inviteEmails.map((email) => (
                <Badge key={email} variant="outline" className="max-w-full rounded-md font-normal">
                  {email}
                </Badge>
              ))
            ) : (
              <Badge variant="outline" className="font-normal text-muted-foreground">
                {tAdmin("people.noValidEmails")}
              </Badge>
            )}
          </div>

          {invalidEmailCount > 0 && (
            <p className="text-xs text-[var(--status-warning-foreground)]">
              {tAdmin("people.invalidEmailCount", { count: invalidEmailCount })}
            </p>
          )}

          <Button
            className="w-full cursor-pointer"
            onClick={handleSendInvite}
            disabled={isSendingInvite || inviteEmails.length === 0}
          >
            {isSendingInvite ? <Loader2Icon className="mr-2 h-4 w-4 animate-spin" /> : <SendIcon className="mr-2 h-4 w-4" />}
            {tAdmin("people.sendInvites")}
          </Button>
        </div>

        <div className="min-w-0 bg-slate-100 dark:bg-slate-950/40">
          <div className="flex items-center justify-between gap-3 border-b bg-background px-4 py-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{invitePreview.subject}</p>
              <p className="truncate text-xs text-muted-foreground">{invitePreview.previewText}</p>
            </div>
            <Badge variant="outline" className="shrink-0">
              {tAdmin("common.preview")}
            </Badge>
          </div>
          <div className="grid gap-3 border-b bg-background px-4 py-3 text-sm sm:grid-cols-[72px_minmax(0,1fr)]">
            <span className="text-muted-foreground">{tAdmin("common.from")}</span>
            <span className="truncate">{tAdmin("people.emailSender")}</span>
            <span className="text-muted-foreground">{tAdmin("common.to")}</span>
            <span className="truncate">{inviteEmails.length ? inviteEmails.join(", ") : "email@example.com"}</span>
          </div>
          <div className="h-[460px] p-3">
            <div className="mx-auto h-full max-w-[640px] overflow-hidden rounded-2xl border bg-white shadow-xl ring-1 ring-slate-900/5">
              <div className="flex h-9 items-center justify-between border-b bg-slate-50 px-3">
                <div className="flex items-center gap-1.5" aria-hidden="true">
                  <span className="size-2.5 rounded-full bg-red-400" />
                  <span className="size-2.5 rounded-full bg-amber-400" />
                  <span className="size-2.5 rounded-full bg-emerald-400" />
                </div>
                <MailIcon className="h-3.5 w-3.5 text-slate-500" aria-hidden="true" />
              </div>
              <iframe
                title="FairPay invite email preview"
                srcDoc={invitePreview.html}
                sandbox=""
                className="h-[calc(100%-2.25rem)] w-full bg-white"
              />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}


// ═══════════════════════════════════════════════════════════════════
// ─── USERS TAB ──────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════

function UsersTab() {
  const { tAdmin } = useAdminTranslation();
  const { tap, warning } = useHaptics();
  const { data: identity } = useGetIdentity<Profile>();
  const go = useGo();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300);
  const [roleFilter, setRoleFilter] = useState<string>("all");

  // Detail dialog
  const [selectedUser, setSelectedUser] = useState<AdminUserRow | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  // Delete
  const [deleteUser, setDeleteUser] = useState<AdminUserRow | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Create
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  // Edit
  const [editUser, setEditUser] = useState<AdminUserRow | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isAddingEmail, setIsAddingEmail] = useState(false);
  const [settingPrimaryEmailId, setSettingPrimaryEmailId] = useState<string | null>(null);
  const [removingEmailId, setRemovingEmailId] = useState<string | null>(null);

  // Merge
  const [mergeSourceUser, setMergeSourceUser] = useState<AdminUserRow | null>(null);
  const [mergeDialogOpen, setMergeDialogOpen] = useState(false);
  const [isMerging, setIsMerging] = useState(false);

  // New registrations (7 days)
  const NEW_REG_DAYS = 7;

  // Fetch Users
  const { data: usersData, isLoading } = useQuery({
    queryKey: ["admin", "users"],
    queryFn: async () => {
      const { data, error } = await supabaseClient.rpc("get_admin_users");
      if (error) throw error;
      return (data ?? []) as AdminUserRow[];
    },
    staleTime: 30_000,
  });

  // New Registrations
  const newRegistrations = useMemo(() => {
    if (!usersData) return [];
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - NEW_REG_DAYS);
    return usersData
      .filter((u) => new Date(u.created_at) >= cutoff)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [usersData]);

  // Client-side filtering
  const filteredData = useMemo(() => {
    let result = usersData ?? [];
    if (debouncedSearch) {
      const q = debouncedSearch.toLowerCase();
      result = result.filter((u) => u.full_name?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q));
    }
    if (roleFilter !== "all") {
      result = result.filter((u) => u.role === roleFilter);
    }
    return result;
  }, [usersData, debouncedSearch, roleFilter]);

  const handleToggleJourneyTracking = useCallback(async (user: AdminUserRow) => {
    try {
      const nextIgnored = !user.journey_tracking_ignored;
      const { error } = await supabaseClient.rpc("admin_set_user_tracking_ignore", {
        p_user_id: user.id,
        p_ignore: nextIgnored,
        p_reason: nextIgnored ? "Ignored by admin from Admin People" : null,
      });
      if (error) throw error;

      toast.success(
        nextIgnored
          ? tAdmin("people.success.trackingIgnored", { name: user.full_name })
          : tAdmin("people.success.trackingResumed", { name: user.full_name }),
      );

      queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "users", user.id] });

      if (selectedUser?.id === user.id) {
        setSelectedUser({ ...user, journey_tracking_ignored: nextIgnored });
      }
    } catch (error) {
      toast.error(tAdmin("common.errorWithMessage", { message: error instanceof Error ? error.message : tAdmin("people.errors.updateTrackingFailed") }));
    }
  }, [queryClient, selectedUser, tAdmin]);

  // Columns
  const columns = useMemo<ColumnDef<AdminUserRow>[]>(() => [
    {
      id: "avatar", header: "", accessorKey: "avatar_url", size: 50, enableSorting: false,
      cell: ({ row }) => (
        <UserAvatar
          user={{
            full_name: row.original.full_name,
            avatar_url: row.original.avatar_url,
          }}
          size="md"
        />
      ),
    },
    {
      id: "full_name", header: tAdmin("people.fullName"), accessorKey: "full_name", size: 220,
      cell: ({ row }) => (
        <div className="flex items-center gap-2 min-w-0">
          <span className="truncate">{row.original.full_name}</span>
          <UserGroupStack userId={row.original.id} size="xs" />
        </div>
      ),
    },
    {
      id: "email", header: tAdmin("common.email"), accessorKey: "email", size: 220,
      cell: ({ row }) => {
        const extra = (row.original.emails ?? []).filter((e) => !e.is_primary);
        return (
          <div className="space-y-0.5">
            <div className="flex min-w-0 items-center gap-1.5">
              <p className="truncate text-sm" translate="no">{row.original.email}</p>
              <Badge variant="outline" className="h-4 shrink-0 px-1.5 py-0 text-[10px]">
                {tAdmin("people.primaryEmail")}
              </Badge>
            </div>
            {extra.length > 0 && (
              <p className="text-xs text-muted-foreground/70 truncate" translate="no">
                +{extra.length} {extra.length === 1 ? "more" : "more"}
              </p>
            )}
          </div>
        );
      },
    },
    {
      id: "role", header: tAdmin("common.role"), accessorFn: (row) => row.role, size: 100,
      cell: ({ row }) => (
        <Badge variant={row.original.role === "admin" ? "default" : "secondary"}>
          {formatSystemRole(row.original.role, tAdmin("common.user"))}
        </Badge>
      ),
    },
    {
      id: "journey_tracking_ignored", header: tAdmin("people.journeyTracking"), accessorFn: (row) => row.journey_tracking_ignored, size: 120,
      cell: ({ row }) => (
        <Badge variant={row.original.journey_tracking_ignored ? "outline" : "secondary"}>
          {row.original.journey_tracking_ignored ? tAdmin("status.ignored") : tAdmin("status.tracked")}
        </Badge>
      ),
    },
    {
      id: "created_at", header: tAdmin("common.createdAt"), accessorKey: "created_at", size: 160,
      cell: ({ getValue }) => {
        const dateStr = getValue() as string;
        const daysSince = Math.floor((Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24));
        const isNew = daysSince <= NEW_REG_DAYS;
        return (
          <div className="flex items-center gap-1.5">
            <span>{formatDate(dateStr)}</span>
            {isNew && (
              <Badge
                variant="secondary"
                className={
                  daysSince <= 1
                    ? "bg-[var(--status-success-bg)] text-[var(--status-success-foreground)] text-[10px] leading-none px-1.5 py-0.5"
                    : "bg-[var(--status-info-bg)] text-[var(--status-info-foreground)] text-[10px] leading-none px-1.5 py-0.5"
                }
              >
                {daysSince === 0 ? tAdmin("common.today") : daysSince === 1 ? tAdmin("common.yesterday") : tAdmin("common.recent")}
              </Badge>
            )}
          </div>
        );
      },
    },
    {
      id: "actions", header: "", size: 50, enableSorting: false,
      cell: ({ row }) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreHorizontalIcon className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => { tap(); setSelectedUser(row.original); setDetailOpen(true); }}>
              <EyeIcon className="mr-2 h-4 w-4" />
              {tAdmin("common.details")}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => { tap(); go({ to: `/admin/people/${row.original.id}/journey` }); }}>
              <ActivityIcon className="mr-2 h-4 w-4" />
              {tAdmin("people.viewJourney")}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => { tap(); void handleToggleJourneyTracking(row.original); }}>
              {row.original.journey_tracking_ignored
                ? <><EyeIcon className="mr-2 h-4 w-4" />{tAdmin("people.resumeTracking")}</>
                : <><EyeOffIcon className="mr-2 h-4 w-4" />{tAdmin("people.ignoreTracking")}</>}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => { tap(); setEditUser(row.original); setEditDialogOpen(true); }}>
              <PencilIcon className="mr-2 h-4 w-4" />
              {tAdmin("common.edit")}
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => { warning(); setMergeSourceUser(row.original); setMergeDialogOpen(true); }}
              disabled={identity?.id === row.original.id}
            >
              <UsersIcon className="mr-2 h-4 w-4" />
              {identity?.id === row.original.id ? tAdmin("people.cannotMergeSelf") : tAdmin("people.mergeProfile")}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => { warning(); setDeleteUser(row.original); setDeleteDialogOpen(true); }} disabled={identity?.id === row.original.id} className="text-destructive">
              <Trash2Icon className="mr-2 h-4 w-4" />
              {identity?.id === row.original.id ? tAdmin("people.cannotDeleteSelf") : tAdmin("people.deleteUser")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ], [go, identity?.id, tap, warning, handleToggleJourneyTracking, tAdmin]);

  const [sorting, setSorting] = useState<SortingState>([{ id: "created_at", desc: true }]);

  const reactTable = useReactTable({
    data: filteredData,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    initialState: { pagination: { pageSize: 10 } },
  });

  // Handlers
  const handleToggleRole = useCallback((user: AdminUserRow) => {
    if (identity?.id === user.id) { toast.warning(tAdmin("people.errors.selfRoleChange")); return; }
    const newRole = user.role === "admin" ? "user" : "admin";
    (async () => {
      try {
        const { error } = await supabaseClient.rpc("admin_update_user_role", {
          p_user_id: user.id,
          p_new_role: newRole,
        });
        if (error) throw error;
        toast.success(tAdmin("people.success.roleChanged", {
          action: newRole === "admin" ? tAdmin("people.rolePromotedAction") : tAdmin("people.roleDemotedAction"),
          name: user.full_name,
        }));
        queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
      } catch (error) {
        toast.error(tAdmin("common.errorWithMessage", { message: error instanceof Error ? error.message : tAdmin("people.errors.changeRoleFailed") }));
      }
    })();
  }, [identity?.id, queryClient, tAdmin]);

  const handleDeleteUser = useCallback(async () => {
    if (!deleteUser) return;
    setIsDeleting(true);
    try {
      const { error } = await supabaseClient.from("profiles").delete().eq("id", deleteUser.id);
      if (error) throw error;
      toast.success(tAdmin("people.success.userDeleted", { name: deleteUser.full_name }));
      setDeleteDialogOpen(false); setDeleteUser(null);
      queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
    } catch (err: unknown) {
      toast.error(tAdmin("common.errorWithMessage", { message: getErrorMessage(err, tAdmin("people.errors.deleteUserFailed")) }));
    } finally { setIsDeleting(false); }
  }, [deleteUser, queryClient, tAdmin]);

  const handleCreateUser = useCallback(async (data: CreateUserFormValues) => {
    setIsCreating(true);
    try {
      const { error } = await supabaseClient.rpc("admin_create_profile", {
        p_full_name: data.full_name,
        p_email: data.email,
        p_role: data.role,
        p_avatar_url: data.avatar_url ?? null,
      });
      if (error) throw error;
      toast.success(tAdmin("people.success.userCreated", { name: data.full_name }));
      setCreateDialogOpen(false);
      queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
    } catch (err: unknown) {
      toast.error(tAdmin("common.errorWithMessage", { message: getErrorMessage(err, tAdmin("people.errors.createUserFailed")) }));
    } finally { setIsCreating(false); }
  }, [queryClient, tAdmin]);

  const handleMergeUser = useCallback(async (targetUserId: string) => {
    if (!mergeSourceUser || !targetUserId || mergeSourceUser.id === targetUserId) return;
    setIsMerging(true);
    try {
      const { error } = await supabaseClient.rpc("admin_merge_profiles", {
        p_source_user_id: mergeSourceUser.id,
        p_target_user_id: targetUserId,
      });
      if (error) throw error;

      toast.success(tAdmin("people.success.userMerged", { name: mergeSourceUser.full_name }));
      setMergeDialogOpen(false);
      setMergeSourceUser(null);
      if (selectedUser?.id === mergeSourceUser.id) {
        setDetailOpen(false);
        setSelectedUser(null);
      }
      queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
    } catch (err: unknown) {
      toast.error(tAdmin("common.errorWithMessage", { message: getErrorMessage(err, tAdmin("people.errors.mergeUserFailed")) }));
    } finally {
      setIsMerging(false);
    }
  }, [mergeSourceUser, queryClient, selectedUser?.id, tAdmin]);

  const handleEditUser = useCallback(async (data: {
    full_name: string;
    primary_email_id: string | null;
    avatar_url: string | null;
    role: "admin" | "moderator" | "user";
    journey_tracking_ignored: boolean;
  }) => {
    if (!editUser) return;
    setIsUpdating(true);
    try {
      const { error } = await supabaseClient
        .from("profiles")
        .update({
          full_name: data.full_name,
          avatar_url: data.avatar_url,
        })
        .eq("id", editUser.id);
      if (error) throw error;

      const currentPrimaryEmailId = editUser.emails?.find((email) => email.is_primary)?.id ?? null;
      if (data.primary_email_id && data.primary_email_id !== currentPrimaryEmailId) {
        const { error: primaryEmailError } = await supabaseClient.rpc("set_primary_user_email", {
          p_email_id: data.primary_email_id,
        });
        if (primaryEmailError) throw primaryEmailError;
      }

      if (identity?.id !== editUser.id && data.role !== editUser.role) {
        const { error: roleError } = await supabaseClient.rpc("admin_update_user_role", {
          p_user_id: editUser.id,
          p_new_role: data.role,
        });
        if (roleError) throw roleError;
      }

      if (data.journey_tracking_ignored !== editUser.journey_tracking_ignored) {
        const { error: trackingError } = await supabaseClient.rpc("admin_set_user_tracking_ignore", {
          p_user_id: editUser.id,
          p_ignore: data.journey_tracking_ignored,
          p_reason: data.journey_tracking_ignored ? "Ignored by admin from Admin People edit dialog" : null,
        });
        if (trackingError) throw trackingError;
      }

      toast.success(tAdmin("people.success.userUpdated", { name: data.full_name }));
      setEditDialogOpen(false); setEditUser(null);
      queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
    } catch (err: unknown) {
      toast.error(tAdmin("common.errorWithMessage", { message: getErrorMessage(err, tAdmin("people.errors.updateUserFailed")) }));
    } finally { setIsUpdating(false); }
  }, [editUser, identity?.id, queryClient, tAdmin]);

  const updateAdminUserInCache = useCallback((userId: string, updater: (user: AdminUserRow) => AdminUserRow) => {
    const applyUpdate = (user: AdminUserRow | null) => (user?.id === userId ? updater(user) : user);

    setSelectedUser((current) => applyUpdate(current));
    setEditUser((current) => applyUpdate(current));
    queryClient.setQueryData<AdminUserRow[]>(["admin", "users"], (current) =>
      current?.map((user) => (user.id === userId ? updater(user) : user)),
    );
  }, [queryClient]);

  const handleSetPrimaryEmail = useCallback(async (user: AdminUserRow, emailId: string) => {
    setSettingPrimaryEmailId(emailId);
    try {
      const { error } = await supabaseClient.rpc("set_primary_user_email", {
        p_email_id: emailId,
      });
      if (error) throw error;

      const primaryEmail = user.emails?.find((email) => email.id === emailId);
      updateAdminUserInCache(user.id, (current) => ({
        ...current,
        email: primaryEmail?.email ?? current.email,
        emails: current.emails?.map((email) => ({
          ...email,
          is_primary: email.id === emailId,
        })),
      }));
      await queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
      toast.success(tAdmin("people.success.primaryEmailUpdated", { email: primaryEmail?.email ?? user.email }));
    } catch (err: unknown) {
      toast.error(tAdmin("common.errorWithMessage", {
        message: getErrorMessage(err, tAdmin("people.errors.updatePrimaryEmailFailed")),
      }));
    } finally {
      setSettingPrimaryEmailId(null);
    }
  }, [queryClient, tAdmin, updateAdminUserInCache]);

  const handleAddEmail = useCallback(async (user: AdminUserRow, email: string, makePrimary: boolean) => {
    setIsAddingEmail(true);
    try {
      const { data, error } = await supabaseClient.rpc("add_user_email", {
        p_email: email,
        p_user_id: user.id,
        p_make_primary: makePrimary,
      });
      if (error) throw error;
      if (!data) throw new Error("No email row returned");

      const addedEmail = data as NonNullable<AdminUserRow["emails"]>[number] & { normalized_email?: string };
      updateAdminUserInCache(user.id, (current) => {
        const nextEmail = {
          id: addedEmail.id,
          email: addedEmail.email,
          is_primary: addedEmail.is_primary || !(current.emails ?? []).some((entry) => entry.is_primary),
          receives_notifications: addedEmail.receives_notifications,
          is_verified: addedEmail.is_verified,
          source: addedEmail.source ?? "user",
        };
        const otherEmails = (current.emails ?? []).filter((entry) => entry.id !== nextEmail.id);
        const emails = nextEmail.is_primary
          ? otherEmails.map((entry) => ({ ...entry, is_primary: false })).concat(nextEmail)
          : otherEmails.concat(nextEmail);
        const primary = emails.find((entry) => entry.is_primary) ?? nextEmail;
        return {
          ...current,
          email: primary.email,
          emails,
        };
      });
      await queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
      toast.success(tAdmin("people.success.emailAdded", { email: addedEmail.email }));
    } catch (err: unknown) {
      toast.error(tAdmin("common.errorWithMessage", {
        message: getErrorMessage(err, tAdmin("people.errors.addEmailFailed")),
      }));
      throw err;
    } finally {
      setIsAddingEmail(false);
    }
  }, [queryClient, tAdmin, updateAdminUserInCache]);

  const handleRemoveEmail = useCallback(async (user: AdminUserRow, emailId: string) => {
    setRemovingEmailId(emailId);
    try {
      const { error } = await supabaseClient.rpc("remove_user_email", {
        p_email_id: emailId,
      });
      if (error) throw error;

      updateAdminUserInCache(user.id, (current) => {
        const emails = (current.emails ?? []).filter((entry) => entry.id !== emailId);
        const primary = emails.find((entry) => entry.is_primary);
        return {
          ...current,
          email: primary?.email ?? current.email,
          emails,
        };
      });
      await queryClient.invalidateQueries({ queryKey: ["admin", "users"] });
      const removedEmail = user.emails?.find((entry) => entry.id === emailId);
      toast.success(tAdmin("people.success.emailRemoved", { email: removedEmail?.email ?? tAdmin("common.unknown") }));
    } catch (err: unknown) {
      toast.error(tAdmin("common.errorWithMessage", {
        message: getErrorMessage(err, tAdmin("people.errors.removeEmailFailed")),
      }));
      throw err;
    } finally {
      setRemovingEmailId(null);
    }
  }, [queryClient, tAdmin, updateAdminUserInCache]);

  const clearFilters = useCallback(() => { setSearch(""); setRoleFilter("all"); }, []);
  const hasActiveFilters = search !== "" || roleFilter !== "all";
  const isEmptyResult = !isLoading && reactTable.getRowModel().rows.length === 0;
  const visibleUsers = reactTable.getRowModel().rows.map((row) => row.original);

  return (
    <>
      <div className="space-y-4">
        {/* ── New Registrations Collapsible ──────────────────────── */}
        {!isLoading && newRegistrations.length > 0 && (
          <Collapsible defaultOpen>
            <Card>
              <CardHeader className="pb-3">
                <CollapsibleTrigger className="flex w-full items-center justify-between [&[data-state=open]>svg]:rotate-180">
                  <div className="flex items-center gap-2">
                    <UserPlusIcon className="h-4 w-4 text-[var(--status-success-foreground)]" />
                    <CardTitle className="text-base">{tAdmin("people.newRegistrationsTitle")}</CardTitle>
                    <Badge variant="secondary" className="bg-[var(--status-success-bg)] text-[var(--status-success-foreground)] text-xs">
                      {newRegistrations.length}
                    </Badge>
                  </div>
                  <ChevronDownIcon className="h-4 w-4 text-muted-foreground transition-transform duration-200" />
                </CollapsibleTrigger>
                <CardDescription>{tAdmin("people.newRegistrationsDescription", { days: NEW_REG_DAYS })}</CardDescription>
              </CardHeader>
              <CollapsibleContent>
                <CardContent className="pt-0">
                  <AnimatedList items={newRegistrations}>
                    {newRegistrations.map((user, index) => (
                      <AnimatedRow key={user.id} index={index}>
                        <NewRegistrationCard
                          user={user}
                          onViewDetail={() => {
                            setSelectedUser(user);
                            setDetailOpen(true);
                          }}
                        />
                      </AnimatedRow>
                    ))}
                  </AnimatedList>
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>
        )}

        {/* ── Users Table ────────────────────────────────────────── */}

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
            <div>
              <CardTitle>{tAdmin("people.usersCardTitle")}</CardTitle>
              <CardDescription>{tAdmin("people.usersCardDescription")}</CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <AdminPageToolbar
              search={search}
              onSearchChange={setSearch}
              searchPlaceholder={tAdmin("people.userSearchPlaceholder")}
              filterCount={roleFilter !== "all" ? 1 : 0}
              onFilterToggle={() => {}}
              actions={
                <Button size="sm" onClick={() => { tap(); setCreateDialogOpen(true); }}>
                  <PlusIcon className="mr-2 h-4 w-4" />
                  {tAdmin("people.createUserSubmit")}
                </Button>
              }
            />
            <AdminFilterChips
              filters={[
                ...(roleFilter !== "all"
                  ? [{ key: "role", label: tAdmin("people.roleFilter", { role: formatSystemRole(roleFilter as "admin" | "moderator" | "user", tAdmin("common.user")) }), onRemove: () => { tap(); setRoleFilter("all"); } }]
                  : []),
              ]}
              onClearAll={() => { tap(); clearFilters(); }}
            />

            {isLoading ? (
              <AdminTableSkeleton rows={7} columns={6} />
            ) : isEmptyResult && hasActiveFilters ? (
              <AdminEmptyState
                icon={<UsersIcon className="h-8 w-8" />}
                title={tAdmin("people.noUsersTitle")}
                description={tAdmin("people.noUsersDescription")}
                action={{ label: tAdmin("common.clearFilters"), onClick: clearFilters }}
              />
            ) : (
              <>
                <div className="hidden overflow-x-auto rounded-md border md:block">
                  <Table>
                    <TableHeader>
                      {reactTable.getHeaderGroups().map((headerGroup) => (
                        <TableRow key={headerGroup.id}>
                          {headerGroup.headers.map((header) => (
                            <TableHead key={header.id} style={{ width: header.getSize() }}>
                              {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                            </TableHead>
                          ))}
                        </TableRow>
                      ))}
                    </TableHeader>
                    <TableBody>
                      {reactTable.getRowModel().rows.length ? (
                        reactTable.getRowModel().rows.map((row) => (
                          <TableRow key={row.original?.id ?? row.id}>
                            {row.getVisibleCells().map((cell) => (
                              <TableCell key={cell.id} style={{ width: cell.column.getSize() }}>
                                <div className="truncate">{flexRender(cell.column.columnDef.cell, cell.getContext())}</div>
                              </TableCell>
                            ))}
                          </TableRow>
                        ))
                      ) : (
                        <TableRow><TableCell colSpan={columns.length} className="h-24 text-center">{tAdmin("common.noData")}</TableCell></TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>

                <div className="md:hidden">
                  <AdminMobileCards
                    items={visibleUsers}
                    getKey={(user) => user.id}
                    renderItem={(user) => (
                      <AdminMobileCard
                        title={user.full_name}
                        description={user.email}
                        leading={
                          <UserAvatar
                            user={{ full_name: user.full_name, avatar_url: user.avatar_url }}
                            size="md"
                          />
                        }
                        badges={
                          <>
                            <Badge variant={user.role === "admin" ? "default" : "secondary"}>
                              {formatSystemRole(user.role, tAdmin("common.user"))}
                            </Badge>
                            <Badge variant={user.journey_tracking_ignored ? "outline" : "secondary"}>
                              {user.journey_tracking_ignored ? tAdmin("status.ignored") : tAdmin("status.tracked")}
                            </Badge>
                          </>
                        }
                        meta={[
                          { label: tAdmin("common.createdAt"), value: formatDate(user.created_at) },
                          { label: "ID", value: <span className="font-mono text-xs">{user.id.slice(0, 8)}</span> },
                        ]}
                        actions={
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-9 w-9 cursor-pointer">
                                <MoreHorizontalIcon className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => { tap(); setSelectedUser(user); setDetailOpen(true); }}>
                                {tAdmin("common.details")}
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => { tap(); go({ to: `/admin/people/${user.id}/journey` }); }}>
                                <ActivityIcon className="mr-2 h-4 w-4" />
                                {tAdmin("people.viewJourney")}
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => { tap(); void handleToggleJourneyTracking(user); }}>
                                {user.journey_tracking_ignored ? tAdmin("people.resumeTracking") : tAdmin("people.ignoreTracking")}
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => { tap(); setEditUser(user); setEditDialogOpen(true); }}>
                                <PencilIcon className="mr-2 h-4 w-4" />
                                {tAdmin("common.edit")}
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => { warning(); setMergeSourceUser(user); setMergeDialogOpen(true); }}
                                disabled={identity?.id === user.id}
                              >
                                <UsersIcon className="mr-2 h-4 w-4" />
                                {identity?.id === user.id ? tAdmin("people.cannotMergeSelf") : tAdmin("people.mergeProfile")}
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => { warning(); setDeleteUser(user); setDeleteDialogOpen(true); }}
                                disabled={identity?.id === user.id}
                                className="text-destructive"
                              >
                                {identity?.id === user.id ? tAdmin("people.cannotDeleteSelf") : tAdmin("people.deleteUser")}
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        }
                        onClick={() => { tap(); setSelectedUser(user); setDetailOpen(true); }}
                        ariaLabel={user.full_name}
                      />
                    )}
                  />
                </div>
              </>
            )}

            {!isLoading && reactTable.getRowModel().rows.length > 0 && (
              <div className="hidden items-center justify-between md:flex">
                <p className="text-sm text-muted-foreground">{tAdmin("common.pageCount", { page: reactTable.getState().pagination.pageIndex + 1, total: reactTable.getPageCount() })}</p>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={() => reactTable.previousPage()} disabled={!reactTable.getCanPreviousPage()}>{tAdmin("common.previous")}</Button>
                  <Button variant="outline" size="sm" onClick={() => reactTable.nextPage()} disabled={!reactTable.getCanNextPage()}>{tAdmin("common.next")}</Button>
                </div>
              </div>
            )}
            {!isLoading && reactTable.getRowModel().rows.length > 0 && (
              <div className="md:hidden">
                <AdminMobilePagination
                  summary={tAdmin("common.pageCount", { page: reactTable.getState().pagination.pageIndex + 1, total: reactTable.getPageCount() })}
                  previousLabel={tAdmin("common.previous")}
                  nextLabel={tAdmin("common.next")}
                  canPrevious={reactTable.getCanPreviousPage()}
                  canNext={reactTable.getCanNextPage()}
                  onPrevious={() => reactTable.previousPage()}
                  onNext={() => reactTable.nextPage()}
                />
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <UserDetailDialog
        user={selectedUser}
        open={detailOpen}
        onOpenChange={setDetailOpen}
        onViewJourney={() => {
          if (!selectedUser) return;
          tap();
          setDetailOpen(false);
          go({ to: `/admin/people/${selectedUser.id}/journey` });
        }}
        onSetPrimaryEmail={(emailId) => {
          if (selectedUser) void handleSetPrimaryEmail(selectedUser, emailId);
        }}
        onAddEmail={(email, makePrimary) => {
          if (!selectedUser) return Promise.resolve();
          return handleAddEmail(selectedUser, email, makePrimary);
        }}
        onRemoveEmail={(emailId) => {
          if (!selectedUser) return;
          void handleRemoveEmail(selectedUser, emailId);
        }}
        isAddingEmail={isAddingEmail}
        settingPrimaryEmailId={settingPrimaryEmailId}
        removingEmailId={removingEmailId}
        onToggleJourneyTracking={() => {
          if (!selectedUser) return;
          void handleToggleJourneyTracking(selectedUser);
        }}
        onEdit={() => { setDetailOpen(false); setEditUser(selectedUser); setEditDialogOpen(true); }}
        onToggleRole={() => { if (selectedUser) handleToggleRole(selectedUser); }}
        onMerge={() => {
          if (!selectedUser) return;
          warning();
          setDetailOpen(false);
          setMergeSourceUser(selectedUser);
          setMergeDialogOpen(true);
        }}
        onDelete={() => { setDetailOpen(false); setDeleteUser(selectedUser); setDeleteDialogOpen(true); }}
        isSelf={identity?.id === selectedUser?.id}
      />
      <DeleteConfirmDialog
        title={tAdmin("people.deleteUserTitle")}
        description={tAdmin("people.deleteUserDescription", { name: deleteUser?.full_name ?? "", email: deleteUser?.email ?? "" })}
        open={deleteDialogOpen}
        onOpenChange={(o) => { if (!o && !isDeleting) { setDeleteDialogOpen(false); setDeleteUser(null); } }}
        onConfirm={handleDeleteUser}
        isDeleting={isDeleting}
      />
      <CreateUserDialog key={createDialogOpen ? "create-user-open" : "create-user-closed"} open={createDialogOpen} onOpenChange={setCreateDialogOpen} onSubmit={handleCreateUser} isCreating={isCreating} />
      <EditUserDialog
        key={editUser?.id ?? "edit-user-empty"}
        user={editUser}
        open={editDialogOpen}
        onOpenChange={(o) => { if (!o && !isUpdating) { setEditDialogOpen(false); setEditUser(null); } }}
        onSubmit={handleEditUser}
        isUpdating={isUpdating}
        isSelf={identity?.id === editUser?.id}
      />
      <MergeUserDialog
        sourceUser={mergeSourceUser}
        users={usersData ?? []}
        open={mergeDialogOpen}
        onOpenChange={(open) => {
          if (!open && !isMerging) {
            setMergeDialogOpen(false);
            setMergeSourceUser(null);
          }
        }}
        onConfirm={handleMergeUser}
        isMerging={isMerging}
      />
    </>
  );
}

// ═══════════════════════════════════════════════════════════════════
// ─── GROUPS TAB ─────────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════

function GroupsTab() {
  const { tAdmin } = useAdminTranslation();
  const { tap, warning } = useHaptics();
  const { data: identity } = useGetIdentity<Profile>();
  const deleteMutation = useInstantDelete();
  const updateMutation = useInstantUpdate();

  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300);

  // Detail dialog
  const [selectedGroup, setSelectedGroup] = useState<GroupRow | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  // Delete
  const [deleteGroup, setDeleteGroup] = useState<GroupRow | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Edit
  const [editGroup, setEditGroup] = useState<GroupRow | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  // Create
  const [createGroupOpen, setCreateGroupOpen] = useState(false);

  // Archive
  const [isArchiving, setIsArchiving] = useState(false);

  const filters = useMemo<CrudFilters>(() => {
    const f: CrudFilters = [];
    if (debouncedSearch) f.push({ field: "name", operator: "contains", value: debouncedSearch });
    return f;
  }, [debouncedSearch]);

  const columns = useMemo<ColumnDef<GroupRow>[]>(() => [
    {
      id: "name", header: tAdmin("people.groupName"), accessorKey: "name", size: 220,
      cell: ({ row }) => (
        <div className="flex items-center gap-2.5">
          <Avatar className="h-8 w-8 shrink-0">
            <AvatarImage src={row.original.avatar_url ?? undefined} alt={row.original.name} />
            <AvatarFallback className="text-xs bg-primary/10 text-primary">
              {row.original.name?.[0]?.toUpperCase() ?? "?"}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-medium truncate">{row.original.name}</span>
              {row.original.is_archived && (
                <Badge className="bg-[var(--status-warning-bg)] text-[var(--status-warning-foreground)] text-[10px] px-1.5 py-0">
                  {tAdmin("status.archived")}
                </Badge>
              )}
            </div>
            {row.original.description && (
              <p className="text-xs text-muted-foreground truncate max-w-[180px]">{row.original.description}</p>
            )}
          </div>
        </div>
      ),
    },
    {
      id: "creator", header: tAdmin("people.creator"), accessorKey: "creator_name", size: 160, enableSorting: false,
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <Avatar className="h-7 w-7">
            <AvatarImage src={row.original.creator_avatar ?? undefined} alt={row.original.creator_name} />
            <AvatarFallback className="text-xs">{row.original.creator_name?.[0]?.toUpperCase() ?? "?"}</AvatarFallback>
          </Avatar>
          <span className="text-sm">{row.original.creator_name}</span>
        </div>
      ),
    },
    {
      id: "member_count", header: tAdmin("common.members"), accessorKey: "member_count", size: 90,
      cell: ({ getValue }) => <Badge variant="secondary">{getValue() as number}</Badge>,
    },
    {
      id: "total_expenses", header: () => <div className="text-right">{tAdmin("people.totalExpenses")}</div>, accessorKey: "total_expenses", size: 130,
      cell: ({ getValue }) => <div className="text-right font-mono tabular-nums">{formatNumber(getValue() as number)}</div>,
    },
    {
      id: "created_at", header: tAdmin("common.createdAt"), accessorKey: "created_at", size: 110,
      cell: ({ getValue }) => formatDate(getValue() as string),
    },
    {
      id: "actions", header: "", size: 50, enableSorting: false,
      cell: ({ row }) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontalIcon className="h-4 w-4" /></Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => { tap(); setSelectedGroup(row.original); setDetailOpen(true); }}>{tAdmin("common.details")}</DropdownMenuItem>
            <DropdownMenuItem onClick={() => { tap(); setEditGroup(row.original); setEditDialogOpen(true); }}>
              <PencilIcon className="mr-2 h-4 w-4" />{tAdmin("people.editGroup")}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleArchiveToggle(row.original)} disabled={isArchiving}>
              {row.original.is_archived ? (
                <><ArchiveRestoreIcon className="mr-2 h-4 w-4" />{tAdmin("people.restore")}</>
              ) : (
                <><ArchiveIcon className="mr-2 h-4 w-4" />{tAdmin("people.archive")}</>
              )}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => { warning(); setDeleteGroup(row.original); setDeleteDialogOpen(true); }} className="text-destructive">{tAdmin("people.deleteGroup")}</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ], [isArchiving, tAdmin, tap, warning]);

  const table = useTable<GroupRow>({
    columns,
    refineCoreProps: {
      resource: "groups",
      meta: { select: "*, profiles!groups_created_by_fkey(full_name, avatar_url), group_members(count)" },
      pagination: { pageSize: 10 },
      filters: { permanent: filters },
      sorters: { initial: [{ field: "created_at", order: "desc" }] },
      queryOptions: {
        select: (data) => ({
          ...data,
          data: (data.data as GroupListRecord[]).map((group) => ({
            id: group.id,
            name: group.name ?? "",
            description: group.description ?? null,
            avatar_url: group.avatar_url ?? null,
            created_by: group.created_by ?? "",
            creator_name: group.profiles?.full_name ?? tAdmin("common.unknown"),
            creator_avatar: group.profiles?.avatar_url ?? null,
            member_count: group.group_members?.[0]?.count ?? 0,
            total_expenses: group.total_expenses ?? 0,
            is_archived: group.is_archived ?? false,
            created_at: group.created_at,
          })),
        }),
      },
    },
  });

  const handleDelete = useCallback(() => {
    if (!deleteGroup) return;
    setIsDeleting(true);
    deleteMutation.mutate(
      { resource: "groups", id: deleteGroup.id },
      {
        onSuccess: () => { toast.success(tAdmin("people.success.groupDeleted", { name: deleteGroup.name })); setDeleteDialogOpen(false); setDeleteGroup(null); setIsDeleting(false); table.refineCore.tableQuery.refetch(); },
        onError: (error) => { toast.error(tAdmin("common.errorWithMessage", { message: error.message })); setIsDeleting(false); },
      },
    );
  }, [deleteGroup, deleteMutation, table.refineCore.tableQuery, tAdmin]);

  const handleEdit = useCallback((data: { name: string; description: string; avatar_url: string | null }) => {
    if (!editGroup || !data.name) return;
    setIsUpdating(true);
    updateMutation.mutate(
      {
        resource: "groups",
        id: editGroup.id,
        values: {
          name: data.name,
          description: data.description || null,
          avatar_url: data.avatar_url,
        },
      },
      {
        onSuccess: () => { toast.success(tAdmin("people.success.groupUpdated", { name: data.name })); setEditDialogOpen(false); setEditGroup(null); setIsUpdating(false); table.refineCore.tableQuery.refetch(); },
        onError: (error) => { toast.error(tAdmin("common.errorWithMessage", { message: error.message })); setIsUpdating(false); },
      },
    );
  }, [editGroup, updateMutation, table.refineCore.tableQuery, tAdmin]);

  const handleArchiveToggle = useCallback((group: GroupRow) => {
    setIsArchiving(true);
    const newArchived = !group.is_archived;
    updateMutation.mutate(
      {
        resource: "groups",
        id: group.id,
        values: {
          is_archived: newArchived,
          archived_at: newArchived ? new Date().toISOString() : null,
          archived_by: newArchived ? identity?.id ?? null : null,
        },
      },
      {
        onSuccess: () => {
          toast.success(newArchived
            ? tAdmin("people.success.groupArchived", { name: group.name })
            : tAdmin("people.success.groupRestored", { name: group.name }));
          setIsArchiving(false);
          table.refineCore.tableQuery.refetch();
          // Also refresh detail dialog if open
          if (detailOpen && selectedGroup?.id === group.id) {
            setSelectedGroup({ ...group, is_archived: newArchived });
          }
        },
        onError: (error) => { toast.error(tAdmin("common.errorWithMessage", { message: error.message })); setIsArchiving(false); },
      },
    );
  }, [detailOpen, identity?.id, selectedGroup, table.refineCore.tableQuery, tAdmin, updateMutation]);

  const clearFilters = useCallback(() => setSearch(""), []);
  const hasActiveFilters = search !== "";
  const isEmptyResult = !table.refineCore.tableQuery.isLoading && table.reactTable.getRowModel().rows.length === 0;
  const visibleGroups = table.reactTable.getRowModel().rows.map((row) => row.original);

  return (
    <>


      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <div>
            <CardTitle>{tAdmin("people.groupsCardTitle")}</CardTitle>
            <CardDescription>{tAdmin("people.groupsCardDescription")}</CardDescription>
          </div>
          <Button size="sm" onClick={() => { tap(); setCreateGroupOpen(true); }}>
            <PlusIcon className="mr-2 h-4 w-4" />
            {tAdmin("people.createGroupSubmit")}
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          <AdminPageToolbar
            search={search}
            onSearchChange={setSearch}
            searchPlaceholder={tAdmin("people.groupSearchPlaceholder")}
          />
          {table.refineCore.tableQuery.isLoading ? (
            <AdminTableSkeleton rows={7} columns={6} />
          ) : isEmptyResult && hasActiveFilters ? (
            <AdminEmptyState
              icon={<GroupIcon className="h-8 w-8" />}
              title={tAdmin("people.noGroupsTitle")}
              description={tAdmin("people.noGroupsDescription")}
              action={{ label: tAdmin("common.clearFilters"), onClick: clearFilters }}
            />
          ) : (
            <>
              <div className="hidden md:block">
                <DataTable table={table} />
              </div>
              <div className="space-y-3 md:hidden">
                <AdminMobileCards
                  items={visibleGroups}
                  getKey={(group) => group.id}
                  renderItem={(group) => (
                    <AdminMobileCard
                      title={group.name}
                      description={group.description || tAdmin("people.createdBy", { name: group.creator_name, date: formatDate(group.created_at) })}
                      leading={
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={group.avatar_url ?? undefined} alt={group.name} />
                          <AvatarFallback className="text-sm bg-primary/10 text-primary">
                            {group.name?.[0]?.toUpperCase() ?? "?"}
                          </AvatarFallback>
                        </Avatar>
                      }
                      badges={group.is_archived ? (
                        <Badge className="bg-[var(--status-warning-bg)] text-[var(--status-warning-foreground)] text-xs">
                          {tAdmin("status.archived")}
                        </Badge>
                      ) : undefined}
                      meta={[
                        { label: tAdmin("common.members"), value: group.member_count },
                        { label: tAdmin("people.totalExpenses"), value: <span className="font-mono tabular-nums">{formatNumber(group.total_expenses)}</span> },
                        { label: tAdmin("people.creator"), value: group.creator_name },
                        { label: tAdmin("common.createdAt"), value: formatDate(group.created_at) },
                      ]}
                      actions={
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-9 w-9 cursor-pointer">
                              <MoreHorizontalIcon className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => { tap(); setSelectedGroup(group); setDetailOpen(true); }}>{tAdmin("common.details")}</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => { tap(); setEditGroup(group); setEditDialogOpen(true); }}>
                              <PencilIcon className="mr-2 h-4 w-4" />{tAdmin("people.editGroup")}
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleArchiveToggle(group)}>
                              {group.is_archived ? (
                                <><ArchiveRestoreIcon className="mr-2 h-4 w-4" />{tAdmin("people.restore")}</>
                              ) : (
                                <><ArchiveIcon className="mr-2 h-4 w-4" />{tAdmin("people.archive")}</>
                              )}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => { warning(); setDeleteGroup(group); setDeleteDialogOpen(true); }} className="text-destructive">{tAdmin("people.deleteGroup")}</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      }
                      onClick={() => { tap(); setSelectedGroup(group); setDetailOpen(true); }}
                      ariaLabel={group.name}
                    />
                  )}
                />
                {visibleGroups.length > 0 && (
                  <AdminMobilePagination
                    summary={tAdmin("common.pageCount", { page: table.refineCore.currentPage, total: table.refineCore.pageCount })}
                    previousLabel={tAdmin("common.previous")}
                    nextLabel={tAdmin("common.next")}
                    canPrevious={table.refineCore.currentPage > 1}
                    canNext={table.refineCore.currentPage < table.refineCore.pageCount}
                    onPrevious={() => table.refineCore.setCurrentPage(table.refineCore.currentPage - 1)}
                    onNext={() => table.refineCore.setCurrentPage(table.refineCore.currentPage + 1)}
                  />
                )}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <GroupDetailDialog
        group={selectedGroup}
        open={detailOpen}
        onOpenChange={setDetailOpen}
        onEdit={() => { setDetailOpen(false); setEditGroup(selectedGroup); setEditDialogOpen(true); }}
        onDelete={() => { setDetailOpen(false); setDeleteGroup(selectedGroup); setDeleteDialogOpen(true); }}
        onArchiveToggle={() => { if (selectedGroup) handleArchiveToggle(selectedGroup); }}
      />
      <DeleteConfirmDialog
        title={tAdmin("people.deleteGroupTitle")}
        description={tAdmin("people.deleteGroupDescription", { name: deleteGroup?.name ?? "" })}
        open={deleteDialogOpen}
        onOpenChange={(o) => { if (!o && !isDeleting) { setDeleteDialogOpen(false); setDeleteGroup(null); } }}
        onConfirm={handleDelete}
        isDeleting={isDeleting}
      />
      <EditGroupDialog key={editGroup?.id ?? "edit-group-empty"} group={editGroup} open={editDialogOpen} onOpenChange={(o) => { if (!o && !isUpdating) { setEditDialogOpen(false); setEditGroup(null); } }} onConfirm={handleEdit} isUpdating={isUpdating} />
      <CreateGroupSheet
        open={createGroupOpen}
        onOpenChange={setCreateGroupOpen}
        onCreated={() => table.refineCore.tableQuery.refetch()}
        createdBy={identity?.id ?? ""}
      />
    </>
  );
}

// ═══════════════════════════════════════════════════════════════════
// ─── FRIENDSHIPS TAB ────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════

function FriendshipsTab() {
  const { tAdmin } = useAdminTranslation();
  const { tap, warning } = useHaptics();
  const { data: identity } = useGetIdentity<Profile>();
  const deleteMutation = useInstantDelete();

  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300);
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const [deleteFriendship, setDeleteFriendship] = useState<FriendshipRow | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [createFriendshipOpen, setCreateFriendshipOpen] = useState(false);
  const [editFriendship, setEditFriendship] = useState<FriendshipRow | null>(null);

  const filters = useMemo<CrudFilters>(() => {
    const f: CrudFilters = [];
    if (statusFilter !== "all") f.push({ field: "status", operator: "eq", value: statusFilter });
    return f;
  }, [statusFilter]);

  const columns = useMemo<ColumnDef<FriendshipRow>[]>(() => [
    {
      id: "user_a", header: tAdmin("people.userA"), accessorKey: "user_a_name", size: 200, enableSorting: false,
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <Avatar className="h-7 w-7">
            <AvatarImage src={row.original.user_a_avatar ?? undefined} alt={row.original.user_a_name} />
            <AvatarFallback className="text-xs">{row.original.user_a_name?.[0]?.toUpperCase() ?? "?"}</AvatarFallback>
          </Avatar>
          <span className="text-sm">{row.original.user_a_name}</span>
        </div>
      ),
    },
    {
      id: "user_b", header: tAdmin("people.userB"), accessorKey: "user_b_name", size: 200, enableSorting: false,
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <Avatar className="h-7 w-7">
            <AvatarImage src={row.original.user_b_avatar ?? undefined} alt={row.original.user_b_name} />
            <AvatarFallback className="text-xs">{row.original.user_b_name?.[0]?.toUpperCase() ?? "?"}</AvatarFallback>
          </Avatar>
          <span className="text-sm">{row.original.user_b_name}</span>
        </div>
      ),
    },
    {
      id: "status", header: tAdmin("common.status"), accessorKey: "status", size: 140,
      cell: ({ getValue }) => <FriendshipStatusBadge status={getValue() as keyof typeof FRIENDSHIP_STATUS} />,
    },
    {
      id: "created_at", header: tAdmin("common.createdAt"), accessorKey: "created_at", size: 120,
      cell: ({ getValue }) => formatDate(getValue() as string),
    },
    {
      id: "actions", header: "", size: 50, enableSorting: false,
      cell: ({ row }) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontalIcon className="h-4 w-4" /></Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {row.original.status === "pending" && (
              <DropdownMenuItem onClick={() => { tap(); handleAccept(row.original); }}>{tAdmin("people.acceptFriendship")}</DropdownMenuItem>
            )}
            <DropdownMenuItem onClick={() => { tap(); setEditFriendship(row.original); }}>
              <PencilIcon className="mr-2 h-4 w-4" />
              {tAdmin("common.edit")}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => { warning(); setDeleteFriendship(row.original); setDeleteDialogOpen(true); }} className="text-destructive">{tAdmin("people.deleteFriendship")}</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ], [tAdmin, tap, warning]);

  const table = useTable<FriendshipRow>({
    columns,
    refineCoreProps: {
      resource: "friendships",
      meta: { select: "*, user_a_profile:profiles!friendships_user_a_fkey(full_name, avatar_url), user_b_profile:profiles!friendships_user_b_fkey(full_name, avatar_url)" },
      pagination: { pageSize: 10 },
      filters: { permanent: filters },
      sorters: { initial: [{ field: "created_at", order: "desc" }] },
      queryOptions: {
        select: (data) => {
          const searchTerm = debouncedSearch.trim().toLowerCase();
          const transformed = (data.data as unknown as FriendshipListRecord[]).map((f) => {
            const userA = relationOne(f.user_a_profile);
            const userB = relationOne(f.user_b_profile);
            return {
              id: f.id,
              user_a_id: f.user_a,
              user_a_name: userA?.full_name ?? tAdmin("common.unknown"),
              user_a_avatar: userA?.avatar_url ?? null,
              user_b_id: f.user_b,
              user_b_name: userB?.full_name ?? tAdmin("common.unknown"),
              user_b_avatar: userB?.avatar_url ?? null,
              status: f.status,
              created_at: f.created_at,
            };
          });
          const filtered = searchTerm
            ? transformed.filter((friendship) => (
                friendship.id.toLowerCase().includes(searchTerm) ||
                friendship.user_a_name.toLowerCase().includes(searchTerm) ||
                friendship.user_b_name.toLowerCase().includes(searchTerm)
              ))
            : transformed;
          return { ...data, data: filtered, total: searchTerm ? filtered.length : data.total };
        },
      },
    },
  });

  const handleDelete = useCallback(() => {
    if (!deleteFriendship) return;
    setIsDeleting(true);
    deleteMutation.mutate(
      { resource: "friendships", id: deleteFriendship.id },
      {
        onSuccess: () => { toast.success(tAdmin("people.success.friendshipDeleted", { userA: deleteFriendship.user_a_name, userB: deleteFriendship.user_b_name })); setDeleteDialogOpen(false); setDeleteFriendship(null); setIsDeleting(false); table.refineCore.tableQuery.refetch(); },
        onError: (error) => { toast.error(tAdmin("common.errorWithMessage", { message: error.message })); setIsDeleting(false); },
      },
    );
  }, [deleteFriendship, deleteMutation, table.refineCore.tableQuery, tAdmin]);

  const handleAccept = useCallback(async (friendship: FriendshipRow) => {
    try {
      const { error } = await supabaseClient.rpc("admin_accept_friendship", { p_friendship_id: friendship.id });
      if (error) throw error;
      toast.success(tAdmin("people.success.friendshipAccepted", { userA: friendship.user_a_name, userB: friendship.user_b_name }));
      table.refineCore.tableQuery.refetch();
    } catch (err: unknown) {
      toast.error(tAdmin("common.errorWithMessage", { message: getErrorMessage(err, tAdmin("people.errors.acceptFriendshipFailed")) }));
    }
  }, [table.refineCore.tableQuery, tAdmin]);

  const clearFilters = useCallback(() => { setSearch(""); setStatusFilter("all"); }, []);
  const hasActiveFilters = search !== "" || statusFilter !== "all";
  const isEmptyResult = !table.refineCore.tableQuery.isLoading && table.reactTable.getRowModel().rows.length === 0;
  const visibleFriendships = table.reactTable.getRowModel().rows.map((row) => row.original);

  return (
    <>


      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <div>
            <CardTitle>{tAdmin("people.friendshipsCardTitle")}</CardTitle>
            <CardDescription>{tAdmin("people.friendshipsCardDescription")}</CardDescription>
          </div>
          <Button size="sm" onClick={() => { tap(); setCreateFriendshipOpen(true); }}>
            <PlusIcon className="mr-2 h-4 w-4" />
            {tAdmin("people.createFriendshipSubmit")}
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          <AdminPageToolbar
            search={search}
            onSearchChange={setSearch}
            searchPlaceholder={tAdmin("people.friendshipSearchPlaceholder")}
            filterCount={statusFilter !== "all" ? 1 : 0}
          />
          <AdminFilterChips
            filters={[
              ...(statusFilter !== "all"
                ? [{ key: "status", label: tAdmin("people.statusFilter", { status: tAdmin(`status.${statusFilter}`) }), onRemove: () => { tap(); setStatusFilter("all"); } }]
                : []),
            ]}
            onClearAll={() => { tap(); clearFilters(); }}
          />
          {table.refineCore.tableQuery.isLoading ? (
            <AdminTableSkeleton rows={7} columns={5} />
          ) : isEmptyResult && hasActiveFilters ? (
            <AdminEmptyState
              icon={<HeartHandshakeIcon className="h-8 w-8" />}
              title={tAdmin("people.noFriendshipsTitle")}
              description={tAdmin("people.noFriendshipsDescription")}
              action={{ label: tAdmin("common.clearFilters"), onClick: clearFilters }}
            />
          ) : (
            <>
              <div className="hidden md:block">
                <DataTable table={table} />
              </div>
              <div className="space-y-3 md:hidden">
                <AdminMobileCards
                  items={visibleFriendships}
                  getKey={(friendship) => friendship.id}
                  renderItem={(friendship) => (
                    <AdminMobileCard
                      title={`${friendship.user_a_name} - ${friendship.user_b_name}`}
                      description={<span className="font-mono text-xs">{friendship.id.slice(0, 8)}</span>}
                      leading={<HeartHandshakeIcon className="mt-1 h-5 w-5 text-primary" />}
                      badges={<FriendshipStatusBadge status={friendship.status} />}
                      meta={[
                        { label: tAdmin("people.userA"), value: friendship.user_a_name },
                        { label: tAdmin("people.userB"), value: friendship.user_b_name },
                        { label: tAdmin("common.status"), value: tAdmin(`status.${friendship.status}`) },
                        { label: tAdmin("common.createdAt"), value: formatDate(friendship.created_at) },
                      ]}
                      actions={
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-9 w-9 cursor-pointer">
                              <MoreHorizontalIcon className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {friendship.status === "pending" && (
                              <DropdownMenuItem onClick={() => { tap(); handleAccept(friendship); }}>{tAdmin("people.acceptFriendship")}</DropdownMenuItem>
                            )}
                            <DropdownMenuItem onClick={() => { tap(); setEditFriendship(friendship); }}>
                              <PencilIcon className="mr-2 h-4 w-4" />
                              {tAdmin("common.edit")}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => { warning(); setDeleteFriendship(friendship); setDeleteDialogOpen(true); }} className="text-destructive">{tAdmin("people.deleteFriendship")}</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      }
                    />
                  )}
                />
                {visibleFriendships.length > 0 && (
                  <AdminMobilePagination
                    summary={tAdmin("common.pageCount", { page: table.refineCore.currentPage, total: table.refineCore.pageCount })}
                    previousLabel={tAdmin("common.previous")}
                    nextLabel={tAdmin("common.next")}
                    canPrevious={table.refineCore.currentPage > 1}
                    canNext={table.refineCore.currentPage < table.refineCore.pageCount}
                    onPrevious={() => table.refineCore.setCurrentPage(table.refineCore.currentPage - 1)}
                    onNext={() => table.refineCore.setCurrentPage(table.refineCore.currentPage + 1)}
                  />
                )}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <DeleteConfirmDialog
        title={tAdmin("people.deleteFriendshipTitle")}
        description={tAdmin("people.deleteFriendshipDescription", { userA: deleteFriendship?.user_a_name ?? "", userB: deleteFriendship?.user_b_name ?? "" })}
        open={deleteDialogOpen}
        onOpenChange={(o) => { if (!o && !isDeleting) { setDeleteDialogOpen(false); setDeleteFriendship(null); } }}
        onConfirm={handleDelete}
        isDeleting={isDeleting}
      />
      <CreateFriendshipSheet
        open={createFriendshipOpen}
        onOpenChange={setCreateFriendshipOpen}
        onCreated={() => table.refineCore.tableQuery.refetch()}
        createdBy={identity?.id ?? ""}
      />
      <EditFriendshipSheet
        key={editFriendship?.id ?? "edit-friendship-empty"}
        friendship={editFriendship}
        open={!!editFriendship}
        onOpenChange={(v) => { if (!v) setEditFriendship(null); }}
        onUpdated={() => table.refineCore.tableQuery.refetch()}
      />
    </>
  );
}

function InviteFriendsTab() {
  const { data: identity } = useGetIdentity<Profile>();

  return <InviteUsersCard inviterName={identity?.full_name || identity?.email} />;
}

// ═══════════════════════════════════════════════════════════════════
// ─── MAIN COMPONENT ─────────────────────────────────────────────────
// ═══════════════════════════════════════════════════════════════════

export function AdminPeople() {
  const { tap } = useHaptics();
  const { tAdmin } = useAdminTranslation();
  const { isModerator } = useAdminAccess();
  const isMobile = useIsMobile();
  const [activeTab, setActiveTab] = useState<"users" | "groups" | "friendships" | "invite">("users");

  if (isModerator) {
    return <ModeratorPeople />;
  }

  const handleTabChange = (value: string) => {
    tap();
    setActiveTab(value as typeof activeTab);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{tAdmin("people.title")}</h1>
        <p className="text-sm text-muted-foreground mt-1">{tAdmin("people.subtitle")}</p>
      </div>
      <Tabs value={activeTab} onValueChange={handleTabChange}>
        {isMobile ? (
          <Select value={activeTab} onValueChange={handleTabChange}>
            <SelectTrigger className="mb-4">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="users">{tAdmin("people.usersTab")}</SelectItem>
              <SelectItem value="groups">{tAdmin("people.groupsTab")}</SelectItem>
              <SelectItem value="friendships">{tAdmin("people.friendshipsTab")}</SelectItem>
              <SelectItem value="invite">{tAdmin("people.inviteTab")}</SelectItem>
            </SelectContent>
          </Select>
        ) : (
          <TabsList>
            <TabsTrigger value="users" className="gap-2">
              <UsersIcon className="h-4 w-4" />
              {tAdmin("people.usersTab")}
            </TabsTrigger>
            <TabsTrigger value="groups" className="gap-2">
              <GroupIcon className="h-4 w-4" />
              {tAdmin("people.groupsTab")}
            </TabsTrigger>
            <TabsTrigger value="friendships" className="gap-2">
              <HeartHandshakeIcon className="h-4 w-4" />
              {tAdmin("people.friendshipsTab")}
            </TabsTrigger>
            <TabsTrigger value="invite" className="gap-2">
              <MailIcon className="h-4 w-4" />
              {tAdmin("people.inviteTab")}
            </TabsTrigger>
          </TabsList>
        )}
        <TabsContent value="users" className="mt-4">
          <UsersTab />
        </TabsContent>
        <TabsContent value="groups" className="mt-4">
          <GroupsTab />
        </TabsContent>
        <TabsContent value="friendships" className="mt-4">
          <FriendshipsTab />
        </TabsContent>
        <TabsContent value="invite" className="mt-4">
          <InviteFriendsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
